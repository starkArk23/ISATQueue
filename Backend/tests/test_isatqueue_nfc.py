import os
import sys
from unittest.mock import Mock

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

import requests

from isatqueue_config import ISATQueueConfig
from isatqueue_nfc import NFCPoller


class DummyTag:
    def __init__(self, identifier):
        self.identifier = identifier


def test_extract_uid_success():
    poller = NFCPoller(ISATQueueConfig())
    tag = DummyTag(b"\x01\x02\xAB\xCD")
    assert poller._extract_uid(tag) == "0102ABCD"


def test_extract_uid_missing_identifier():
    poller = NFCPoller(ISATQueueConfig())
    tag = DummyTag(None)
    try:
        poller._extract_uid(tag)
        assert False, "Expected ValueError"
    except ValueError as exc:
        assert "UID" in str(exc)


def test_send_uid_success(monkeypatch):
    poller = NFCPoller(ISATQueueConfig(api_url="http://example.com"))

    mock_response = Mock()
    mock_response.text = "OK"
    mock_response.raise_for_status = Mock()

    def fake_post(*args, **kwargs):
        return mock_response

    monkeypatch.setattr(requests, "post", fake_post)

    assert poller._send_uid("ABC") == "OK"


def test_send_uid_network_error(monkeypatch):
    poller = NFCPoller(ISATQueueConfig(api_url="http://example.com"))

    def fake_post(*args, **kwargs):
        raise requests.RequestException("Boom")

    monkeypatch.setattr(requests, "post", fake_post)

    try:
        poller._send_uid("ABC")
        assert False, "Expected RuntimeError"
    except RuntimeError as exc:
        assert "Network error" in str(exc)
