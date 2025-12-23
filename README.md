# Backend SQLite Server

Backend server para sa attendance system na gumagamit ng SQLite database.

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the server:**
   ```bash
   node index.js
   ```

   O kaya:
   ```bash
   npm start
   ```

3. **Server will run on:**
   - Default port: `8080`
   - URL: `http://localhost:8080`
   - Para sa network access: `http://YOUR_IP_ADDRESS:8080`

## API Endpoints

### Health Check
- **GET** `/api/health`
- Returns server status

### QR Code Scan (from ESP32-CAM)
- **POST** `/api/scan`
- Body: `{ "qrCode": "user@email.com_IN_12345678901" }`
- Processes QR code scan and saves to database
- Returns scan result with status (present/absent/invalid)

### User Management
- **POST** `/api/users` - Create or update user
  - Body: User data (email, name, lrn, etc.)
  
- **GET** `/api/users/:email` - Get user by email

### History & Attendance
- **GET** `/api/history/:email` - Get scan history for user
- **GET** `/api/attendance/:email` - Get attendance records for user

### Data Sync
- **POST** `/api/sync` - Sync data from mobile app
  - Body: `{ "users": [], "scanHistory": [], "attendance": [] }`

## Database

The server automatically creates SQLite database file `attendance.db` in the same directory with the following tables:

- `users` - User information
- `attendance` - Attendance records
- `scan_history` - All QR scan activities

## Configuration

Update the port in `index.js`:
```javascript
const PORT = process.env.PORT || 8080;
```

Or set environment variable:
```bash
PORT=3000 node index.js
```

## Network Access

Para ma-access ng ESP32-CAM at mobile app:

1. **Find your computer's IP address:**
   - Windows: `ipconfig`
   - Mac/Linux: `ifconfig` or `ip addr`

2. **Update Flutter app API URL:**
   - Open `lib/services/api_service.dart`
   - Change `baseUrl` to your IP: `http://YOUR_IP:8080`

3. **Make sure firewall allows connections on port 8080**

## Testing

Test the API using curl or Postman:

```bash
# Health check
curl http://localhost:8080/api/health

# Scan QR code
curl -X POST http://localhost:8080/api/scan \
  -H "Content-Type: application/json" \
  -d '{"qrCode":"user@email.com_IN_12345678901"}'
```

## Notes

- Database file (`attendance.db`) ay automatic na mag-create sa first run
- Server listens on `0.0.0.0` para ma-access from network
- CORS enabled para sa cross-origin requests
- Graceful shutdown supported (Ctrl+C)

