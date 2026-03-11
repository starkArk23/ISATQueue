from typing import Tuple

import mysql.connector
from mysql.connector import Error

from config import DBConfig


def get_connection() -> mysql.connector.MySQLConnection:
    """Creates a new MySQL connection."""
    # Read connection settings from environment or defaults.
    config = DBConfig()
    return mysql.connector.connect(
        host=config.host,
        port=config.port,
        user=config.user,
        password=config.password,
        database=config.database,
    )


def ensure_schema(conn: mysql.connector.MySQLConnection) -> None:
    """Creates the queue table if it does not exist."""
    cursor = conn.cursor()
    # This table stores each student's UID and their assigned queue number.
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS queue (
            id INT AUTO_INCREMENT PRIMARY KEY,
            student_uid VARCHAR(255) NOT NULL UNIQUE,
            queue_number INT NOT NULL,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """
    )
    conn.commit()


def get_or_create_queue_number(conn: mysql.connector.MySQLConnection, uid: str) -> Tuple[int, bool]:
    """Returns existing queue number or assigns a new one."""
    cursor = conn.cursor()
    try:
        # Use a transaction so two scans don't get the same number.
        conn.start_transaction()

        cursor.execute("SELECT queue_number FROM queue WHERE student_uid = %s", (uid,))
        row = cursor.fetchone()
        if row:
            conn.commit()
            return int(row[0]), False

        # Lock the table while we compute the next number.
        cursor.execute("SELECT COALESCE(MAX(queue_number), 0) FROM queue FOR UPDATE")
        max_number = int(cursor.fetchone()[0])
        next_number = max_number + 1

        cursor.execute(
            "INSERT INTO queue (student_uid, queue_number) VALUES (%s, %s)",
            (uid, next_number),
        )
        conn.commit()
        return next_number, True
    except Error:
        # Roll back on error so partial writes are not saved.
        conn.rollback()
        raise
    finally:
        cursor.close()
