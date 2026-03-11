from dataclasses import dataclass
from typing import Callable, Optional


@dataclass
class ScanResult:
    uid: str
    response_text: Optional[str] = None
    error_message: Optional[str] = None


# Callback signature for future UI/logging integration.
ScanCallback = Callable[[ScanResult], None]
