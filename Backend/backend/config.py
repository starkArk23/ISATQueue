import os
from dataclasses import dataclass


@dataclass
class DBConfig:
    """MySQL connection settings (override with environment variables)."""

    host: str = os.getenv("ISATQUEUE_DB_HOST", "localhost")
    port: int = int(os.getenv("ISATQUEUE_DB_PORT", "3306"))
    user: str = os.getenv("ISATQUEUE_DB_USER", "root")
    password: str = os.getenv("ISATQUEUE_DB_PASSWORD", "kill_this.love233")
    database: str = os.getenv("ISATQUEUE_DB_NAME", "ISATQueue")

    def __post_init__(self) -> None:
        if self.database.lower() == "isatqueue":
            self.database = "ISATQueue"
