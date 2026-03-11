from dataclasses import dataclass


@dataclass
class NFCConfig:
    """Configuration for NFC scanning and API calls."""

    # Backend endpoint that accepts UID scans.
    api_url: str = "http://localhost:5000/api/scan"  # The URL of the server that will process the NFC scans.
    # HTTP timeout in seconds for the API call.
    request_timeout_seconds: float = 5.0  # How long to wait for the server to respond before giving up.
    # NFC reader name. "usb" lets nfcpy auto-detect a USB reader.
    reader_name: str = "usb"  # The name of the NFC reader; 'usb' means it will automatically find the USB device.
    # Mock mode uses typed UIDs when a reader is not available.
    mock_mode: bool = False  # If True, the system will use predefined UID values instead of scanning real ones.
