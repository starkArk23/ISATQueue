import logging
import threading
from typing import Optional

import requests

from isatqueue_config import ISATQueueConfig
from isatqueue_types import ScanCallback, ScanResult


class NFCPoller:
    """Reads NFC card UIDs and sends them to the ISATQueue backend."""

    def __init__(self, config: ISATQueueConfig, on_scan: Optional[ScanCallback] = None) -> None:
        self.config = config
        self.on_scan = on_scan
        self._stop_event = threading.Event()
        self._logger = logging.getLogger(self.__class__.__name__)

    def stop(self) -> None:
        """Stops the NFC polling loop."""
        self._stop_event.set()

    def start(self) -> None:
        """Starts the NFC polling loop and waits for card taps."""
        try:
            # Import here so tests can run without an actual NFC reader or nfcpy installed.
            import nfc  # type: ignore
        except ImportError as exc:
            raise RuntimeError("nfcpy is not installed. Run 'pip install -r requirements.txt'.") from exc

        try:
            clf = nfc.ContactlessFrontend(self.config.reader_name)
        except Exception as exc:
            raise RuntimeError("NFC reader not found. Check USB connection.") from exc

        self._logger.info("Waiting for NFC card taps...")
        print("Waiting for NFC card taps... (Ctrl+C to stop)")

        while not self._stop_event.is_set():
            try:
                clf.connect(rdwr={"on-connect": self._on_connect})
            except Exception as exc:
                self._handle_error(f"Reader error: {exc}")
                break

        clf.close()

    def _on_connect(self, tag) -> bool:
        """Callback for nfcpy when a tag is detected."""
        try:
            uid = self._extract_uid(tag)
            response_text = self._send_uid(uid)
            print(response_text)
            self._notify(ScanResult(uid=uid, response_text=response_text))
        except Exception as exc:
            self._handle_error(str(exc), uid="unknown")
        # Return True to disconnect and allow another scan.
        return True

    def _extract_uid(self, tag) -> str:
        """Pulls the UID from the tag and returns it as a hex string."""
        if not hasattr(tag, "identifier") or tag.identifier is None:
            raise ValueError("Invalid card: UID not found.")

        # UID is bytes; convert to a readable hex string (no spaces).
        uid_bytes = bytes(tag.identifier)
        if not uid_bytes:
            raise ValueError("Invalid card: UID is empty.")

        return uid_bytes.hex().upper()

    def _send_uid(self, uid: str) -> str:
        """Sends the UID to the backend and returns the response text."""
        payload = {"uid": uid}
        try:
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
        """Central place to handle errors for future logging/UI integration."""
        print(f"Error: {message}")
        self._notify(ScanResult(uid=uid, error_message=message))
        self._logger.error(message)

    def _notify(self, result: ScanResult) -> None:
        """Notifies a callback if provided (useful for UI or logging later)."""
        if self.on_scan is not None:
            self.on_scan(result)
