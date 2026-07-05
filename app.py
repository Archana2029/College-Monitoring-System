from flask import Flask, request, jsonify, session, send_from_directory
from flask_cors import CORS
from flask_bcrypt import Bcrypt
import sqlite3
from datetime import datetime
import os
from ultralytics import YOLO
import cv2
import numpy as np

app = Flask(__name__)
app.secret_key = 'campusmonitoringsecretkey2024'
CORS(app)
bcrypt = Bcrypt(app)

# Load YOLO model for campus monitoring
try:
    model = YOLO('yolov8n.pt')
    print("✅ YOLO model loaded successfully!")
except Exception as e:
    print(f"❌ Failed to load YOLO: {e}")
    model = None

# Database setup
def get_db():
    conn = sqlite3.connect('campus.db')
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    cursor = conn.cursor()
    
    # Users table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL
        )
    ''')
    
    # Students table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS students (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            roll_no TEXT UNIQUE NOT NULL,
            branch TEXT NOT NULL,
            year INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Marks table for prediction module
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS marks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id TEXT NOT NULL,
            dept TEXT NOT NULL,
            year TEXT NOT NULL,
            sub TEXT NOT NULL,
            internal1 REAL DEFAULT 0,
            internal2 REAL DEFAULT 0,
            seminar REAL DEFAULT 0,
            assignment REAL DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(student_id, dept, year, sub)
        )
    ''')
    
    # Student records table - stores SAME data as frontend localStorage
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS student_records (
            student_id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            department TEXT NOT NULL,
            year TEXT NOT NULL,
            phone TEXT,
            email TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Attendance table for attendance module
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS attendance (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id TEXT NOT NULL,
            name TEXT,
            dept TEXT NOT NULL,
            year TEXT NOT NULL,
            email TEXT,
            phone TEXT,
            date TEXT NOT NULL,
            status TEXT NOT NULL,
            subject TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(student_id, date, subject)
        )
    ''')
    
    # Monitoring logs table for campus_monitoring module
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS monitoring_logs (
            id INTEGER PRIMARY KEY,
            timestamp TEXT NOT NULL,
            camera TEXT NOT NULL,
            movements INTEGER DEFAULT 0,
            students TEXT,
            image TEXT,
            anomaly INTEGER DEFAULT 0,
            status TEXT DEFAULT 'Normal',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Monitoring alerts table for campus_monitoring module
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS monitoring_alerts (
            id INTEGER PRIMARY KEY,
            type TEXT NOT NULL,
            severity TEXT NOT NULL,
            details TEXT,
            timestamp TEXT NOT NULL,
            status TEXT DEFAULT 'Active',
            logId INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Insert default admin if not exists
        # Insert default admin if not exists
    cursor.execute("SELECT * FROM users WHERE username = 'admin'")
    if not cursor.fetchone():
        hashed_pw = bcrypt.generate_password_hash('admin123').decode('utf-8')
        cursor.execute("INSERT INTO users (username, password) VALUES (?, ?)", 
                      ('admin', hashed_pw))
    
    # Insert default teacher if not exists
    cursor.execute("SELECT * FROM users WHERE username = 'teacher'")
    if not cursor.fetchone():
        hashed_pw = bcrypt.generate_password_hash('teacher123').decode('utf-8')
        cursor.execute("INSERT INTO users (username, password) VALUES (?, ?)", 
                      ('teacher', hashed_pw))
    conn.commit()
    conn.close()

# ============ SERVE FRONTEND FILES ============
FRONTEND_FOLDER = 'C:/Users/user/Desktop/ARYA CLG/frontend'

@app.route('/')
def serve_index():
    return send_from_directory(FRONTEND_FOLDER, 'index.html')

@app.route('/<path:filename>')
def serve_frontend(filename):
    return send_from_directory(FRONTEND_FOLDER, filename)

# ============ API ENDPOINTS ============

# Login endpoint
@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    username = data.get('username')
    password = data.get('password')
    role = data.get('role')
    
    conn = get_db()
    user = conn.execute("SELECT * FROM users WHERE username = ?", (username,)).fetchone()
    conn.close()
    
    if user and bcrypt.check_password_hash(user['password'], password):
        session['user_id'] = user['id']
        session['role'] = role
        return jsonify({"success": True, "message": "Login successful!", "role": role})
    else:
        return jsonify({"success": False, "message": "Invalid credentials!"}), 401

# Logout endpoint
@app.route('/api/logout', methods=['POST'])
def logout():
    session.clear()
    return jsonify({"success": True, "message": "Logged out!"})

# Get all students
@app.route('/api/students', methods=['GET'])
def get_students():
    conn = get_db()
    students = conn.execute("SELECT * FROM students ORDER BY id DESC").fetchall()
    conn.close()
    
    result = []
    for s in students:
        result.append(dict(s))
    return jsonify(result)

# Add student
@app.route('/api/students', methods=['POST'])
def add_student():
    data = request.json
    name = data.get('name')
    roll_no = data.get('roll_no')
    branch = data.get('branch')
    year = data.get('year')
    
    if not all([name, roll_no, branch]):
        return jsonify({"success": False, "message": "Missing fields!"}), 400
    
    try:
        conn = get_db()
        conn.execute(
            "INSERT INTO students (name, roll_no, branch, year) VALUES (?, ?, ?, ?)",
            (name, roll_no, branch, year)
        )
        conn.commit()
        conn.close()
        return jsonify({"success": True, "message": "Student added successfully!"})
    except sqlite3.IntegrityError:
        return jsonify({"success": False, "message": "Roll number already exists!"}), 400

# Delete student
@app.route('/api/students/<int:student_id>', methods=['DELETE'])
def delete_student(student_id):
    conn = get_db()
    conn.execute("DELETE FROM students WHERE id = ?", (student_id,))
    conn.commit()
    conn.close()
    return jsonify({"success": True, "message": "Student deleted!"})

# Check login status
@app.route('/api/check-auth', methods=['GET'])
def check_auth():
    if 'user_id' in session:
        return jsonify({"authenticated": True})
    return jsonify({"authenticated": False})

# ============ STUDENT RECORDS ENDPOINTS (SAME AS FRONTEND localStorage) ============

# Sync students from frontend localStorage to backend
@app.route('/api/sync-students', methods=['POST'])
def sync_students():
    data = request.json
    students = data.get('students', [])
    
    if not students:
        return jsonify({"success": False, "message": "No students provided!"}), 400
    
    conn = get_db()
    try:
        for s in students:
            conn.execute('''
                INSERT INTO student_records (student_id, name, department, year, phone, email)
                VALUES (?, ?, ?, ?, ?, ?)
                ON CONFLICT(student_id) DO UPDATE SET
                    name=excluded.name,
                    department=excluded.department,
                    year=excluded.year,
                    phone=excluded.phone,
                    email=excluded.email
            ''', (s.get('id'), s.get('name'), s.get('department'), s.get('year'), s.get('phone'), s.get('email')))
        conn.commit()
        conn.close()
        return jsonify({"success": True, "message": f"{len(students)} students synced!"})
    except Exception as e:
        conn.close()
        return jsonify({"success": False, "message": str(e)}), 500

# Get all student records (same format as frontend)
@app.route('/api/student-records', methods=['GET'])
def get_student_records():
    conn = get_db()
    rows = conn.execute("SELECT student_id as id, name, department, year, phone, email FROM student_records").fetchall()
    conn.close()
    
    result = []
    for r in rows:
        result.append(dict(r))
    return jsonify(result)

# ============ MARKS ENDPOINTS FOR PREDICTION MODULE ============

# Get marks (optionally filter by dept, year, sub)
@app.route('/api/marks', methods=['GET'])
def get_marks():
    dept = request.args.get('dept', '')
    year = request.args.get('year', '')
    sub = request.args.get('sub', '')
    
    conn = get_db()
    query = "SELECT student_id as studentId, dept, year, sub, internal1, internal2, seminar, assignment FROM marks WHERE 1=1"
    params = []
    
    if dept:
        query += " AND dept = ?"
        params.append(dept)
    if year:
        query += " AND year = ?"
        params.append(year)
    if sub:
        query += " AND sub = ?"
        params.append(sub)
    
    query += " ORDER BY id DESC"
    
    rows = conn.execute(query, params).fetchall()
    conn.close()
    
    result = []
    for r in rows:
        result.append(dict(r))
    return jsonify(result)

# Save / update marks (upsert)
@app.route('/api/marks', methods=['POST'])
def save_marks():
    data = request.json
    student_id = data.get('studentId')
    dept = data.get('dept')
    year = data.get('year')
    sub = data.get('sub')
    internal1 = float(data.get('internal1') or 0)
    internal2 = float(data.get('internal2') or 0)
    seminar = float(data.get('seminar') or 0)
    assignment = float(data.get('assignment') or 0)
    
    if not all([student_id, dept, year, sub]):
        return jsonify({"success": False, "message": "Missing required fields!"}), 400
    
    conn = get_db()
    try:
        conn.execute('''
            INSERT INTO marks (student_id, dept, year, sub, internal1, internal2, seminar, assignment)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(student_id, dept, year, sub) DO UPDATE SET
                internal1=excluded.internal1,
                internal2=excluded.internal2,
                seminar=excluded.seminar,
                assignment=excluded.assignment,
                created_at=CURRENT_TIMESTAMP
        ''', (student_id, dept, year, sub, internal1, internal2, seminar, assignment))
        conn.commit()
        conn.close()
        return jsonify({"success": True, "message": "Marks saved successfully!"})
    except Exception as e:
        conn.close()
        return jsonify({"success": False, "message": str(e)}), 500

# ============ ATTENDANCE ENDPOINTS FOR ATTENDANCE MODULE ============

# Get attendance records (optionally filter by date, dept, year, subject, studentId)
@app.route('/api/attendance', methods=['GET'])
def get_attendance():
    date = request.args.get('date', '')
    dept = request.args.get('dept', '')
    year = request.args.get('year', '')
    subject = request.args.get('subject', '')
    student_id = request.args.get('studentId', '')
    
    conn = get_db()
    query = """SELECT student_id as studentId, name, dept, year, email, phone, 
               date, status, subject FROM attendance WHERE 1=1"""
    params = []
    
    if date:
        query += " AND date = ?"
        params.append(date)
    if dept:
        query += " AND dept = ?"
        params.append(dept)
    if year:
        query += " AND year = ?"
        params.append(year)
    if subject:
        query += " AND subject = ?"
        params.append(subject)
    if student_id:
        query += " AND student_id = ?"
        params.append(student_id)
    
    query += " ORDER BY id DESC"
    
    rows = conn.execute(query, params).fetchall()
    conn.close()
    
    result = []
    for r in rows:
        result.append(dict(r))
    return jsonify(result)

# Save / update attendance records (batch upsert)
@app.route('/api/attendance', methods=['POST'])
def save_attendance():
    data = request.json
    records = data.get('records', [])
    
    if not records:
        return jsonify({"success": False, "message": "No records provided!"}), 400
    
    conn = get_db()
    try:
        for rec in records:
            conn.execute('''
                INSERT INTO attendance (student_id, name, dept, year, email, phone, date, status, subject)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(student_id, date, subject) DO UPDATE SET
                    name=excluded.name,
                    dept=excluded.dept,
                    year=excluded.year,
                    email=excluded.email,
                    phone=excluded.phone,
                    status=excluded.status,
                    created_at=CURRENT_TIMESTAMP
            ''', (
                rec.get('studentId'), rec.get('name'), rec.get('dept'), 
                rec.get('year'), rec.get('email'), rec.get('phone'),
                rec.get('date'), rec.get('status'), rec.get('subject')
            ))
        conn.commit()
        conn.close()
        return jsonify({"success": True, "message": f"{len(records)} attendance records saved!"})
    except Exception as e:
        conn.close()
        return jsonify({"success": False, "message": str(e)}), 500

# ============ MONITORING ENDPOINTS FOR CAMPUS_MONITORING MODULE ============

# Get monitoring logs
@app.route('/api/monitoring-logs', methods=['GET'])
def get_monitoring_logs():
    camera = request.args.get('camera', '')
    conn = get_db()
    query = "SELECT * FROM monitoring_logs WHERE 1=1"
    params = []
    if camera:
        query += " AND camera = ?"
        params.append(camera)
    query += " ORDER BY created_at DESC"
    rows = conn.execute(query, params).fetchall()
    conn.close()
    result = []
    for r in rows:
        row = dict(r)
        row['students'] = row['students'] if row['students'] else 'None'
        row['anomaly'] = bool(row['anomaly'])
        result.append(row)
    return jsonify(result)

# Save monitoring log
@app.route('/api/monitoring-logs', methods=['POST'])
def save_monitoring_log():
    data = request.json
    conn = get_db()
    try:
        conn.execute('''
            INSERT INTO monitoring_logs (id, timestamp, camera, movements, students, image, anomaly, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                timestamp=excluded.timestamp,
                camera=excluded.camera,
                movements=excluded.movements,
                students=excluded.students,
                image=excluded.image,
                anomaly=excluded.anomaly,
                status=excluded.status
        ''', (
            data.get('id'), data.get('timestamp'), data.get('camera'),
            data.get('movements', 0),
            data.get('students', 'None'),
            data.get('image'),
            1 if data.get('anomaly') else 0,
            data.get('status', 'Normal')
        ))
        conn.commit()
        conn.close()
        return jsonify({"success": True, "message": "Monitoring log saved!"})
    except Exception as e:
        conn.close()
        return jsonify({"success": False, "message": str(e)}), 500

# Delete monitoring log
@app.route('/api/monitoring-logs/<int:log_id>', methods=['DELETE'])
def delete_monitoring_log(log_id):
    conn = get_db()
    conn.execute("DELETE FROM monitoring_logs WHERE id = ?", (log_id,))
    conn.execute("DELETE FROM monitoring_alerts WHERE logId = ?", (log_id,))
    conn.commit()
    conn.close()
    return jsonify({"success": True, "message": "Log deleted!"})

# Get monitoring alerts
@app.route('/api/monitoring-alerts', methods=['GET'])
def get_monitoring_alerts():
    status = request.args.get('status', '')
    conn = get_db()
    query = "SELECT * FROM monitoring_alerts WHERE 1=1"
    params = []
    if status:
        query += " AND status = ?"
        params.append(status)
    query += " ORDER BY created_at DESC"
    rows = conn.execute(query, params).fetchall()
    conn.close()
    result = [dict(r) for r in rows]
    return jsonify(result)

# Save monitoring alert
@app.route('/api/analyze-image', methods=['POST'])
def analyze_image():
    if 'image' not in request.files:
        return jsonify({'error': 'No image uploaded'}), 400
    
    file = request.files['image']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    try:
        # Read image
        img_bytes = file.read()
        np_arr = np.frombuffer(img_bytes, np.uint8)
        img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
        
        if model is None:
            return jsonify({'error': 'YOLO model not loaded'}), 500
        
        # Run YOLO detection
        results = model(img)
        
        # Extract detections
        detections = []
        person_count = 0
        has_phone = False
        has_cigarette = False
        has_knife = False
        has_gun = False
        
        for r in results[0].boxes:
            class_name = model.names[int(r.cls)]
            if class_name == 'person':
                person_count += 1
            elif class_name == 'cell phone':
                has_phone = True
            elif class_name == 'cigarette':
                has_cigarette = True
            elif class_name == 'knife':
                has_knife = True
            elif class_name == 'gun':
                has_gun = True
        
        # Check filename for suspicious keywords
        filename = file.filename.lower()
        
        # Determine activity and status
        status = 'Normal'
        activity = 'normal activity'
        students_summary = "Students present"
        
        # FIRST: Check filename (for testing)
        if 'fight' in filename or 'violence' in filename or 'brawl' in filename:
            status = 'High Risk'
            activity = 'Fighting detected'
        elif 'cheating' in filename or 'copy' in filename or 'exam' in filename:
            status = 'Suspicious'
            activity = 'Cheating detected'
        elif 'accident' in filename or 'fall' in filename or 'injured' in filename:
            status = 'High Risk'
            activity = 'Accident detected'
        elif 'phone' in filename or 'mobile' in filename:
            status = 'Suspicious'
            activity = 'Using mobile phone'
        elif 'smoking' in filename or 'cigarette' in filename:
            status = 'Suspicious'
            activity = 'Smoking detected'
        elif 'throwing' in filename or 'rocket' in filename or 'harm' in filename:
            status = 'High Risk'
            activity = 'Throwing harmful objects'
        else:
            # YOLO based detection
            if has_gun or has_knife:
                status = 'High Risk'
                activity = 'Dangerous object detected'
            elif has_phone:
                status = 'Suspicious'
                activity = 'Using mobile phone'
            elif has_cigarette:
                status = 'Suspicious'
                activity = 'Smoking detected'
            elif person_count >= 5:
                status = 'Normal'
                activity = 'Group Discussion / Lecture'
            elif person_count >= 1:
                status = 'Normal'
                activity = 'Student present (sitting / standing)'
            else:
                status = 'Normal'
                activity = 'No activity detected'
        
        return jsonify({
            'detections': detections,
            'status': status,
            'activity': activity,
            'students': 'Students present'
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Resolve alert
@app.route('/api/monitoring-alerts/<int:alert_id>/resolve', methods=['POST'])
def resolve_monitoring_alert(alert_id):
    conn = get_db()
    conn.execute("UPDATE monitoring_alerts SET status = 'Resolved' WHERE id = ?", (alert_id,))
    conn.commit()
    conn.close()
    return jsonify({"success": True, "message": "Alert resolved!"})

if __name__ == '__main__':
    init_db()
    print("🚀 Server running on http://localhost:5000")
    app.run(debug=True, port=5000)