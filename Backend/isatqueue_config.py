from dataclasses import dataclass


@dataclass
class ISATQueueConfig:
    # Backend URL to receive scan events.
    api_url: str = "http://localhost/isatqueue/api/scan"
    # HTTP timeout in seconds for the API call.
    request_timeout_seconds: float = 5.0
    # NFC reader name. "usb" lets nfcpy auto-detect a USB reader.
    reader_name: str = "usb"
