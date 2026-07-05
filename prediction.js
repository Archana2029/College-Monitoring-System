function generateAlert(type, message) {
    console.log(type + ": " + message);
    alert(message);
    
    // Add to notification panel
    const notifications = JSON.parse(localStorage.getItem('predictionNotifications')) || [];
    const notification = {
        id: Date.now(),
        type: type,
        message: message,
        timestamp: new Date().toLocaleString(),
        read: false
    };
    notifications.unshift(notification);
    localStorage.setItem('predictionNotifications', JSON.stringify(notifications));
    
    // Update bell badge
    const unread = notifications.filter(n => !n.read).length;
    const badge = document.getElementById('notificationBadge');
    if (badge) {
        badge.textContent = unread > 99 ? '99+' : unread;
        badge.style.display = unread ? 'flex' : 'none';
    }
}
// Subjects mapping (copied from attendance.js)
const subjects = {
  'BCA': {'1st year': ['PST', 'Data Structure'], '2nd year': ['DBMS', 'Java'], '3rd year': ['ML', 'MAD']},
  'BCom': {'1st year': ['Financial Accounting', 'Business Organization'], '2nd year': ['Cost Accounting', 'Company Law'], '3rd year': ['Auditing', 'Management Accounting']},
  'BA': {'1st year': ['History', 'Sociology'], '2nd year': ['Political Science', 'Sociology'], '3rd year': ['Indian Constitution', 'Public Administration']},
  'BBA': {'1st year': ['EVS', 'Business Communication'], '2nd year': ['Human Resources Management', 'Marketing Management'], '3rd year': ['Strategic Management', 'International Business']},
  'BSc': {'1st year': ['Physics', 'Chemistry'], '2nd year': ['Zoology', 'Biology'], '3rd year': ['Botany', 'Math']}
};

// Data storage
let students = JSON.parse(localStorage.getItem('students')) || [];
let attendanceRecords = JSON.parse(localStorage.getItem('attendanceRecords')) || [];
let marksData = []; // Now fetched from backend
let currentStudents = [];
let currentDept, currentYear, currentSub;
const API_BASE = 'http://localhost:5000/api';

// Init subjects dropdowns
function updateMarksSubjects() {
  const dept = document.getElementById('marksDept').value;
  const year = document.getElementById('marksYear').value;
  const subSelect = document.getElementById('marksSub');
  subSelect.innerHTML = '<option value="">Select Subject</option>';
  
  if (dept && year && subjects[dept]?.[year]) {
    subjects[dept][year].forEach(sub => {
      const opt = document.createElement('option');
      opt.value = sub;
      opt.textContent = sub;
      subSelect.appendChild(opt);
    });
  }
}

function updatePredSubjects() {
  const dept = document.getElementById('predDept').value;
  const year = document.getElementById('predYear').value;
  const subSelect = document.getElementById('predSub');
  subSelect.innerHTML = '<option value="">Select Subject</option>';
  
  if (dept && year && subjects[dept]?.[year]) {
    subjects[dept][year].forEach(sub => {
      const opt = document.createElement('option');
      opt.value = sub;
      opt.textContent = sub;
      subSelect.appendChild(opt);
    });
  }
}

// MARKS ENTRY SECTION
// Tab switching for single page
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', function() {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    this.classList.add('active');
    document.getElementById(this.dataset.tab + 'Section').classList.add('active');
  });
});

async function loadMarksStudents() {
  currentDept = document.getElementById('marksDept').value;
  currentYear = document.getElementById('marksYear').value;
  currentSub = document.getElementById('marksSub').value;
  
  if (!currentDept || !currentYear || !currentSub) {
    alert('Please select Department, Year, and Subject');
    return;
  }
  
  currentStudents = students.filter(s => s.department === currentDept && s.year === currentYear);
  
  // Fetch marks from backend
  try {
    const res = await fetch(`${API_BASE}/marks?dept=${encodeURIComponent(currentDept)}&year=${encodeURIComponent(currentYear)}&sub=${encodeURIComponent(currentSub)}`);
    marksData = await res.json();
  } catch (e) {
    console.error('Failed to fetch marks:', e);
    marksData = [];
  }
  
  const container = document.getElementById('marksStudentsTable');
  container.innerHTML = `
    <table id="marksTable">
      <thead>
        <tr>
          <th>ID</th>
          <th>Name</th>
          <th>Internal 1 (max 10)</th>
          <th>Internal 2 (max 10)</th>
          <th>Seminar (max 10)</th>
          <th>Assignment (max 10)</th>
          <th>Total (/40)</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody></tbody>
    </table>
  `;
  
  const tbody = document.querySelector('#marksTable tbody');
  currentStudents.forEach(student => {
    const existingMarks = marksData.find(m => 
      m.studentId === student.id && m.dept === currentDept && m.year === currentYear && m.sub === currentSub
    ) || {internal1: '', internal2: '', seminar: '', assignment: ''};
    
    const total = (parseFloat(existingMarks.internal1) || 0) + (parseFloat(existingMarks.internal2) || 0) + 
                  (parseFloat(existingMarks.seminar) || 0) + (parseFloat(existingMarks.assignment) || 0);
    
    const row = tbody.insertRow();
    row.innerHTML = `
  <td>${student.id}</td>
  <td>${student.name}</td>
  <td><input type="text" maxlength="4" value="${existingMarks.internal1 || ''}" onchange="validateMark(this, 10); markChanged(this)" onkeypress="return event.charCode >= 48 && event.charCode <= 57 || event.charCode === 46" data-student="${student.id}" data-field="internal1"></td>
  <td><input type="text" maxlength="4" value="${existingMarks.internal2 || ''}" onchange="validateMark(this, 10); markChanged(this)" onkeypress="return event.charCode >= 48 && event.charCode <= 57 || event.charCode === 46" data-student="${student.id}" data-field="internal2"></td>
  <td><input type="text" maxlength="4" value="${existingMarks.seminar || ''}" onchange="validateMark(this, 10); markChanged(this)" onkeypress="return event.charCode >= 48 && event.charCode <= 57 || event.charCode === 46" data-student="${student.id}" data-field="seminar"></td>
  <td><input type="text" maxlength="4" value="${existingMarks.assignment || ''}" onchange="validateMark(this, 10); markChanged(this)" onkeypress="return event.charCode >= 48 && event.charCode <= 57 || event.charCode === 46" data-student="${student.id}" data-field="assignment"></td>
  <td id="total-${student.id}">${total.toFixed(1)}</td>
  <td><button class="btn" id="saveBtn-${student.id}" onclick="saveStudentMarks('${student.id}')">Save</button></td>
`;
  });
}

function validateMark(input, max) {
  let value = parseFloat(input.value);
  
  // Check if empty or not a number
  if (isNaN(value) || input.value === '') {
    alert('❌ Please enter a number between 1 and 10');
    generateAlert('warning', 'Please enter marks between 1 and 10');
    input.value = '';
    markChanged(input);
    return;
  }
  
  // Check if less than 1
  if (value < 1) {
    alert('❌ Marks cannot be less than 1! Minimum is 1');
    generateAlert('warning', 'Minimum marks is 1');
    input.value = '';
    markChanged(input);
    updateTotal(input.dataset.student);
    return;
  }
  
  // Check if greater than max (10)
  if (value > max) {
    alert(`❌ Marks cannot exceed ${max}! Maximum is ${max}`);
    generateAlert('warning', `Maximum ${max} marks allowed`);
    input.value = max;
    markChanged(input);
    updateTotal(input.dataset.student);
    return;
  }
  
  // If value is 0
  if (value === 0) {
    alert('❌ Marks cannot be 0! Minimum is 1');
    generateAlert('warning', 'Marks should be between 1 and 10');
    input.value = '';
    markChanged(input);
    updateTotal(input.dataset.student);
    return;
  }
  
  markChanged(input);
  updateTotal(input.dataset.student);
}
function updateTotal(studentId) {
  const inputs = document.querySelectorAll(`[data-student="${studentId}"]`);
  const values = Array.from(inputs).map(inp => parseFloat(inp.value) || 0);
  const total = values.reduce((a,b)=>a+b, 0);
  document.getElementById(`total-${studentId}`).textContent = total.toFixed(1);
}

// 👇 ADD THIS FUNCTION RIGHT AFTER updateTotal 👇
function markChanged(input) {
  const studentId = input.dataset.student;
  const saveBtn = document.getElementById(`saveBtn-${studentId}`);
  if (saveBtn && saveBtn.innerHTML !== 'Save') {
    saveBtn.innerHTML = 'Save';
    saveBtn.style.background = '';
  }
  updateTotal(studentId);
}

async function saveStudentMarks(studentId) {
  const inputs = document.querySelectorAll(`[data-student="${studentId}"]`);
  
  // CHECK IF ALL MARKS ARE EMPTY
  const internal1 = parseFloat(inputs[0].value) || 0;
  const internal2 = parseFloat(inputs[1].value) || 0;
  const seminar = parseFloat(inputs[2].value) || 0;
  const assignment = parseFloat(inputs[3].value) || 0;
  
  // IF ALL MARKS ARE ZERO/EMPTY, SHOW ALERT
  if (internal1 === 0 && internal2 === 0 && seminar === 0 && assignment === 0) {
    alert('⚠️ Please enter marks before saving!');
    generateAlert('warning', '⚠️ Please enter marks before saving!');
    return;  // STOP SAVING
  }
  
  const marks = {
    studentId, dept: currentDept, year: currentYear, sub: currentSub,
    internal1: internal1,
    internal2: internal2,
    seminar: seminar,
    assignment: assignment
  };
  
  try {
    const res = await fetch(`${API_BASE}/marks`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(marks)
    });
    const data = await res.json();
    if (data.success) {
      // Update local cache
      const existingIndex = marksData.findIndex(m => 
        m.studentId === studentId && m.dept === currentDept && m.year === currentYear && m.sub === currentSub
      );
      if (existingIndex > -1) {
        marksData[existingIndex] = marks;
      } else {
        marksData.push(marks);
      }
      const saveBtn = document.getElementById(`saveBtn-${studentId}`);
      if (saveBtn) {
        saveBtn.innerHTML = '✓ Saved';
        saveBtn.style.background = '#10b981';
      }
    } else {
      alert('❌ Failed to save marks: ' + (data.message || 'Unknown error'));
    }
  } catch (e) {
    console.error('Error saving marks:', e);
    alert('❌ Network error while saving marks');
  }
}


async function exportMarksCSV() {
  if (currentStudents.length === 0) return generateAlert('warning', 'Load students first');
  
  // Fetch latest marks from backend
  try {
    const res = await fetch(`${API_BASE}/marks?dept=${encodeURIComponent(currentDept)}&year=${encodeURIComponent(currentYear)}&sub=${encodeURIComponent(currentSub)}`);
    marksData = await res.json();
  } catch (e) {
    console.error('Failed to fetch marks:', e);
  }
  
  let csv = 'ID,Name,Internal1,Internal2,Seminar,Assignment,Total\n';
  currentStudents.forEach(student => {
    const marks = marksData.find(m => m.studentId === student.id && m.dept === currentDept && m.year === currentYear && m.sub === currentSub) || {};
    const total = (marks.internal1||0) + (marks.internal2||0) + (marks.seminar||0) + (marks.assignment||0);
    csv += `${student.id},${student.name},${marks.internal1||''},${marks.internal2||''},${marks.seminar||''},${marks.assignment||''},${total}\n`;
  });
  
  const blob = new Blob([csv], {type: 'text/csv'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `marks_${currentDept}_${currentYear}_${currentSub}.csv`;
  a.click();
  generateAlert('success', 'CSV exported');
}

function printMarks() {
  if (currentStudents.length === 0) {
    alert('No students loaded to print!');
    return;
  }
  
  // Get the marks table
  const marksTable = document.getElementById('marksTable');
  if (!marksTable) {
    alert('No marks table found!');
    return;
  }
  
  // Create a new window for printing
  const printWindow = window.open('', '_blank');
  printWindow.document.write(`
    <html>
    <head>
      <title>Marks Sheet</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          padding: 20px;
        }
        h2 {
          text-align: center;
          color: #1e293b;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 20px;
        }
        th, td {
          border: 1px solid #ccc;
          padding: 10px;
          text-align: left;
        }
        th {
          background: #1e293b;
          color: white;
        }
        .header {
          text-align: center;
          margin-bottom: 20px;
        }
        .footer {
          text-align: center;
          margin-top: 30px;
          font-size: 12px;
          color: #666;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h2>📝 Marks Entry Report</h2>
        <p>Department: ${currentDept} | Year: ${currentYear} | Subject: ${currentSub}</p>
      </div>
      ${marksTable.outerHTML}
      <div class="footer">
        <p>Generated on: ${new Date().toLocaleString()}</p>
      </div>
    </body>
    </html>
  `);
  
  printWindow.document.close();
  printWindow.print();
  printWindow.close();
}

function printReport() {
  const reportTable = document.getElementById('reportTable');
  if (!reportTable || reportTable.querySelector('tbody tr')?.cells.length === 0) {
    alert('No report data to print! Please load report first.');
    return;
  }
  
  const dept = document.getElementById('reportDept').value || 'All';
  const year = document.getElementById('reportYear').value || 'All';
  const sub = document.getElementById('reportSub').value || 'All';
  
  const printWindow = window.open('', '_blank');
  printWindow.document.write(`
    <html>
    <head>
      <title>Prediction Report</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        h2 { text-align: center; color: #1e293b; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { border: 1px solid #ccc; padding: 10px; text-align: left; }
        th { background: #1e293b; color: white; }
        .header { text-align: center; margin-bottom: 20px; }
        .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="header">
        <h2>📊 Prediction Report</h2>
        <p>Department: ${dept} | Year: ${year} | Subject: ${sub}</p>
      </div>
      ${reportTable.outerHTML}
      <div class="footer">
        <p>Generated on: ${new Date().toLocaleString()}</p>
      </div>
    </body>
    </html>
  `);
  
  printWindow.document.close();
  printWindow.print();
  printWindow.close();
}




// PREDICTION SECTION
document.getElementById('predDept').addEventListener('change', updatePredSubjects);
document.getElementById('predYear').addEventListener('change', updatePredSubjects);

async function loadPredStudents() {
  currentDept = document.getElementById('predDept').value;
  currentYear = document.getElementById('predYear').value;
  currentSub = document.getElementById('predSub').value;
  
  if (!currentDept || !currentYear || !currentSub) {
    alert('Please select Department, Year, and Subject');
    return;
  }
  
  currentStudents = students.filter(s => s.department === currentDept && s.year === currentYear);
  
  // Fetch marks from backend
  try {
    const res = await fetch(`${API_BASE}/marks?dept=${encodeURIComponent(currentDept)}&year=${encodeURIComponent(currentYear)}&sub=${encodeURIComponent(currentSub)}`);
    marksData = await res.json();
  } catch (e) {
    console.error('Failed to fetch marks:', e);
    marksData = [];
  }
  
  const container = document.getElementById('predStudentsTable');
container.innerHTML = `
  <table id="predTable">
    <thead>
      <tr><th>Name</th><th>Marks(%)</th><th>Attendance %</th><th>Score(%)</th><th>Status</th><th>Actions</th> </tr>
    </thead>
    <tbody></tbody>
  </table>
`;
  
  const tbody = container.querySelector('tbody');
  currentStudents.forEach(student => {
    const marks = marksData.find(m => m.studentId === student.id && m.dept === currentDept && m.year === currentYear && m.sub === currentSub);
    const totalMarks = marks ? ((marks.internal1 + marks.internal2 + marks.seminar + marks.assignment)/40 * 100) : 0;
    const attenPct = calculateAttendancePct(student.id, currentSub);
   const row = tbody.insertRow();
row.innerHTML = `
  <td>${student.name}</td>
  <td id="marks-${student.id}">${totalMarks.toFixed(1)}%</td>
  <td id="atten-${student.id}">${attenPct.toFixed(1)}%</td>
  <td id="score-${student.id}">-</td>
  <td id="status-${student.id}">-</td>
  <td><button class="btn" onclick="runPredictionForStudent('${student.id}')">Predict</button></td>
`;
  });
}

function calculateAttendancePct(studentId, subject) {
  const studentRecords = attendanceRecords.filter(r => r.studentId === studentId && r.subject === subject);
  if (studentRecords.length === 0) return 0;
  
  const present = studentRecords.filter(r => r.status === 'Present').length;
  return (present / studentRecords.length) * 100;
}

// Predict for single student
function runPredictionForStudent(studentId) {
  const student = currentStudents.find(s => s.id === studentId);
  if (!student) return;
  
  const marks = marksData.find(m => m.studentId === student.id && m.dept === currentDept && m.year === currentYear && m.sub === currentSub);
  const totalMarks = marks ? ((marks.internal1 + marks.internal2 + marks.seminar + marks.assignment)/40 * 100) : 0;
  const attenPct = calculateAttendancePct(student.id, currentSub);
  
  const score = (totalMarks * 0.7 + attenPct * 0.3);
  
  let status = 'Needs Improvement';
  if (score >= 85) status = 'Excellent';
  else if (score >= 65) status = 'Good';
  else if (score >= 45) status = 'Average';
  
  document.getElementById(`score-${student.id}`).innerHTML = `${score.toFixed(1)}%`;
  document.getElementById(`status-${student.id}`).innerHTML = `<span class="status-badge status-${status.toLowerCase().replace(' ','-')}">${status}</span>`;
  
  
}

// Predict for all students
function runPredictionForAll() {
  currentStudents.forEach(student => {
    runPredictionForStudent(student.id);
  });
  generateAlert('success', `✅ Predictions completed for ${currentStudents.length} students`);
}
    // Prediction formula: 60% marks + 30% attendance + 10% study hours
    

// REPORT SECTION
document.getElementById('reportDept').addEventListener('change', () => {
  // Update subjects if needed
});

async function loadReport() {
  const dept = document.getElementById('reportDept').value;
  const year = document.getElementById('reportYear').value;
  const sub = document.getElementById('reportSub').value;
  
  // Fetch marks from backend with filters
  try {
    let url = `${API_BASE}/marks`;
    const params = [];
    if (dept) params.push(`dept=${encodeURIComponent(dept)}`);
    if (year) params.push(`year=${encodeURIComponent(year)}`);
    if (sub) params.push(`sub=${encodeURIComponent(sub)}`);
    if (params.length > 0) url += '?' + params.join('&');
    const res = await fetch(url);
    marksData = await res.json();
  } catch (e) {
    console.error('Failed to fetch marks:', e);
    marksData = [];
  }
  
  let filteredMarks = marksData;
  if (dept) filteredMarks = filteredMarks.filter(m => m.dept === dept);
  if (year) filteredMarks = filteredMarks.filter(m => students.find(s => s.id === m.studentId)?.year === year);
  if (sub) filteredMarks = filteredMarks.filter(m => m.sub === sub);
  
  const tbody = document.querySelector('#reportTable tbody');
  tbody.innerHTML = '';
  
  filteredMarks.forEach(marks => {
    const student = students.find(s => s.id === marks.studentId);
    if (!student) return;
    
    const total = (marks.internal1 + marks.internal2 + marks.seminar + marks.assignment);
    let grade = 'F';
    if (total >= 35) grade = 'O';
    else if (total >= 30) grade = 'A+';
    else if (total >= 25) grade = 'A';
    else if (total >= 20) grade = 'B+';
    else if (total >= 15) grade = 'B';
    
    const row = tbody.insertRow();
    row.innerHTML = `
      <td>${marks.studentId}</td>
      <td>${student.name}</td>
      <td>${marks.dept}</td>
      <td>${student.year}</td>
      <td>${marks.sub}</td>
      <td>${grade} (${total}/40)</td>
    `;
  });
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
  // Auto-generate students if empty (from index.html logic)
  if (students.length === 0) {
    // Simplified - assume index.html ran first or generate minimal
    generateAlert('info', 'Run index.html first to generate students');
  }
});
// Fix for missing elements on load

// FORCE LOAD STUDENTS FROM MAIN SYSTEM
// FORCE LOAD STUDENTS FROM MAIN SYSTEM
document.addEventListener('DOMContentLoaded', async function() {
    // Try to get students from main localStorage
    let mainStudents = JSON.parse(localStorage.getItem('students')) || [];
    
    if (mainStudents.length > 0) {
        students = mainStudents;
        console.log(`✅ Loaded ${students.length} students from main system`);
        syncStudentsToBackend(students);
    } else {
        // If no students in localStorage, fetch from backend
        try {
            console.log("No students in localStorage, fetching from backend...");
            const response = await fetch(`${API_BASE}/student-records`);
            students = await response.json();
            if (students.length > 0) {
                localStorage.setItem('students', JSON.stringify(students));
                console.log(`✅ Loaded ${students.length} students from backend`);
                syncStudentsToBackend(students);
            } else {
                generateAlert('warning', 'No students found! Please add students from main dashboard first.');
            }
        } catch(e) {
            console.error("Could not fetch from backend:", e);
            generateAlert('warning', 'No students found! Please add students from main dashboard first.');
        }
    }
    
    // Also try to get attendance records from backend
    try {
        const attResponse = await fetch(`${API_BASE}/attendance`);
        attendanceRecords = await attResponse.json();
        console.log(`✅ Loaded ${attendanceRecords.length} attendance records from backend`);
        // Save to localStorage for next time
        localStorage.setItem('attendanceRecords', JSON.stringify(attendanceRecords));
    } catch(e) {
        console.error("Could not fetch attendance from backend:", e);
        // Fallback to localStorage
        let mainAttendance = JSON.parse(localStorage.getItem('attendanceRecords')) || [];
        if (mainAttendance.length > 0) {
            attendanceRecords = mainAttendance;
            console.log(`✅ Loaded ${attendanceRecords.length} attendance records from localStorage`);
        }
    }
});

// Sync localStorage students to backend database
async function syncStudentsToBackend(studentList) {
  if (!studentList || studentList.length === 0) return;
  try {
    const res = await fetch(`${API_BASE}/sync-students`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({students: studentList})
    });
    const data = await res.json();
    if (data.success) {
      console.log(`✅ ${data.message}`);
    } else {
      console.warn('⚠️ Student sync warning:', data.message);
    }
  } catch (e) {
    console.error('❌ Failed to sync students to backend:', e);
  }
}

// FORCE REPORT TO ONLY SHOW IN REPORT TAB
setInterval(function() {
    const reportTable = document.getElementById('reportTable');
    const isReportTab = document.getElementById('reportSection').classList.contains('active');
    
    if (reportTable) {
        if (isReportTab) {
            reportTable.style.display = 'table';
        } else {
            reportTable.style.display = 'none';
        }
    }
}, 100);