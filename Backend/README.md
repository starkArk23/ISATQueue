# ISATQueue

Beginner-friendly university queue system with two parts:
- NFC reader module (nfcpy + mock mode)
- Flask backend with MySQL

## Folder structure
```
ISATQueue/
├── python_nfc/      (NFC + mock code)
├── backend/         (Flask API)
└── README.md
```

## NFC reader module
**Location:** `python_nfc/`

### Install
```powershell
pip install -r python_nfc/requirements.txt
```

### Run (real reader)
```powershell
python python_nfc/main.py
```

### Run (mock mode)
```powershell
python python_nfc/main.py --mock
```

## Backend API (Flask + MySQL)
**Location:** `backend/`

### Install
```powershell
pip install -r backend/requirements.txt
```

### Configure database
Set these environment variables (or use defaults):
- `ISATQUEUE_DB_HOST`
- `ISATQUEUE_DB_PORT`
- `ISATQUEUE_DB_USER`
- `ISATQUEUE_DB_PASSWORD`
- `ISATQUEUE_DB_NAME`

If the database does not exist yet, create it:
```sql
CREATE DATABASE isatqueue;
```

### Run
```powershell
python backend/app.py
```

### API
`POST http://localhost:5000/api/scan`

Payload:
```json
{ "uid": "<card UID>" }
```

Response:
```json
{ "queue_number": 12 }
```

## Database schema
**Location:** `backend/sql/schema.sql`

The table is created automatically by the backend on startup if it does not exist.

## Notes
- The NFC module prints backend responses and handles reader/network errors gracefully.
- Mock mode is available for testing without NFC hardware.
- The project is structured for future expansion (logging, UI integration, etc.).
