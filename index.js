// ============================================
// THISAPP BACKEND - FIREBASE VERSION
// ============================================
// Purpose: Backend server using Firebase Realtime Database
// 
// This replaces SQLite with Firebase for:
// - Persistent cloud storage (no data loss)
// - Real-time sync capabilities
// - Free tier with generous limits
//
// Database URL: https://appsnamin-default-rtdb.asia-southeast1.firebasedatabase.app
// ============================================

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 8080;

// ============================================
// FIREBASE CONFIGURATION
// ============================================
const FIREBASE_DATABASE_URL = process.env.FIREBASE_DATABASE_URL ||
    'https://appsnamin-default-rtdb.asia-southeast1.firebasedatabase.app';

// Helper function to make Firebase REST API calls
async function firebaseRequest(path, method = 'GET', data = null) {
    const url = `${FIREBASE_DATABASE_URL}${path}.json`;

    const options = {
        method: method,
        headers: {
            'Content-Type': 'application/json',
        },
    };

    if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
        options.body = JSON.stringify(data);
    }

    try {
        const response = await fetch(url, options);
        const result = await response.json();
        return result;
    } catch (error) {
        console.error(`Firebase ${method} error:`, error);
        throw error;
    }
}

// ============================================
// Philippine Timezone Helper
// ============================================
function getPhilippineTime() {
    const now = new Date();
    const phTime = new Date(now.toLocaleString('en-US', {
        timeZone: 'Asia/Manila'
    }));
    return phTime;
}

function formatTimePhilippine(date) {
    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    const ampm = hours >= 12 ? 'pm' : 'am';
    hours = hours % 12 || 12;
    return `${hours}:${minutes}:${seconds}${ampm}`;
}

function formatDatePhilippine(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function formatDateTimePhilippine(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

// ============================================
// Input Validation Functions
// ============================================
function isValidEmail(email) {
    if (!email || typeof email !== 'string') return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function isValidLRN(lrn) {
    if (!lrn || typeof lrn !== 'string') return false;
    const lrnRegex = /^\d{11,12}$/;
    return lrnRegex.test(lrn);
}

function validateUserData(data) {
    const errors = [];

    if (!data.email) {
        errors.push('Email is required');
    } else if (!isValidEmail(data.email)) {
        errors.push('Invalid email format');
    }

    if (!data.name || data.name.trim().length === 0) {
        errors.push('Name is required');
    }

    if (!data.lrn) {
        errors.push('LRN is required');
    } else if (!isValidLRN(data.lrn)) {
        errors.push('Invalid LRN format (must be 11-12 digits)');
    }

    if (!data.qrCodeIn || !data.qrCodeOut) {
        errors.push('QR codes are required');
    }

    return {
        isValid: errors.length === 0,
        errors: errors
    };
}

function sanitizeString(str) {
    if (!str) return '';
    return String(str).trim();
}

// Convert email to Firebase-safe key (replace . with ,)
function emailToKey(email) {
    return email.replace(/\./g, ',');
}

function keyToEmail(key) {
    return key.replace(/,/g, '.');
}

// ============================================
// SMS Service Placeholder
// ============================================
async function sendParentSMS(contactNumber, studentName, type, time) {
    if (!contactNumber || contactNumber.trim() === '') {
        console.log('⚠️ No contact number provided, skipping SMS');
        return { success: false, message: 'No contact number' };
    }

    const scanType = type === 'IN' ? 'IN' : 'OUT';
    const message = `Attendance: ${studentName} scanned ${scanType} at ${time}.`;
    console.log(`📱 [GSM MOCK] Sending SMS to ${contactNumber}: "${message}"`);

    return { success: true, message: 'SMS Queued/Sent' };
}

// ============================================
// Middleware
// ============================================
app.use(cors());
app.use(express.json());

// Serve static HTML file for database viewer
app.get('/', (req, res) => {
    const htmlPath = path.join(__dirname, 'view-database.html');
    if (fs.existsSync(htmlPath)) {
        res.sendFile(htmlPath);
    } else {
        res.send(`
      <html>
        <head><title>ThisApp Backend - Firebase</title></head>
        <body style="font-family: Arial; padding: 40px; text-align: center; background: #1a1a2e; color: white;">
          <h1>🔥 ThisApp Backend (Firebase)</h1>
          <p>Server is running with Firebase Realtime Database</p>
          <p>Database: <code>${FIREBASE_DATABASE_URL}</code></p>
          <p>API Status: <a href="/api/health" style="color: #4ade80;">/api/health</a></p>
        </body>
      </html>
    `);
    }
});

// ============================================
// API ENDPOINTS
// ============================================

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        message: 'Server is running with Firebase',
        database: 'Firebase Realtime Database',
        timestamp: formatDateTimePhilippine(getPhilippineTime())
    });
});

// ============================================
// QR SCAN PROCESSING
// ============================================
app.post('/api/scan', async (req, res) => {
    try {
        const { qrCode } = req.body;

        if (!qrCode) {
            return res.status(400).json({
                success: false,
                message: 'QR code is required',
            });
        }

        console.log(`📷 Processing QR: ${qrCode}`);

        // Get user by QR code
        const users = await firebaseRequest('/users');
        let foundUser = null;
        let userKey = null;

        if (users) {
            for (const [key, user] of Object.entries(users)) {
                if (user.qr_code_in === qrCode || user.qr_code_out === qrCode) {
                    foundUser = user;
                    userKey = key;
                    break;
                }
            }
        }

        if (!foundUser) {
            return res.json({
                success: false,
                status: 'invalid',
                message: 'Invalid QRcode',
                error: 'User not found',
            });
        }

        // Determine QR type
        const qrType = qrCode.includes('_IN_') ? 'IN' : 'OUT';

        // Get Philippine time
        const now = getPhilippineTime();
        const scanTime = formatTimePhilippine(now);
        const date = formatDatePhilippine(now);
        const dateKey = date.replace(/-/g, '_'); // Firebase-safe date key

        // Check if already scanned today for this type
        const attendanceKey = `${emailToKey(foundUser.email)}_${dateKey}_${qrType}`;
        const existingAttendance = await firebaseRequest(`/attendance/${attendanceKey}`);

        if (existingAttendance) {
            // Save to scan history with "already scanned" message
            await firebaseRequest('/scan_history', 'POST', {
                user_email: foundUser.email,
                qr_code: qrCode,
                qr_type: qrType,
                scan_time: scanTime,
                status: 'duplicate',
                message: 'Already scanned today',
                created_at: formatDateTimePhilippine(now)
            });

            return res.json({
                success: false,
                status: 'duplicate',
                message: 'Already scanned today',
                userEmail: foundUser.email,
                userName: foundUser.name,
                qrType: qrType,
                scanTime: existingAttendance.scan_time,
                date: date,
            });
        }

        // Determine status based on time
        let status = 'scanned';
        let message = 'Your QRcode is Scanned';
        const hour = now.getHours();
        const minute = now.getMinutes();

        if (qrType === 'IN') {
            if (hour < 12 || (hour === 12 && minute < 20)) {
                status = 'present';
                message = 'Present - Early arrival!';
            } else if (hour === 12 && minute >= 20 && minute <= 45) {
                status = 'present';
                message = 'Present - On time!';
            } else {
                status = 'late';
                message = 'Late arrival';
            }
        } else {
            // OUT scans - only allowed between 7:10 PM - 7:20 PM
            if (hour === 19 && minute >= 10 && minute <= 20) {
                status = 'out';
                message = 'Checked out - Goodbye!';
            } else {
                await firebaseRequest('/scan_history', 'POST', {
                    user_email: foundUser.email,
                    qr_code: qrCode,
                    qr_type: qrType,
                    scan_time: scanTime,
                    status: 'invalid',
                    message: 'OUT scan only allowed 7:10-7:20 PM',
                    created_at: formatDateTimePhilippine(now)
                });

                return res.json({
                    success: false,
                    status: 'invalid',
                    message: 'OUT scan only allowed 7:10-7:20 PM',
                    userEmail: foundUser.email,
                    userName: foundUser.name,
                    qrType: qrType,
                    scanTime: scanTime,
                    date: date,
                });
            }
        }

        // Save to attendance
        await firebaseRequest(`/attendance/${attendanceKey}`, 'PUT', {
            user_email: foundUser.email,
            date: date,
            scan_time: scanTime,
            status: status,
            qr_type: qrType,
            created_at: formatDateTimePhilippine(now)
        });

        // Save to scan history
        await firebaseRequest('/scan_history', 'POST', {
            user_email: foundUser.email,
            qr_code: qrCode,
            qr_type: qrType,
            scan_time: scanTime,
            status: status,
            message: message,
            created_at: formatDateTimePhilippine(now)
        });

        // Send SMS notification (Mock)
        if (foundUser.contact_number && foundUser.contact_number.trim() !== '') {
            sendParentSMS(foundUser.contact_number, foundUser.name, qrType, scanTime);
        }

        console.log(`✅ Scan recorded: ${foundUser.name} - ${qrType} - ${status}`);

        res.json({
            success: true,
            status: status,
            message: message,
            userEmail: foundUser.email,
            userName: foundUser.name,
            qrType: qrType,
            scanTime: scanTime,
            date: date,
            contactNumber: foundUser.contact_number
        });

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

// ============================================
// USER MANAGEMENT
// ============================================

// POST /api/users - Register or update user
app.post('/api/users', async (req, res) => {
    try {
        const { email, name, gradeSection, lrn, adviser, parentContactNumber, schedule, qrCodeIn, qrCodeOut } = req.body;

        const validation = validateUserData({
            email, name, gradeSection, lrn, adviser, qrCodeIn, qrCodeOut
        });

        if (!validation.isValid) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: validation.errors
            });
        }

        const sanitizedEmail = sanitizeString(email);
        const userKey = emailToKey(sanitizedEmail);
        const now = new Date().toISOString();

        const userData = {
            email: sanitizedEmail,
            name: sanitizeString(name),
            grade_section: sanitizeString(gradeSection),
            lrn: sanitizeString(lrn),
            adviser: sanitizeString(adviser),
            contact_number: sanitizeString(parentContactNumber),
            schedule: JSON.stringify(schedule || {}),
            qr_code_in: sanitizeString(qrCodeIn),
            qr_code_out: sanitizeString(qrCodeOut),
            created_at: now
        };

        await firebaseRequest(`/users/${userKey}`, 'PUT', userData);

        console.log(`✅ User saved: ${sanitizedEmail}`);

        res.json({
            success: true,
            message: 'User saved successfully',
            userId: userKey,
        });

    } catch (error) {
        console.error('Error in /api/users:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message,
        });
    }
});

// GET /api/users/:email
app.get('/api/users/:email', async (req, res) => {
    try {
        const { email } = req.params;
        const userKey = emailToKey(email);

        const user = await firebaseRequest(`/users/${userKey}`);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found',
            });
        }

        res.json({
            success: true,
            user: {
                email: user.email,
                name: user.name,
                gradeSection: user.grade_section,
                lrn: user.lrn,
                adviser: user.adviser,
                contactNumber: user.contact_number,
                schedule: JSON.parse(user.schedule || '{}'),
                qrCodeIn: user.qr_code_in,
                qrCodeOut: user.qr_code_out,
                createdAt: user.created_at,
            },
        });

    } catch (error) {
        console.error('Error getting user:', error);
        res.status(500).json({
            success: false,
            message: 'Database error',
            error: error.message,
        });
    }
});

// GET /api/all-users
app.get('/api/all-users', async (req, res) => {
    try {
        const users = await firebaseRequest('/users');

        const userList = users ? Object.values(users).map(user => ({
            email: user.email,
            name: user.name,
            grade_section: user.grade_section,
            lrn: user.lrn,
            adviser: user.adviser,
            contact_number: user.contact_number,
            qr_code_in: user.qr_code_in,
            qr_code_out: user.qr_code_out,
            created_at: user.created_at
        })) : [];

        res.json({
            success: true,
            users: userList,
        });

    } catch (error) {
        console.error('Error getting all users:', error);
        res.status(500).json({
            success: false,
            message: 'Database error',
            error: error.message,
        });
    }
});

// ============================================
// HISTORY & ATTENDANCE
// ============================================

// GET /api/history/:email
app.get('/api/history/:email', async (req, res) => {
    try {
        const { email } = req.params;

        const allHistory = await firebaseRequest('/scan_history');

        const history = [];
        if (allHistory) {
            for (const [id, record] of Object.entries(allHistory)) {
                if (record.user_email === email) {
                    history.push({
                        id: id,
                        userEmail: record.user_email,
                        qrCode: record.qr_code,
                        qrType: record.qr_type,
                        scanTime: record.scan_time,
                        status: record.status,
                        message: record.message,
                        createdAt: record.created_at,
                    });
                }
            }
        }

        // Sort by created_at descending
        history.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        res.json({
            success: true,
            history: history,
        });

    } catch (error) {
        console.error('Error getting history:', error);
        res.status(500).json({
            success: false,
            message: 'Database error',
            error: error.message,
        });
    }
});

// GET /api/attendance/:email
app.get('/api/attendance/:email', async (req, res) => {
    try {
        const { email } = req.params;

        const allAttendance = await firebaseRequest('/attendance');

        const attendance = [];
        if (allAttendance) {
            for (const [id, record] of Object.entries(allAttendance)) {
                if (record.user_email === email) {
                    attendance.push({
                        id: id,
                        userEmail: record.user_email,
                        date: record.date,
                        scanTime: record.scan_time,
                        status: record.status,
                        qrType: record.qr_type,
                        createdAt: record.created_at,
                    });
                }
            }
        }

        // Sort by date descending
        attendance.sort((a, b) => new Date(b.date) - new Date(a.date));

        res.json({
            success: true,
            attendance: attendance,
        });

    } catch (error) {
        console.error('Error getting attendance:', error);
        res.status(500).json({
            success: false,
            message: 'Database error',
            error: error.message,
        });
    }
});

// GET /api/all-attendance
app.get('/api/all-attendance', async (req, res) => {
    try {
        const allAttendance = await firebaseRequest('/attendance');

        const attendance = allAttendance ? Object.entries(allAttendance).map(([id, record]) => ({
            id: id,
            user_email: record.user_email,
            date: record.date,
            scan_time: record.scan_time,
            status: record.status,
            qr_type: record.qr_type,
            created_at: record.created_at
        })) : [];

        // Sort by created_at descending
        attendance.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        res.json({
            success: true,
            attendance: attendance,
        });

    } catch (error) {
        console.error('Error getting all attendance:', error);
        res.status(500).json({
            success: false,
            message: 'Database error',
            error: error.message,
        });
    }
});

// ============================================
// DATA SYNC
// ============================================
app.post('/api/sync', async (req, res) => {
    try {
        const { users } = req.body;

        const results = {
            users: { success: 0, failed: 0 },
        };

        if (users && Array.isArray(users)) {
            for (const user of users) {
                try {
                    const userKey = emailToKey(user.email);
                    await firebaseRequest(`/users/${userKey}`, 'PUT', {
                        email: user.email,
                        name: user.name,
                        grade_section: user.gradeSection || '',
                        lrn: user.lrn,
                        adviser: user.adviser || '',
                        contact_number: user.parentContactNumber || '',
                        schedule: JSON.stringify(user.schedule || {}),
                        qr_code_in: user.qrCodeIn,
                        qr_code_out: user.qrCodeOut,
                        created_at: user.createdAt || new Date().toISOString()
                    });
                    results.users.success++;
                } catch (e) {
                    results.users.failed++;
                }
            }
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

// ============================================
// START SERVER
// ============================================
app.listen(PORT, '0.0.0.0', () => {
    console.log('============================================');
    console.log('🔥 ThisApp Backend - Firebase Version');
    console.log('============================================');
    console.log(`Server running on http://0.0.0.0:${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/api/health`);
    console.log(`Database: ${FIREBASE_DATABASE_URL}`);
    console.log('============================================');
});
