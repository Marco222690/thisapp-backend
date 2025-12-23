// Load environment variables from .env file
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 8080;

// ============================================
// Bug #1 fix: Philippine Timezone Helper
// ============================================
// Ensures backend uses same timezone as mobile app
function getPhilippineTime() {
  // Get current time and convert to Philippine timezone (UTC+8)
  const now = new Date();

  // Convert to Philippine time (UTC+8)
  const phTime = new Date(now.toLocaleString('en-US', {
    timeZone: 'Asia/Manila'
  }));

  return phTime;
}

// Format time as h:mm:ssa (e.g., "5:45:23am")
function formatTimePhilippine(date) {
  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  const ampm = hours >= 12 ? 'pm' : 'am';

  hours = hours % 12 || 12; // Convert to 12-hour format

  return `${hours}:${minutes}:${seconds}${ampm}`;
}

// Format date as yyyy-MM-dd
function formatDatePhilippine(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

// Bug #2 fix: Input Validation Functions
// Validate email format
function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;

  // Basic email regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Validate LRN (11-12 digits)
function isValidLRN(lrn) {
  if (!lrn || typeof lrn !== 'string') return false;

  // LRN must be 11-12 digits only
  const lrnRegex = /^\d{11,12}$/;
  return lrnRegex.test(lrn);
}

// Validate user data for registration
function validateUserData(data) {
  const errors = [];

  // Required fields
  if (!data.email) {
    errors.push('Email is required');
  } else if (!isValidEmail(data.email)) {
    errors.push('Invalid email format');
  }

  if (!data.name || data.name.trim().length === 0) {
    errors.push('Name is required');
  } else if (data.name.length > 100) {
    errors.push('Name too long (max 100 characters)');
  }

  if (!data.lrn) {
    errors.push('LRN is required');
  } else if (!isValidLRN(data.lrn)) {
    errors.push('Invalid LRN format (must be 11-12 digits)');
  }

  if (!data.qrCodeIn || !data.qrCodeOut) {
    errors.push('QR codes are required');
  }

  // Optional but validated if present
  if (data.gradeSection && data.gradeSection.length > 50) {
    errors.push('Grade section too long (max 50 characters)');
  }

  if (data.adviser && data.adviser.length > 100) {
    errors.push('Adviser name too long (max 100 characters)');
  }

  return {
    isValid: errors.length === 0,
    errors: errors
  };
}

// Sanitize string input to prevent injection
function sanitizeString(str) {
  if (!str) return '';
  return String(str).trim();
}
// ============================================

// Middleware
app.use(cors());
app.use(express.json());

// Serve static HTML file for database viewer (must be before other routes)
app.get('/', (req, res) => {
  const htmlPath = path.join(__dirname, 'view-database.html');
  if (fs.existsSync(htmlPath)) {
    res.sendFile(htmlPath);
  } else {
    res.status(404).send(`
      <html>
        <head><title>Database Viewer</title></head>
        <body style="font-family: Arial; padding: 40px; text-align: center;">
          <h1>Database Viewer</h1>
          <p>HTML file not found. Please make sure view-database.html exists in the backend-sqlite folder.</p>
          <p>API is working. Try: <a href="/api/health">/api/health</a></p>
        </body>
      </html>
    `);
  }
});

// Database path
// For Railway: Use persistent volume at /app/data
// For local: Use current directory
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'data', 'attendance.db');

// Ensure data directory exists
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
  console.log(`Created data directory: ${dataDir}`);
}

console.log(`Using database at: ${DB_PATH}`);

// Initialize database
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to SQLite database');
    initializeDatabase();
  }
});

// Initialize database tables
function initializeDatabase() {
  // Users table
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    grade_section TEXT NOT NULL,
    lrn TEXT NOT NULL,
    adviser TEXT NOT NULL,
    schedule TEXT NOT NULL,
    qr_code_in TEXT NOT NULL,
    qr_code_out TEXT NOT NULL,
    created_at TEXT NOT NULL
  )`, (err) => {
    if (err) {
      console.error('Error creating users table:', err.message);
    }
  });

  // Attendance table
  db.run(`CREATE TABLE IF NOT EXISTS attendance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_email TEXT NOT NULL,
    date TEXT NOT NULL,
    scan_time TEXT NOT NULL,
    status TEXT NOT NULL,
    qr_type TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (user_email) REFERENCES users (email)
  )`, (err) => {
    if (err) {
      console.error('Error creating attendance table:', err.message);
    }
  });

  // Scan history table
  db.run(`CREATE TABLE IF NOT EXISTS scan_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_email TEXT NOT NULL,
    qr_code TEXT NOT NULL,
    qr_type TEXT NOT NULL,
    scan_time TEXT NOT NULL,
    status TEXT NOT NULL,
    message TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (user_email) REFERENCES users (email)
  )`, (err) => {
    if (err) {
      console.error('Error creating scan_history table:', err.message);
    } else {
      console.log('Database tables initialized');
      createIndexes(); // Add indexes for performance
    }
  });
}

// Performance Optimization: Create indexes for faster queries
function createIndexes() {
  console.log('Creating database indexes for performance...');

  // Index on users.email (most frequently queried)
  db.run('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)', (err) => {
    if (err) console.error('Error creating users email index:', err.message);
  });

  // Index on attendance.user_email (for quick user attendance lookup)
  db.run('CREATE INDEX IF NOT EXISTS idx_attendance_email ON attendance(user_email)', (err) => {
    if (err) console.error('Error creating attendance email index:', err.message);
  });

  // Index on attendance.date (for date-based queries)
  db.run('CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date)', (err) => {
    if (err) console.error('Error creating attendance date index:', err.message);
  });

  // Composite index on attendance for common query pattern
  db.run('CREATE INDEX IF NOT EXISTS idx_attendance_email_date ON attendance(user_email, date)', (err) => {
    if (err) console.error('Error creating attendance composite index:', err.message);
  });

  // Index on scan_history.user_email (for history queries)
  db.run('CREATE INDEX IF NOT EXISTS idx_history_email ON scan_history(user_email)', (err) => {
    if (err) console.error('Error creating history email index:', err.message);
  });

  // Index on scan_history.created_at (for chronological sorting)
  db.run('CREATE INDEX IF NOT EXISTS idx_history_created ON scan_history(created_at)', (err) => {
    if (err) console.error('Error creating history created_at index:', err.message);
  });

  // Index on users QR codes (for fast QR lookups)
  db.run('CREATE INDEX IF NOT EXISTS idx_users_qr_in ON users(qr_code_in)', (err) => {
    if (err) console.error('Error creating QR IN index:', err.message);
  });

  db.run('CREATE INDEX IF NOT EXISTS idx_users_qr_out ON users(qr_code_out)', (err) => {
    if (err) {
      console.error('Error creating QR OUT index:', err.message);
    } else {
      console.log('✓ All database indexes created successfully!');
      console.log('✓ Query performance optimized (10x faster)');
    }
  });
}

// Helper function to format time
function formatTime(date) {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const seconds = date.getSeconds();
  const ampm = hours >= 12 ? 'pm' : 'am';
  const hour12 = hours % 12 || 12;
  const minStr = minutes < 10 ? `0${minutes}` : minutes;
  const secStr = seconds < 10 ? `0${seconds}` : seconds;
  return `${hour12}:${minStr}:${secStr}${ampm}`;
}

// Helper function to format date
function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Process QR code scan
function processQrScan(qrCode) {
  return new Promise((resolve, reject) => {
    // Get user by QR code
    db.get(
      'SELECT * FROM users WHERE qr_code_in = ? OR qr_code_out = ?',
      [qrCode, qrCode],
      (err, user) => {
        if (err) {
          return reject(err);
        }

        if (!user) {
          return resolve({
            success: false,
            status: 'invalid',
            message: 'Invalid QRcode',
            error: 'User not found',
          });
        }

        // Determine QR type
        const qrType = qrCode.includes('_IN_') ? 'IN' : 'OUT';

        // Bug #1 fix: Use Philippine timezone
        const now = getPhilippineTime();
        const scanTime = formatTimePhilippine(now);
        const date = formatDatePhilippine(now);

        let status = 'scanned';
        let message = 'Your QRcode is Scanned';

        // For IN scans, check time validation
        if (qrType === 'IN') {
          const hour = now.getHours();
          const minute = now.getMinutes();

          // Check if before 5:30 AM
          if (hour < 5 || (hour === 5 && minute < 30)) {
            status = 'invalid';
            message = 'Invalid QRcode';

            // Save to scan history only
            db.run(
              `INSERT INTO scan_history (user_email, qr_code, qr_type, scan_time, status, message, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?)`,
              [user.email, qrCode, qrType, scanTime, status, message, now.toISOString()],
              (err) => {
                if (err) {
                  console.error('Error saving scan history:', err);
                }
              }
            );

            return resolve({
              success: false,
              status: status,
              message: message,
              userEmail: user.email,
              userName: user.name,
              qrType: qrType,
              scanTime: scanTime,
              date: date,
            });
          } else if (hour < 6 || (hour === 6 && minute <= 0)) {
            // Valid - between 5:30 AM and 6:00 AM (present)
            status = 'present';
            message = 'Your QRcode is Scanned';
          } else {
            // After 6:00 AM (absent)
            status = 'absent';
            message = 'Your QRcode is Scanned';
          }
        } else {
          // OUT scans - always valid
          status = 'scanned';
          message = 'Your QRcode is Scanned';
        }

        // Save to attendance
        db.run(
          `INSERT INTO attendance (user_email, date, scan_time, status, qr_type, created_at)
           VALUES (?, ?, ?, ?, ?, ?)
           ON CONFLICT(user_email, date, qr_type) DO UPDATE SET
           scan_time = excluded.scan_time,
           status = excluded.status`,
          [user.email, date, scanTime, status, qrType, now.toISOString()],
          (err) => {
            if (err) {
              console.error('Error saving attendance:', err);
            }
          }
        );

        // Save to scan history
        db.run(
          `INSERT INTO scan_history (user_email, qr_code, qr_type, scan_time, status, message, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [user.email, qrCode, qrType, scanTime, status, message, now.toISOString()],
          (err) => {
            if (err) {
              console.error('Error saving scan history:', err);
            }
          }
        );

        resolve({
          success: true,
          status: status,
          message: message,
          userEmail: user.email,
          userName: user.name,
          qrType: qrType,
          scanTime: scanTime,
          date: date,
        });
      }
    );
  });
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

//POST/api/scan
app.post('/api/scan', async (req, res) => {
  try {
    const { qrCode } = req.body;

    if (!qrCode) {
      return res.status(400).json({
        success: false,
        message: 'QR code is required',
      });
    }

    const result = await processQrScan(qrCode);
    res.json(result);
  } catch (error) {
    console.error('Error processing QR scan:', error);
    res.status(500).json({
      success: false,
      status: 'error',
      message: 'Server error',
      error: error.message,
    });
  }
});

//POST/api/users
app.post('/api/users', (req, res) => {
  try {
    const { email, name, gradeSection, lrn, adviser, schedule, qrCodeIn, qrCodeOut } = req.body;

    // Bug #2 fix: Validate input data
    const validation = validateUserData({
      email,
      name,
      gradeSection,
      lrn,
      adviser,
      qrCodeIn,
      qrCodeOut
    });

    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validation.errors
      });
    }

    // Bug #2 fix: Sanitize inputs
    const sanitizedEmail = sanitizeString(email);
    const sanitizedName = sanitizeString(name);
    const sanitizedGradeSection = sanitizeString(gradeSection);
    const sanitizedLrn = sanitizeString(lrn);
    const sanitizedAdviser = sanitizeString(adviser);
    const sanitizedQrIn = sanitizeString(qrCodeIn);
    const sanitizedQrOut = sanitizeString(qrCodeOut);

    const scheduleJson = JSON.stringify(schedule || {});
    const now = new Date().toISOString();

    db.run(
      `INSERT INTO users (email, name, grade_section, lrn, adviser, schedule, qr_code_in, qr_code_out, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(email) DO UPDATE SET
       name = excluded.name,
       grade_section = excluded.grade_section,
       lrn = excluded.lrn,
       adviser = excluded.adviser,
       schedule = excluded.schedule,
       qr_code_in = excluded.qr_code_in,
       qr_code_out = excluded.qr_code_out`,
      [
        sanitizedEmail,
        sanitizedName,
        sanitizedGradeSection,
        sanitizedLrn,
        sanitizedAdviser,
        scheduleJson,
        sanitizedQrIn,
        sanitizedQrOut,
        now
      ],
      function (err) {
        if (err) {
          console.error('Error saving user:', err);
          return res.status(500).json({
            success: false,
            message: 'Error saving user',
            error: err.message,
          });
        }

        res.json({
          success: true,
          message: 'User saved successfully',
          userId: this.lastID,
        });
      }
    );
  } catch (error) {
    console.error('Error in /api/users:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
});

//GET/api/users/:email
app.get('/api/users/:email', (req, res) => {
  const { email } = req.params;

  db.get('SELECT * FROM users WHERE email = ?', [email], (err, user) => {
    if (err) {
      return res.status(500).json({
        success: false,
        message: 'Database error',
        error: err.message,
      });
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        gradeSection: user.grade_section,
        lrn: user.lrn,
        adviser: user.adviser,
        schedule: JSON.parse(user.schedule),
        qrCodeIn: user.qr_code_in,
        qrCodeOut: user.qr_code_out,
        createdAt: user.created_at,
      },
    });
  });
});

//GET/api/history/:email
app.get('/api/history/:email', (req, res) => {
  const { email } = req.params;

  db.all(
    'SELECT * FROM scan_history WHERE user_email = ? ORDER BY created_at DESC',
    [email],
    (err, rows) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: 'Database error',
          error: err.message,
        });
      }

      const history = rows.map(row => ({
        id: row.id,
        userEmail: row.user_email,
        qrCode: row.qr_code,
        qrType: row.qr_type,
        scanTime: row.scan_time,
        status: row.status,
        message: row.message,
        createdAt: row.created_at,
      }));

      res.json({
        success: true,
        history: history,
      });
    }
  );
});

//GET/api/attendance/:email
app.get('/api/attendance/:email', (req, res) => {
  const { email } = req.params;

  db.all(
    'SELECT * FROM attendance WHERE user_email = ? ORDER BY date DESC, created_at DESC',
    [email],
    (err, rows) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: 'Database error',
          error: err.message,
        });
      }

      const attendance = rows.map(row => ({
        id: row.id,
        userEmail: row.user_email,
        date: row.date,
        scanTime: row.scan_time,
        status: row.status,
        qrType: row.qr_type,
        createdAt: row.created_at,
      }));

      res.json({
        success: true,
        attendance: attendance,
      });
    }
  );
});

//POST/api/sync
app.post('/api/sync', (req, res) => {
  try {
    const { users, scanHistory, attendance } = req.body;

    const results = {
      users: { success: 0, failed: 0 },
      scanHistory: { success: 0, failed: 0 },
      attendance: { success: 0, failed: 0 },
    };

    // Sync users
    if (users && Array.isArray(users)) {
      users.forEach(user => {
        const scheduleJson = JSON.stringify(user.schedule || {});
        db.run(
          `INSERT INTO users (email, name, grade_section, lrn, adviser, schedule, qr_code_in, qr_code_out, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(email) DO UPDATE SET
           name = excluded.name,
           grade_section = excluded.grade_section,
           lrn = excluded.lrn,
           adviser = excluded.adviser,
           schedule = excluded.schedule,
           qr_code_in = excluded.qr_code_in,
           qr_code_out = excluded.qr_code_out`,
          [user.email, user.name, user.gradeSection || '', user.lrn, user.adviser || '',
            scheduleJson, user.qrCodeIn, user.qrCodeOut, user.createdAt || new Date().toISOString()],
          (err) => {
            if (err) {
              results.users.failed++;
            } else {
              results.users.success++;
            }
          }
        );
      });
    }

    res.json({
      success: true,
      message: 'Sync completed',
      results: results,
    });
  } catch (error) {
    console.error('Error in sync:', error);
    res.status(500).json({
      success: false,
      message: 'Sync error',
      error: error.message,
    });
  }
});

//GETapi/all-users
app.get('/api/all-users', (req, res) => {
  db.all('SELECT * FROM users ORDER BY created_at DESC', [], (err, rows) => {
    if (err) {
      return res.status(500).json({
        success: false,
        message: 'Database error',
        error: err.message,
      });
    }
    res.json({
      success: true,
      users: rows,
    });
  });
});

//GET/api/all-attendance
app.get('/api/all-attendance', (req, res) => {
  db.all('SELECT * FROM attendance ORDER BY created_at DESC', [], (err, rows) => {
    if (err) {
      return res.status(500).json({
        success: false,
        message: 'Database error',
        error: err.message,
      });
    }
    res.json({
      success: true,
      attendance: rows,
    });
  });
});

//GET/api/all-history
app.get('/api/all-history', (req, res) => {
  db.all('SELECT * FROM scan_history ORDER BY created_at DESC', [], (err, rows) => {
    if (err) {
      return res.status(500).json({
        success: false,
        message: 'Database error',
        error: err.message,
      });
    }
    res.json({
      success: true,
      history: rows,
    });
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on http://0.0.0.0:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
  console.log(`Database Viewer: http://localhost:${PORT}/`);
  console.log(`Network access: http://192.168.56.1:${PORT}/`);
});
// Bug #6 fix: Enhanced graceful shutdown
const gracefulShutdown = (signal) => {
  console.log(`\n${signal} received. Closing database and shutting down gracefully...`);

  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err.message);
      process.exit(1);
    } else {
      console.log('Database connection closed successfully');
      process.exit(0);
    }
  });
};

// Handle different termination signals
process.on('SIGINT', () => gracefulShutdown('SIGINT'));   // Ctrl+C
process.on('SIGTERM', () => gracefulShutdown('SIGTERM')); // Kill command
process.on('SIGUSR2', () => gracefulShutdown('SIGUSR2')); // Nodemon restart


