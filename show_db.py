import sqlite3

conn = sqlite3.connect('campus.db')
cursor = conn.cursor()

print('=== TABLES IN DATABASE ===')
cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
for row in cursor.fetchall():
    print('Table:', row[0])

print()
print('=== STUDENT_RECORDS TABLE (Same as your localStorage students) ===')
cursor.execute('PRAGMA table_info(student_records)')
for col in cursor.fetchall():
    print(col[1], '-', col[2])

print()
print('=== ALL STUDENTS IN BACKEND ===')
cursor.execute("SELECT student_id, name, department, year, phone, email FROM student_records LIMIT 10")
rows = cursor.fetchall()
if rows:
    for row in rows:
        print(row)
else:
    print('(No students yet - open prediction.html to sync from localStorage!)')

print()
print('=== MARKS TABLE STRUCTURE ===')
cursor.execute('PRAGMA table_info(marks)')
for col in cursor.fetchall():
    print(col[1], '-', col[2])

print()
print('=== ALL DATA IN MARKS TABLE ===')
cursor.execute('SELECT * FROM marks')
rows = cursor.fetchall()
if rows:
    for row in rows:
        print(row)
else:
    print('(No data yet - save some marks in prediction module first!)')

print()
print('=== ATTENDANCE TABLE STRUCTURE ===')
cursor.execute("PRAGMA table_info(attendance)")
for col in cursor.fetchall():
    print(f"{col[1]} - {col[2]}")

print()
print('=== ALL DATA IN ATTENDANCE TABLE ===')
cursor.execute("SELECT * FROM attendance ORDER BY id DESC")
rows = cursor.fetchall()
if rows:
    for row in rows:
        print(row)
else:
    print('(No attendance records yet)')

print()
print('=== MONITORING LOGS TABLE STRUCTURE ===')
cursor.execute("PRAGMA table_info(monitoring_logs)")
for col in cursor.fetchall():
    print(f"{col[1]} - {col[2]}")

print()
print('=== ALL DATA IN MONITORING LOGS TABLE ===')
cursor.execute("SELECT id, timestamp, camera, movements, students, anomaly, status FROM monitoring_logs ORDER BY id DESC")
rows = cursor.fetchall()
if rows:
    for row in rows:
        print(row)
else:
    print('(No monitoring logs yet)')

print()
print('=== MONITORING ALERTS TABLE STRUCTURE ===')
cursor.execute("PRAGMA table_info(monitoring_alerts)")
for col in cursor.fetchall():
    print(f"{col[1]} - {col[2]}")

print()
print('=== ALL DATA IN MONITORING ALERTS TABLE ===')
cursor.execute("SELECT id, type, severity, details, timestamp, status, logId FROM monitoring_alerts ORDER BY id DESC")
rows = cursor.fetchall()
if rows:
    for row in rows:
        print(row)
else:
    print('(No monitoring alerts yet)')

conn.close()

