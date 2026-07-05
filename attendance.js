// Attendance System Script
// Uses students from main app's localStorage

// Subject mapping by dept/year (sample subjects)
const subjects = {
  'BCA': {'1st year': ['PST', 'Data Structure'], '2nd year': ['DBMS', 'Java'], '3rd year': ['ML', 'MAD']},
  'BCom': {'1st year': ['Financial Accounting', 'Business Organization'], '2nd year': ['Cost Accounting', 'Company Law'], '3rd year': ['Auditing', 'Management Accounting']},
  'BA': {'1st year': ['History', 'Sociology'], '2nd year': ['Political Science', 'Sociology'], '3rd year': ['Indian Constitution', 'Public Administration']},
  'BBA': {'1st year': ['EVS', 'Business Communication'], '2nd year': ['Human Resources Management', 'Marketing Management'], '3rd year': ['Strategic Management', 'International Business']},
  'BSc': {'1st year': ['Physics', 'Chemistry'], '2nd year': ['Zoology', 'Biology'], '3rd year': ['Botany', 'Math']}
};

// DOM Elements
const sections = document.querySelectorAll('.section');
let students = [];
let attendanceRecords = [];
let currentStudents = [];
const API_BASE = 'http://localhost:5000/api';

// Init
document.addEventListener('DOMContentLoaded', init);

async function init() {
  // FIRST: Try to get students from localStorage
  students = JSON.parse(localStorage.getItem('students')) || [];
  
  // SECOND: If no students in localStorage, fetch from backend
  if (students.length === 0) {
    try {
      console.log("No students in localStorage, fetching from backend...");
      const response = await fetch(`${API_BASE}/student-records`);
      students = await response.json();
      // Save to localStorage for next time
      localStorage.setItem('students', JSON.stringify(students));
      console.log(`✅ Loaded ${students.length} students from backend`);
    } catch(e) {
      console.log("Could not fetch from backend:", e);
    }
  }
  
  // THIRD: Fetch attendance records from backend
  try {
    const res = await fetch(`${API_BASE}/attendance`);
    attendanceRecords = await res.json();
    console.log(`✅ Loaded ${attendanceRecords.length} attendance records from backend`);
  } catch (e) {
    console.error('Failed to fetch attendance from backend:', e);
    attendanceRecords = JSON.parse(localStorage.getItem('attendanceRecords')) || [];
  }
  
  document.getElementById('attendanceDate').value = new Date().toISOString().split('T')[0];
  updateSubjectOptions();
  loadTodaySummary();

  const today = new Date().toISOString().split('T')[0];
  document.getElementById('attendanceDate').setAttribute('max', today);
  document.getElementById('dateFilterDetails').setAttribute('max', today);
  document.getElementById('dailyDateFilter').setAttribute('max', today);
  
  // Disable future months in monthly report
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
  document.getElementById('monthlyMonth').setAttribute('max', `${currentYear}-${currentMonth}`);
  
  // Sync existing localStorage attendance to backend
  syncAttendanceToBackend();
}

// Sync localStorage attendance records to backend
async function syncAttendanceToBackend() {
  const localRecords = JSON.parse(localStorage.getItem('attendanceRecords')) || [];
  if (localRecords.length === 0) return;
  try {
    const res = await fetch(`${API_BASE}/attendance`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({records: localRecords})
    });
    const data = await res.json();
    if (data.success) {
      console.log(`✅ ${data.message}`);
    }
  } catch (e) {
    console.error('Failed to sync attendance to backend:', e);
  }
}

function showSection(sectionId) {
  sections.forEach(s => s.classList.remove('active'));
  document.getElementById(sectionId + 'Section').classList.add('active');
  
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  event.target.classList.add('active');
}

function showReport(type) {
  document.querySelectorAll('.report-panel').forEach(p => p.classList.remove('active'));
  document.getElementById(type + 'Report').classList.add('active');
  
  document.querySelectorAll('.tab-btn-report').forEach(btn => btn.classList.remove('active'));
  event.target.classList.add('active');
}

function updateSubjectOptions() {
  const dept = document.getElementById('deptFilter').value;
  const year = document.getElementById('yearFilter').value;
  const subjectSelect = document.getElementById('subjectFilter');
  
  subjectSelect.innerHTML = '<option value="">Select Subject</option>';
  
  if (dept && year && subjects[dept] && subjects[dept][year]) {
    subjects[dept][year].forEach(sub => {
      const option = document.createElement('option');
      option.value = sub;
      option.textContent = sub;
      subjectSelect.appendChild(option);
    });
  }
}

document.getElementById('deptFilter').addEventListener('change', updateSubjectOptions);
document.getElementById('yearFilter').addEventListener('change', updateSubjectOptions);

// MARK ATTENDANCE
function loadStudents() {
  const date = document.getElementById('attendanceDate').value;
  const dept = document.getElementById('deptFilter').value;
  const year = document.getElementById('yearFilter').value;
  const subject = document.getElementById('subjectFilter').value;
  
  if (!dept) {
  alert('⚠️ Please select Department!');
  return;
}
if (!year) {
  alert('⚠️ Please select Year!');
  return;
}
if (!subject) {
  alert('⚠️ Please select Subject!');
  return;
}
  
  currentStudents = students.filter(s => s.department === dept && s.year === year);
  
  const container = document.getElementById('studentList');
  container.innerHTML = '';
  
  currentStudents.forEach(student => {
    const existingRecord = attendanceRecords.find(r => 
      r.studentId === student.id && r.date === date && r.subject === subject
    );
    
    const card = document.createElement('div');
    card.className = 'student-card';
    card.innerHTML = `
      <div class="student-info">
        <div class="student-name">${student.name}</div>
        <div class="student-details">${student.id} | ${student.department} ${student.year}</div>
      </div>
      <div class="attendance-status">
        <label class="status-radio">
          <input type="radio" name="status_${student.id}" value="Present" ${existingRecord?.status === 'Present' ? 'checked' : ''}>
          Present
        </label>
        <label class="status-radio">
          <input type="radio" name="status_${student.id}" value="Absent" ${existingRecord?.status === 'Absent' ? 'checked' : ''}>
          Absent
        </label>
      </div>
    `;
    container.appendChild(card);
  });
  
  // ✅ Create Save button OUTSIDE the card area - at the bottom of the card
  const existingBtn = document.getElementById('saveBtnWrapper');
  if (existingBtn) existingBtn.remove();
  
  const btnWrapper = document.createElement('div');
  btnWrapper.id = 'saveBtnWrapper';
  btnWrapper.style.textAlign = 'center';
  btnWrapper.style.marginTop = '20px';
  btnWrapper.style.padding = '10px';
  
  const saveBtn = document.createElement('button');
  saveBtn.className = 'btn success';
  saveBtn.innerHTML = '💾 Save Attendance';
  saveBtn.style.padding = '14px 28px';
  saveBtn.style.fontSize = '14px';
  saveBtn.style.width = 'auto';
  saveBtn.style.display = 'inline-block';
  saveBtn.onclick = saveAttendance;
  
  btnWrapper.appendChild(saveBtn);
  
  // Find the card div and add button after it
  const cardDiv = document.querySelector('.card');
  if (cardDiv && !document.getElementById('saveBtnWrapper')) {
    cardDiv.appendChild(btnWrapper);
  }
}

function markAllPresent() {
  document.querySelectorAll('input[type="radio"]').forEach(radio => {
    if (radio.value === 'Present') radio.checked = true;
  });
}

async function saveAttendance() {
  const date = document.getElementById('attendanceDate').value;
  const dept = document.getElementById('deptFilter').value;
  const year = document.getElementById('yearFilter').value;
  const subject = document.getElementById('subjectFilter').value;
  
  if (!subject) {
    alert('Please select subject and load students ');
    return;
  }
  
  const newRecords = [];
  let hasChanges = false;
  
  currentStudents.forEach(student => {
    const radios = document.querySelectorAll(`input[name="status_${student.id}"]`);
    const selectedStatus = Array.from(radios).find(r => r.checked)?.value || 'Absent';
    
    const existingIndex = attendanceRecords.findIndex(r => 
      r.studentId === student.id && r.date === date && r.subject === subject
    );
    
    const record = {
      studentId: student.id,
      name: student.name,
      dept: dept,
      year: year,
      email: student.email,
      phone: student.phone,
      date: date,
      status: selectedStatus,
      subject: subject
    };
    
    newRecords.push(record);
    
    if (existingIndex > -1) {
      if (attendanceRecords[existingIndex].status !== selectedStatus) {
        attendanceRecords[existingIndex] = record;
        hasChanges = true;
      }
    } else {
      attendanceRecords.push(record);
      hasChanges = true;
    }
  });
  
  // Save to backend
  try {
    const res = await fetch(`${API_BASE}/attendance`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({records: newRecords})
    });
    const data = await res.json();
    if (data.success) {
      // Also save to localStorage as backup
      localStorage.setItem('attendanceRecords', JSON.stringify(attendanceRecords));
    } else {
      alert('❌ Failed to save to backend: ' + (data.message || 'Unknown error'));
      return;
    }
  } catch (e) {
    console.error('Error saving attendance to backend:', e);
    alert('❌ Network error. Saved to localStorage only.');
    localStorage.setItem('attendanceRecords', JSON.stringify(attendanceRecords));
  }

  // Count present and absent students (always show this)
  let presentCount = 0;
  let absentCount = 0;
  currentStudents.forEach(student => {
      const radios = document.querySelectorAll(`input[name="status_${student.id}"]`);
      const selectedStatus = Array.from(radios).find(r => r.checked)?.value || 'Absent';
      if (selectedStatus === 'Present') presentCount++;
      else absentCount++;
  });

    if (hasChanges) {
  const successMsg = `✅ ${dept} Department - ${year}\n📚 Subject: ${subject}\n📊 Present: ${presentCount} | Absent: ${absentCount}\n💾 Attendance saved successfully!`;
  generateAlert('success', successMsg);
  alert(successMsg);
} else {
  alert(`📊 ${dept} Department - ${year} - ${subject}\nPresent: ${presentCount} | Absent: ${absentCount}\n(No changes made)`);
}
  loadTodaySummary();
  checkMissingAttendanceForToday();
}

// DETAILS
function updateDetailsSubjectOptions() {
  const dept = document.getElementById('detailsDept').value;
  const year = document.getElementById('detailsYear').value;
  const subjectSelect = document.getElementById('detailsSubject');
  
  subjectSelect.innerHTML = '<option value="">All Subjects</option>';
  
  if (dept && year && subjects[dept] && subjects[dept][year]) {
    subjects[dept][year].forEach(sub => {
      const option = document.createElement('option');
      option.value = sub;
      option.textContent = sub;
      subjectSelect.appendChild(option);
    });
  }
}

function loadDetails() {
  const date = document.getElementById('dateFilterDetails').value;
  const dept = document.getElementById('detailsDept').value;
  const year = document.getElementById('detailsYear').value;
  const subject = document.getElementById('detailsSubject').value;
  const search = document.getElementById('searchDetails').value.toLowerCase();
  
  let filteredRecords = attendanceRecords;
  
  if (date) {
    filteredRecords = filteredRecords.filter(r => r.date === date);
  }
  
  if (dept) {
    filteredRecords = filteredRecords.filter(r => r.dept === dept);
  }
  
  if (year) {
    filteredRecords = filteredRecords.filter(r => r.year === year);
  }
  
  if (subject) {
    filteredRecords = filteredRecords.filter(r => r.subject === subject);
  }
  
  if (search) {
    filteredRecords = filteredRecords.filter(r => 
      r.name.toLowerCase().includes(search) ||
      r.studentId.toLowerCase().includes(search)
    );
  }
  
  const tbody = document.querySelector('#detailsTable tbody');
  tbody.innerHTML = '';
  
  filteredRecords.forEach(record => {
    const row = tbody.insertRow();
    row.innerHTML = `
      <td>${record.studentId}</td>
      <td>${record.name}</td>
      <td>${record.dept}</td>
      <td>${record.year}</td>
      <td>${record.email}</td>
      <td>${record.phone}</td>
      <td>${record.date}</td>
      <td><span class="status-badge status-${record.status.toLowerCase()}">${record.status}</span></td>
      <td>${record.subject}</td>
    `;
  });
}

// Add event listeners for details filters
document.getElementById('detailsDept').addEventListener('change', updateDetailsSubjectOptions);
document.getElementById('detailsYear').addEventListener('change', updateDetailsSubjectOptions);

// REPORTS
function loadTodaySummary() {
  const today = new Date().toISOString().split('T')[0];
  const todayRecords = attendanceRecords.filter(r => r.date === today);
  
  const present = todayRecords.filter(r => r.status === 'Present').length;
  const absent = todayRecords.filter(r => r.status === 'Absent').length;
  const total = present + absent;
  
  document.getElementById('todaySummary').innerHTML = `
    <h3>Today's Summary (${today})</h3>
    <div class="summary-stats">
      <div class="summary-stat">
        <div class="stat-number">${present}</div>
        <div class="stat-label">Present</div>
      </div>
      <div class="summary-stat">
        <div class="stat-number">${absent}</div>
        <div class="stat-label">Absent</div>
      </div>
      <div class="summary-stat">
        <div class="stat-number">${total}</div>
        <div class="stat-label">Total</div>
      </div>
    </div>
  `;
}

function loadDailyReport() {
  const date = document.getElementById('dailyDateFilter').value || new Date().toISOString().split('T')[0];
  const dept = document.getElementById('dailyDept').value;
  const year = document.getElementById('dailyYear').value;
  const subject = document.getElementById('dailySubject').value;
  
  // CHECK IF ATTENDANCE EXISTS FOR THIS CRITERIA
  let existsCheck = attendanceRecords.filter(r => r.date === date);
  if (dept) existsCheck = existsCheck.filter(r => r.dept === dept);
  if (year) existsCheck = existsCheck.filter(r => r.year === year);
  if (subject) existsCheck = existsCheck.filter(r => r.subject === subject);
  
  const tbody = document.querySelector('#dailyTable tbody');
  
  // SHOW WARNING IF NO ATTENDANCE FOUND
  if (existsCheck.length === 0) {
    let warningMsg = `⚠️ No attendance records found for `;
    if (dept) warningMsg += `${dept} department, `;
    if (year) warningMsg += `${year}, `;
    if (subject) warningMsg += `${subject}, `;
    warningMsg += `on ${date}. Please mark attendance first.`;
    
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:40px;">
      <i class="fas fa-exclamation-triangle" style="font-size:24px; color:#f59e0b;"></i><br>
      ${warningMsg}
    </td></tr>`;
    return;
  }
  
  // NORMAL REPORT GENERATION (only if attendance exists)
  let filtered = attendanceRecords.filter(r => r.date === date);
  if (dept) filtered = filtered.filter(r => r.dept === dept);
  if (year) filtered = filtered.filter(r => r.year === year);
  if (subject) filtered = filtered.filter(r => r.subject === subject);
  
  const summary = {};
  filtered.forEach(r => {
    const key = `${r.dept}-${r.year}-${r.subject}`;
    if (!summary[key]) {
      summary[key] = { present: 0, absent: 0, total: 0, dept: r.dept, year: r.year, subject: r.subject };
    }
    summary[key][r.status.toLowerCase()]++;
    summary[key].total++;
  });
  
  tbody.innerHTML = '';
  
  Object.values(summary).forEach(item => {
    const row = tbody.insertRow();
    row.innerHTML = `
      <td>${item.dept}</td>
      <td>${item.year}</td>
      <td>${item.subject}</td>
      <td>${item.present}</td>
      <td>${item.absent}</td>
      <td>${item.total}</td>
    `;
  });
}
function loadMonthlyReport() {
  const month = document.getElementById('monthlyMonth').value;
  const dept = document.getElementById('monthlyDept').value;
  const year = document.getElementById('monthlyYear').value;
  const subject = document.getElementById('monthlySubject').value;
  
  if (!month) {
    alert('Please select month');
    return;
  }
  
  const [yearNum, monthNum] = month.split('-');
  
  let filtered = attendanceRecords.filter(r => {
    const rDate = new Date(r.date);
    return rDate.getFullYear() == yearNum && (rDate.getMonth() + 1) == monthNum;
  });
  
  if (dept) filtered = filtered.filter(r => r.dept === dept);
  if (year) filtered = filtered.filter(r => r.year === year);
  if (subject) filtered = filtered.filter(r => r.subject === subject);
  
  // Group by student
  const studentSummary = {};
  filtered.forEach(r => {
    if (!studentSummary[r.studentId]) {
      studentSummary[r.studentId] = {
        name: r.name,
        present: 0,
        absent: 0,
        total: 0
      };
    }
    studentSummary[r.studentId][r.status.toLowerCase()]++;
    studentSummary[r.studentId].total++;
  });
  
  const tbody = document.querySelector('#monthlyTable tbody');
  tbody.innerHTML = '';
  
  let belowThreshold = [];
  
  Object.values(studentSummary).forEach(item => {
    const percentage = ((item.present / item.total) * 100).toFixed(1);
    const row = tbody.insertRow();
    row.innerHTML = `
      <td>${item.name}</td>
      <td>${item.present}</td>
      <td>${item.absent}</td>
      <td>${item.total}</td>
      <td>${percentage}%</td>
    `;
    
    if (percentage < 75) {
      belowThreshold.push({ name: item.name, percentage: percentage });
    }
  });
  
  // Notify if any students have below 75% attendance
  if (belowThreshold.length > 0) {
    const displayCount = Math.min(10, belowThreshold.length);
    const detailsList = belowThreshold.slice(0, displayCount).map(item => `<strong>${item.name}</strong>: <strong>${item.percentage}%</strong>`).join('<br>');
    const moreText = belowThreshold.length > displayCount ? `<br><em>and ${belowThreshold.length - displayCount} more students...</em>` : '';
    generateAlert('warning', `<strong>Monthly Report Alert (${month})</strong><br>Students Below 75% Attendance:<br>${detailsList}${moreText}`);
  } else if (Object.keys(studentSummary).length > 0) {
    generateAlert('success', `✓ Monthly Report Generated for ${month}\nAll students above 75% attendance`);
  }
}

// Update dynamic dropdowns for reports
document.getElementById('dailyDept').addEventListener('change', updateReportSubjects);
document.getElementById('monthlyDept').addEventListener('change', updateReportSubjects);
document.getElementById('dailyYear').addEventListener('change', updateReportSubjects);
document.getElementById('monthlyYear').addEventListener('change', updateReportSubjects);

function updateReportSubjects() {
  // Update daily report dropdowns
  const dailyDept = document.getElementById('dailyDept').value;
  const dailyYear = document.getElementById('dailyYear').value;
  const dailySubjectSelect = document.getElementById('dailySubject');
  
  dailySubjectSelect.innerHTML = '<option value="">All Subjects</option>';
  
  if (dailyDept && dailyYear && subjects[dailyDept] && subjects[dailyDept][dailyYear]) {
    subjects[dailyDept][dailyYear].forEach(sub => {
      const option = document.createElement('option');
      option.value = sub;
      option.textContent = sub;
      dailySubjectSelect.appendChild(option);
    });
  }
  
  // Update monthly report dropdowns
  const monthlyDept = document.getElementById('monthlyDept').value;
  const monthlyYear = document.getElementById('monthlyYear').value;
  const monthlySubjectSelect = document.getElementById('monthlySubject');
  
  monthlySubjectSelect.innerHTML = '<option value="">All Subjects</option>';
  
  if (monthlyDept && monthlyYear && subjects[monthlyDept] && subjects[monthlyDept][monthlyYear]) {
    subjects[monthlyDept][monthlyYear].forEach(sub => {
      const option = document.createElement('option');
      option.value = sub;
      option.textContent = sub;
      monthlySubjectSelect.appendChild(option);
    });
  }
}

// Initial load
loadDetails();
loadTodaySummary();
// Check missing attendance for all departments/years/subjects
function checkMissingAttendanceForToday() {
  const today = new Date().toISOString().split('T')[0];
  const allMissing = [];
  
  const depts = ['BCA', 'BBA', 'BSc', 'BCom', 'BA'];
  const years = ['1st year', '2nd year', '3rd year'];
  
  depts.forEach(dept => {
    years.forEach(year => {
      if (subjects[dept] && subjects[dept][year]) {
        subjects[dept][year].forEach(subject => {
          const hasAttendance = attendanceRecords.some(r => 
            r.date === today && 
            r.dept === dept && 
            r.year === year && 
            r.subject === subject
          );
          
          if (!hasAttendance) {
            allMissing.push(`${dept} ${year} - ${subject}`);
          }
        });
      }
    });
  });
  
  if (allMissing.length > 0) {
    const missingMsg = `⚠️ Still pending attendance:\n${allMissing.slice(0, 10).join('\n')}${allMissing.length > 10 ? `\n... and ${allMissing.length - 10} more` : ''}`;
    generateAlert('warning', missingMsg);
  } else {
    generateAlert('success', '🎉 All departments have marked attendance for today!');
  }
}


				
				