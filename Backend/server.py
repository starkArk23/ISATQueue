import os
import sys
from typing import Optional

from flask import Flask, jsonify, request, send_from_directory
import mysql.connector

# Allow importing from the Python-NFC folder without installing a package.
PYTHON_NFC_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "Python-NFC", "python_nfc"))
if PYTHON_NFC_DIR not in sys.path:
    sys.path.insert(0, PYTHON_NFC_DIR)

from config import NFCConfig  # type: ignore
from nfc_reader import NFCPoller  # type: ignore

from backend import db as queue_db
from backend.config import DBConfig

BASE_DIR = os.path.dirname(__file__)
FRONTEND_DIR = os.path.abspath(os.path.join(BASE_DIR, "..", "Frontend"))

app = Flask(__name__, static_folder=None)

# The server is necessary because it:
# - Receives requests from the frontend
# - Talks to the database
# - Sends responses back so the UI can update dynamically


def get_db_connection() -> mysql.connector.MySQLConnection:
    """Creates a MySQL connection using environment overrides or defaults."""
    config = DBConfig()
    return mysql.connector.connect(
        host=config.host,
        port=config.port,
        user=config.user,
        password=config.password,
        database=config.database,
    )


def format_queue_number(queue_number: int) -> str:
    return f"A-{queue_number:03d}"


def handle_queue_for_uid(uid: str) -> int:
    """Insert or fetch a queue number for a UID."""
    conn = get_db_connection()
    try:
        queue_db.ensure_schema(conn)
        queue_number, _ = queue_db.get_or_create_queue_number(conn, uid)
        return queue_number
    finally:
        conn.close()


# Use the Python-NFC classes to keep the backend wired for real reader integration.
# We trigger its callback path when /tap-nfc is hit (simulation for now).
last_tap_uid: Optional[str] = None


def on_nfc_scan(uid: str, response_text: Optional[str], error_message: Optional[str]) -> None:
    """Callback path used by the NFC poller; stores the last UID."""
    global last_tap_uid
    if error_message:
        return
    last_tap_uid = uid


nfc_poller = NFCPoller(config=NFCConfig(mock_mode=True), on_scan=on_nfc_scan)


@app.route("/")
def index() -> str:
    return send_from_directory(FRONTEND_DIR, "index.html")


@app.route("/<path:filename>")
def frontend_files(filename: str):
    return send_from_directory(FRONTEND_DIR, filename)


@app.route("/tap-nfc", methods=["POST"])
def tap_nfc():
    data = request.get_json(silent=True) or {}
    uid = data.get("uid") or data.get("student_id")

    # Simulated tap if none supplied by the frontend.
    if not uid:
        uid = "MOCK-UID-001"

    # Trigger the NFC callback path for consistency with real reader flow.
    nfc_poller._notify(uid=uid, response_text=None, error_message=None)

    try:
        queue_number = handle_queue_for_uid(uid)
    except Exception as exc:
        return jsonify({"error": f"Database error: {exc}"}), 500
    return jsonify(
        {
            "uid": uid,
            "queue_number": queue_number,
            "queue_label": format_queue_number(queue_number),
        }
    )


@app.route("/queue", methods=["GET"])
def get_queue():
    try:
        conn = get_db_connection()
        try:
            queue_db.ensure_schema(conn)
            cursor = conn.cursor()
            cursor.execute("SELECT COALESCE(MAX(queue_number), 0) FROM queue")
            max_number = int(cursor.fetchone()[0])
        finally:
            conn.close()
    except Exception as exc:
        return jsonify({"error": f"Database error: {exc}"}), 500

    return jsonify(
        {
            "current_queue_number": max_number,
            "current_queue_label": format_queue_number(max_number) if max_number else "A-000",
        }
    )


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
