# Paano Makita ang Database

## Option 1: Web Viewer (Recommended)

1. **Start the backend server:**
   ```bash
   cd backend-sqlite
   npm start
   ```

2. **Open your web browser:**
   - Local: `http://localhost:8080`
   - Network: `http://192.168.56.1:8080`

3. **Makikita mo:**
   - Users table
   - Attendance records
   - Scan history
   - Real-time statistics
   - Auto-refresh every 5 seconds

## Option 2: SQLite Browser (Desktop App)

1. **Download DB Browser for SQLite:**
   - Windows/Mac/Linux: https://sqlitebrowser.org/

2. **Open the database file:**
   - File location: `backend-sqlite/attendance.db`
   - Open with DB Browser for SQLite

3. **Browse tables:**
   - Users
   - Attendance
   - Scan_history

## Option 3: Command Line

```bash
# Install sqlite3 (if not installed)
# Windows: Download from sqlite.org
# Mac: brew install sqlite3
# Linux: sudo apt-get install sqlite3

# Open database
cd backend-sqlite
sqlite3 attendance.db

# View tables
.tables

# View users
SELECT * FROM users;

# View attendance
SELECT * FROM attendance;

# View scan history
SELECT * FROM scan_history;

# Exit
.quit
```

## Quick Test

Para ma-test kung gumagana:

1. Start server: `npm start`
2. Open browser: `http://localhost:8080`
3. Dapat makita mo ang web interface
4. Register user sa mobile app
5. Refresh browser - dapat may bagong user

