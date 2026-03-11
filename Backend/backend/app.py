from flask import Flask, jsonify, request

from db import ensure_schema, get_connection, get_or_create_queue_number


def create_app() -> Flask:
    # Create the Flask application instance.
    app = Flask(__name__)

    @app.route("/api/scan", methods=["POST"])
    def scan():
        """Accepts a UID and returns a queue number."""
        # Read JSON safely; if invalid JSON is sent, default to {}.
        data = request.get_json(silent=True) or {}
        uid = data.get("uid")

        if not uid or not isinstance(uid, str):
            return jsonify({"error": "Missing or invalid UID"}), 400

        # Connect to the database.
        try:
            conn = get_connection()
        except Exception as exc:
            return jsonify({"error": f"Database connection failed: {exc}"}), 500

        try:
            # Ensure the table exists and get the queue number.
            ensure_schema(conn)
            queue_number, _ = get_or_create_queue_number(conn, uid)
            return jsonify({"queue_number": queue_number})
        except Exception as exc:
            return jsonify({"error": f"Database error: {exc}"}), 500
        finally:
            conn.close()

    return app


if __name__ == "__main__":
    app = create_app()
    # Debug mode is convenient for local development.
    app.run(host="0.0.0.0", port=5000, debug=True)
