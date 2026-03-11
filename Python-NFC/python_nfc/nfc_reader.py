import logging
import threading
from typing import Callable, Optional

import requests

from config import NFCConfig


# Callback signature for future UI or logging integration.
ScanCallback = Callable[[str, Optional[str], Optional[str]], None]


class NFCPoller:
    """Reads NFC card UIDs (or mock UIDs) and sends them to the backend API."""

    def __init__(self, config: NFCConfig, on_scan: Optional[ScanCallback] = None) -> None:
        # Store config and optional callback for future extensions.
        self.config = config
        self.on_scan = on_scan
        # Event lets us stop the loop cleanly (useful for future UI integration).
        self._stop_event = threading.Event()
        self._logger = logging.getLogger(self.__class__.__name__)

    def stop(self) -> None:
        """Stops the NFC polling loop."""
        self._stop_event.set()

    def start(self) -> None:
        """Starts the NFC polling loop and waits for card taps or mock input."""
        # If mock mode is enabled, skip the real reader and ask for typed UIDs.
        if self.config.mock_mode:
            self._run_mock_loop()
            return

        try:
            # Import here so mock mode can run without nfcpy installed.
            import nfc  # type: ignore
        except ImportError as exc:
            raise RuntimeError("nfcpy is not installed. Run 'pip install -r requirements.txt'.") from exc

        try:
            # Connect to the USB NFC reader. "usb" auto-detects common devices.
            clf = nfc.ContactlessFrontend(self.config.reader_name)
        except Exception as exc:
            raise RuntimeError("NFC reader not found. Check the USB connection.") from exc

        self._logger.info("Waiting for NFC card taps...")
        print("Waiting for NFC card taps... (Ctrl+C to stop)")

        while not self._stop_event.is_set():
            try:
                # nfcpy calls _on_connect whenever a card is tapped.
                clf.connect(rdwr={"on-connect": self._on_connect})
            except Exception as exc:
                self._handle_error(f"Reader error: {exc}")
                break

        # Cleanly close the reader when stopping.
        clf.close()

    def _run_mock_loop(self) -> None:
        """Mock loop for testing without a real NFC reader."""
        print("Mock mode enabled. Type a UID and press Enter.")
        print("Type 'exit' or press Enter on a blank line to quit.")

        while not self._stop_event.is_set():
            uid = input("Mock UID: ").strip()
            if uid == "" or uid.lower() in {"exit", "quit"}:
                break

            # Reuse the same processing logic as real scans.
            self._process_uid(uid)

    def _on_connect(self, tag) -> bool:
        """Callback from nfcpy when a tag is detected."""
        try:
            uid = self._extract_uid(tag)
            self._process_uid(uid)
        except Exception as exc:
            self._handle_error(str(exc))
        # Return True to disconnect and allow another scan.
        return True

    def _extract_uid(self, tag) -> str:
        """Extracts the UID from the tag as a hex string."""
        if not hasattr(tag, "identifier") or tag.identifier is None:
            raise ValueError("Invalid card: UID not found.")

        # UID is bytes; convert to a readable hex string (no spaces).
        uid_bytes = bytes(tag.identifier)
        if not uid_bytes:
            raise ValueError("Invalid card: UID is empty.")

        return uid_bytes.hex().upper()

    def _process_uid(self, uid: str) -> None:
        """Sends UID to the backend and prints the response."""
        try:
            response_text = self._send_uid(uid)
            print(response_text)
            self._notify(uid=uid, response_text=response_text, error_message=None)
        except Exception as exc:
            self._handle_error(str(exc), uid=uid)

    def _send_uid(self, uid: str) -> str:
        """Sends the UID to the backend and returns response text."""
        payload = {"uid": uid}
        try:
            # POST the UID to the backend API as JSON.
            response = requests.post(
                self.config.api_url,
                json=payload,
                timeout=self.config.request_timeout_seconds,
            )
            response.raise_for_status()
            return response.text
        except requests.RequestException as exc:
            raise RuntimeError(f"Network error: {exc}") from exc

    def _handle_error(self, message: str, uid: str = "unknown") -> None:
        """Central place for error handling for future logging/UI integration."""
        print(f"Error: {message}")
        self._notify(uid=uid, response_text=None, error_message=message)
        self._logger.error(message)

    def _notify(self, uid: str, response_text: Optional[str], error_message: Optional[str]) -> None:
        """Notifies a callback if provided (useful for UI or logging later)."""
        if self.on_scan is not None:
            self.on_scan(uid, response_text, error_message)
