import sys

from isatqueue_config import ISATQueueConfig
from isatqueue_nfc import NFCPoller


def main() -> int:
    config = ISATQueueConfig()
    poller = NFCPoller(config=config)

    try:
        poller.start()
    except KeyboardInterrupt:
        print("Stopped by user.")
        return 0
    except Exception as exc:
        print(f"Fatal error: {exc}")
        return 1

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
