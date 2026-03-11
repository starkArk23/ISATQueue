import argparse

from config import NFCConfig
from nfc_reader import NFCPoller


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="ISATQueue NFC scanner")
    parser.add_argument("--mock", action="store_true", help="Use mock mode (type UIDs manually)")
    parser.add_argument("--api", default=None, help="Override backend API URL")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    config = NFCConfig(mock_mode=args.mock)

    if args.api:
        config.api_url = args.api

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
