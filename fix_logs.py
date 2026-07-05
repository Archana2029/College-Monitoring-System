import sqlite3

conn = sqlite3.connect('campus.db')
cursor = conn.cursor()

# Fix old logs with commas
cursor.execute("UPDATE monitoring_logs SET students = 'Students present' WHERE students LIKE '%,%'")
conn.commit()
print("✅ Fixed all logs with commas!")

conn.close()