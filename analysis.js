// Analysis Model JS - Enhanced from analytics.js
// Tab-specific chart loading, attractive gradients, drill-down ready
// Add these right after the existing variable declarations
let lowAttendanceDepartments = {};
let failingDeptNotifications = {};
let readNotifications = {};
let readFailureNotifications = {};
const LOW_ATTENDANCE_THRESHOLD = 75;
let charts = [];
let currentData = {
  attendance: [],
  prediction: [],
  marks: [],
  campus: []
};

const YEARS = ['1st year', '2nd year', '3rd year'];
const SUBJECTS = ['PST', 'Data Structure', 'DBMS', 'Java', 'ML', 'MAD', 'Financial Accounting', 'Physics', 'Chemistry', 'Math', 'History'];

// Depts from attendance module
const DEPTS = ['BCA', 'BCom', 'BBA', 'BSc', 'BA'];


document.addEventListener('DOMContentLoaded', function() {
  loadAllData();
  initTheme();
  initNotificationSystem();  // ✅ ADD THIS LINE
  
  
  // Initial active tab
  const activeNav = document.querySelector('.nav-item.active');
  if (activeNav) {
    switchModule(activeNav.dataset.tab);
  } else {
    switchModule('attendance');
  }
  
  // Tab listeners
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
      document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
      item.classList.add('active');
      switchModule(item.dataset.tab);
    });
  });
});



function getMockAttendance() {
  const mockData = [];
  const allSubjects = [];
  
  // Collect all subjects from all departments and years
  Object.values(attendanceSubjects).forEach(deptSubs => {
    Object.values(deptSubs).forEach(yearSubs => {
      allSubjects.push(...yearSubs);
    });
  });
  
  // Generate 500 attendance records
  for (let i = 0; i < 500; i++) {
    const dept = DEPTS[Math.floor(Math.random() * DEPTS.length)];
    const year = YEARS[Math.floor(Math.random() * YEARS.length)];
    const deptSubjects = attendanceSubjects[dept]?.[year] || [];
    const subject = deptSubjects.length > 0 ? deptSubjects[Math.floor(Math.random() * deptSubjects.length)] : 'General';
    
    mockData.push({
      studentId: `ST${1000 + i}`,
      date: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: Math.random() > 0.15 ? 'Present' : 'Absent',
      dept: dept,
      year: year,
      subject: subject,
      name: `Student ${i}`
    });
  }
  
  return mockData;
}

function getMockPrediction() {
  const predictions = [];
  for (let i = 0; i < 200; i++) {
    const dept = DEPTS[Math.floor(Math.random()*5)];
    const year = YEARS[Math.floor(Math.random()*3)];
    const deptSubjects = attendanceSubjects[dept]?.[year] || [];
    const subject = deptSubjects.length > 0 ? deptSubjects[Math.floor(Math.random() * deptSubjects.length)] : 'General';
    
    // FORCE more high and low performers
    let predictedGrade;
    const rand = Math.random();
    if (rand < 0.3) {
      // 30% High performers (75-100)
      predictedGrade = 75 + Math.random() * 25;
    } else if (rand < 0.6) {
      // 30% Low performers (20-35)
      predictedGrade = 20 + Math.random() * 15;
    } else {
      // 40% Medium (50-74)
      predictedGrade = 50 + Math.random() * 24;
    }
    
    predictions.push({
      studentId: `ST${1000 + i}`,
      studentName: `Student ${i}`,
      dept: dept,
      year: year,
      subject: subject,
      predictedGrade: Math.round(predictedGrade * 10) / 10,
      riskLevel: Math.random() * 100,
      passed: predictedGrade >= 40,
      date: new Date().toISOString().split('T')[0]
    });
  }
  return predictions;
}

function getMockCampus() {
  const cameras = ['Main Gate', 'Library', 'Cafeteria', 'Labs'];
  return Array.from({length: 100}, (_, i) => ({
    timestamp: new Date(Date.now() - Math.random()*30*24*60*60*1000).toISOString(),
    camera: cameras[Math.floor(Math.random()*4)],
    status: Math.random() > 0.8 ? 'Suspicious' : 'Normal',
    severity: ['Low','Medium','High'][Math.floor(Math.random()*3)]
  }));
}

function switchModule(module) {
  // Update active states
  document.querySelectorAll('.tab-btn, .nav-item[data-tab="'+module+'"]').forEach(btn => {
    btn.classList.add('active');
    btn.parentElement?.querySelectorAll('.tab-btn, .nav-item').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  });
  
  document.querySelectorAll('.tab-content').forEach(tab => { if (tab) tab.classList.remove('active'); });
  const targetTab = document.getElementById(module+'Tab'); if (targetTab) targetTab.classList.add('active');
  
  // Destroy old charts
  destroyCharts();
  setTimeout(() => {
    if (module === 'attendance') {
      loadAttendanceCharts();
    } else if (module === 'prediction') {
      loadPredictionChartsV2();
    } else if (module === 'campus') {
      loadCampusCharts();
    }
  }, 200);
}

// Prediction sub-tab switching (legacy - not used in current HTML)
function switchPredTab(tab) {
  // This function is kept for backward compatibility but not used in current UI
  console.log('switchPredTab called with tab:', tab);
  // Simply load prediction analytics
  destroyCharts();
  setTimeout(() => {
    loadPredictionChartsV2();
  }, 100);
}

// Simple marks table render
function renderMarksTable() {
  const tbody = document.getElementById('marksHistory');
  if (!tbody) return;
  tbody.innerHTML = `
    <tr><td>ST1001</td><td>John Doe</td><td>Math</td><td>36.5/40</td><td>2024-10-15</td></tr>
    <tr><td>ST1002</td><td>Jane Smith</td><td>Physics</td><td>32.0/40</td><td>2024-10-14</td></tr>
  `;
}

// Simple history table
function renderPredHistory() {
  const tbody = document.getElementById('predHistory');
  if (!tbody) return;
  tbody.innerHTML = `
    <tr><td>2024-10-15</td><td>John Doe</td><td>A (85%)</td></tr>
    <tr><td>2024-10-14</td><td>Jane Smith</td><td>B+ (78%)</td></tr>
  `;
}

// Placeholder predict
function predictPerformance() {
  document.getElementById('predResult').innerHTML = `
    <div class="pred-result">
      <div class="pred-grade" style="background: #10b981;">A</div>
      <div>Predicted Grade: <strong>85%</strong></div>
    </div>
  `;
}



function destroyCharts() {
  charts.forEach(chart => chart?.destroy());
  charts = [];
}

function updateHeroStats() {
  const totalAtt = currentData.attendance.length;
  const avgAtt = totalAtt ? Math.round(currentData.attendance.filter(r=>r.status==='Present').length/totalAtt*100) : 0;
  const topPerf = currentData.prediction.filter(p=>p.predictedGrade>=75).length;
  const alerts = currentData.campus.filter(c=>c.status==='Suspicious').length;
  
  document.getElementById('heroStats').innerHTML = `
    <div class="stat-card">
      <div class="stat-number">${totalAtt}</div><div class="stat-label">Attendance Records</div>
    </div>
    <div class="stat-card">
      <div class="stat-number">${avgAtt}%</div><div class="stat-label">Avg Attendance</div>
    </div>
    <div class="stat-card">
      <div class="stat-number">${topPerf}</div><div class="stat-label">Top Performers</div>
    </div>
    <div class="stat-card">
      <div class="stat-number">${alerts}</div><div class="stat-label">Campus Alerts</div>
    </div>
  `;
}

// Subject mapping by dept/year
const attendanceSubjects = {
  'BCA': {'1st year': ['PST', 'Data Structure'], '2nd year': ['DBMS', 'Java'], '3rd year': ['ML', 'MAD']},
  'BCom': {'1st year': ['Financial Accounting', 'Business Organization'], '2nd year': ['Cost Accounting', 'Company Law'], '3rd year': ['Auditing', 'Management Accounting']},
  'BA': {'1st year': ['History', 'Sociology'], '2nd year': ['Political Science', 'Sociology'], '3rd year': ['Indian Constitution', 'Public Administration']},
  'BBA': {'1st year': ['EVS', 'Business Communication'], '2nd year': ['Human Resources Management', 'Marketing Management'], '3rd year': ['Strategic Management', 'International Business']},
  'BSc': {'1st year': ['Physics', 'Chemistry'], '2nd year': ['Zoology', 'Biology'], '3rd year': ['Botany', 'Math']}
};

// ATTENDANCE CHARTS - With Filters
function loadAttendanceCharts() {
  console.log('Loading attendance charts...');
  // Initialize filters
  populateSubjectOptions();
  updateAttendanceCharts();
}

function populateSubjectOptions() {
  const deptSelect = document.getElementById('attendanceDept');
  const yearSelect = document.getElementById('attendanceYear');
  const subjectSelect = document.getElementById('attendanceSubject');
  
  const dept = deptSelect?.value || '';
  const year = yearSelect?.value || '';
  
  subjectSelect.innerHTML = '<option value="">All Subjects</option>';
  
  // If department is selected, show only its subjects
  if (dept) {
    let subjectsToShow = [];
    
    if (year && attendanceSubjects[dept] && attendanceSubjects[dept][year]) {
      // If year is also selected, show subjects for that specific year
      subjectsToShow = attendanceSubjects[dept][year];
    } else if (attendanceSubjects[dept]) {
      // If only department is selected, show all subjects for that department
      Object.values(attendanceSubjects[dept]).forEach(yearSubs => {
        subjectsToShow.push(...yearSubs);
      });
      // Remove duplicates
      subjectsToShow = [...new Set(subjectsToShow)];
    }
    
    subjectsToShow.forEach(subject => {
      const opt = document.createElement('option');
      opt.value = subject;
      opt.textContent = subject;
      subjectSelect.appendChild(opt);
    });
  }
}

function updateAttendanceCharts() {
  // Add event listeners to department and year selectors to update subjects
  document.getElementById('attendanceDept')?.addEventListener('change', populateSubjectOptions);
  document.getElementById('attendanceYear')?.addEventListener('change', populateSubjectOptions);
  
  destroyCharts();
  setTimeout(() => {
    renderAttendanceCharts();
  }, 100);
}

function resetAttendanceFilters() {
  document.getElementById('attendancePeriod').value = 'daily';
  document.getElementById('attendanceYear').value = '';
  document.getElementById('attendanceDept').value = '';
  document.getElementById('attendanceSubject').value = '';
  populateSubjectOptions();
  updateAttendanceCharts();
}

function renderAttendanceCharts() {
  const period = document.getElementById('attendancePeriod')?.value || 'daily';
  const year = document.getElementById('attendanceYear')?.value || '';
  const dept = document.getElementById('attendanceDept')?.value || '';
  const subject = document.getElementById('attendanceSubject')?.value || '';
  
  try {
    // Main attendance chart
    const ctxMain = document.getElementById('attendanceChart')?.getContext('2d');
    if (ctxMain) {
      const mainData = getFilteredAttendanceData(period, year, dept, subject);
      charts.push(new Chart(ctxMain, {
        type: 'bar',
        data: mainData,
        options: {
          responsive: true,
          maintainAspectRatio: true,
          aspectRatio: 1.6,
          scales: { 
            y: { 
              beginAtZero: true, 
              max: 100, 
              ticks: { stepSize: 10 },
              title: { display: true, text: 'Attendance %' }
            } 
          },
          plugins: { 
            legend: { position: 'bottom' },
            title: { display: true, text: `${period === 'daily' ? 'Daily' : 'Monthly'} Attendance - Overall` }
          }
        }
      }));
    }
    
    // Breakdown chart - Context dependent on filters
    const ctxBreakdown = document.getElementById('breakdownChart')?.getContext('2d');
    if (ctxBreakdown) {
      let breakdownData, chartType, breakdownTitle;
      
      if (dept && !subject) {
        breakdownData = getSubjectAttendanceData(period, year, dept);
        chartType = 'bar';
        breakdownTitle = `📚 Subject-wise Attendance - ${dept}`;
      } else if (dept && subject) {
        breakdownData = getFilteredAttendanceData(period, year, dept, subject);
        chartType = 'line';
        breakdownTitle = `📈 ${subject} Attendance Trend - ${dept}`;
      } else {
        breakdownData = getDeptAttendanceData(period, year, subject);
        chartType = 'doughnut';
        breakdownTitle = '🏢 Attendance by Department';
      }
      
      // Update title
      const titleEl = document.getElementById('breakdownTitle');
      if (titleEl) titleEl.textContent = breakdownTitle;
      
      const options = { 
        responsive: true,
        maintainAspectRatio: true,
        aspectRatio: 1.6,
        plugins: { 
          legend: { position: 'bottom' },
          title: { display: true, text: breakdownTitle }
        }
      };
      
      if (chartType === 'bar' || chartType === 'line') {
        options.scales = {
          y: { 
            beginAtZero: true, 
            max: 100,
            title: { display: true, text: 'Attendance %' }
          }
        };
      }
      
      charts.push(new Chart(ctxBreakdown, {
        type: chartType,
        data: breakdownData,
        options: options
      }));
    }
    
    // Comparison chart - Always show department comparison
    const ctxComparison = document.getElementById('comparisonChart')?.getContext('2d');
    if (ctxComparison) {
      const comparisonData = getComparisonChartData(period, year, dept, subject);
      const compTitleEl = document.getElementById('comparisonTitle');
      if (compTitleEl) compTitleEl.textContent = comparisonData.title;
      
      charts.push(new Chart(ctxComparison, {
        type: 'bar',
        data: comparisonData.data,
        options: {
          responsive: true,
          maintainAspectRatio: true,
          aspectRatio: 1.6,
          scales: {
            y: {
              beginAtZero: true,
              max: 100,
              title: { display: true, text: 'Attendance %' }
            }
          },
          plugins: {
            legend: { position: 'bottom' },
            title: { display: true, text: comparisonData.title }
          }
        }
      }));
    }
  } catch (error) {
    console.error('Error rendering attendance charts:', error);
  }
}

function getFilteredAttendanceData(period, year, dept, subject) {
  let filtered = currentData.attendance || [];
  
  if (year) filtered = filtered.filter(r => r.year === year);
  if (dept) filtered = filtered.filter(r => r.dept === dept);
  if (subject) filtered = filtered.filter(r => r.subject === subject);
  
  let labels = [], dataPoints = [];
  
  if (period === 'daily') {
    // Daily: Group by date
    const dateStats = {};
    filtered.forEach(r => {
      if (!dateStats[r.date]) dateStats[r.date] = { present: 0, total: 0 };
      dateStats[r.date].total++;
      if (r.status === 'Present') dateStats[r.date].present++;
    });
    
    labels = Object.keys(dateStats).sort().slice(-10); // Last 10 days
    dataPoints = labels.map(date => dateStats[date].total ? Math.round(dateStats[date].present / dateStats[date].total * 100) : 0);
  } else {
    // Monthly: Group by department
    const monthStats = {};
    DEPTS.forEach(d => monthStats[d] = { present: 0, total: 0 });
    
    filtered.forEach(r => {
      if (monthStats[r.dept]) {
        monthStats[r.dept].total++;
        if (r.status === 'Present') monthStats[r.dept].present++;
      }
    });
    
    labels = Object.keys(monthStats);
    dataPoints = labels.map(d => monthStats[d].total ? Math.round(monthStats[d].present / monthStats[d].total * 100) : 0);
  }
  
  return {
    labels: labels.length > 0 ? labels : ['No Data'],
    datasets: [{
      label: 'Attendance %',
      data: dataPoints.length > 0 ? dataPoints : [0],
      backgroundColor: '#10b981',
      borderColor: '#059669',
      borderWidth: 2
    }]
  };
}

function getDeptAttendanceData(period, year, subject) {
  let filtered = currentData.attendance || [];
  
  if (year) filtered = filtered.filter(r => r.year === year);
  if (subject) filtered = filtered.filter(r => r.subject === subject);
  
  const deptStats = {};
  DEPTS.forEach(d => deptStats[d] = { present: 0, total: 0 });
  
  filtered.forEach(r => {
    if (deptStats[r.dept]) {
      deptStats[r.dept].total++;
      if (r.status === 'Present') deptStats[r.dept].present++;
    }
  });
  
  const labels = Object.keys(deptStats);
  const dataPoints = labels.map(d => deptStats[d].total ? Math.round(deptStats[d].present / deptStats[d].total * 100) : 0);
  
  return {
    labels: labels,
    datasets: [{
      data: dataPoints,
      backgroundColor: ['#10b981', '#34d399', '#60a5fa', '#fbbf24', '#f97316'],
      borderColor: ['#059669', '#22c55e', '#3b82f6', '#eab308', '#dc2626'],
      borderWidth: 2
    }]
  };
}

function getSubjectAttendanceData(period, year, dept) {
  let filtered = currentData.attendance || [];
  
  if (year) filtered = filtered.filter(r => r.year === year);
  if (dept) filtered = filtered.filter(r => r.dept === dept);
  
  const subjectStats = {};
  
  filtered.forEach(r => {
    if (!subjectStats[r.subject]) subjectStats[r.subject] = { present: 0, total: 0 };
    subjectStats[r.subject].total++;
    if (r.status === 'Present') subjectStats[r.subject].present++;
  });
  
  const labels = Object.keys(subjectStats).slice(0, 10); // Top 10 subjects
  const dataPoints = labels.map(s => subjectStats[s].total ? Math.round(subjectStats[s].present / subjectStats[s].total * 100) : 0);
  
  return {
    labels: labels.length > 0 ? labels : ['No Data'],
    datasets: [{
      label: 'Attendance %',
      data: dataPoints.length > 0 ? dataPoints : [0],
      backgroundColor: '#06b6d4',
      borderColor: '#0891b2',
      borderWidth: 2
    }]
  };
}

function getComparisonChartData(period, year, dept, subject) {
  let filtered = currentData.attendance || [];
  
  if (year) filtered = filtered.filter(r => r.year === year);
  if (subject) filtered = filtered.filter(r => r.subject === subject);
  
  let title, labels, dataPoints;
  const colors = ['#10b981', '#34d399', '#60a5fa', '#fbbf24', '#f97316'];
  
  if (dept) {
    // If department is selected, compare subjects in that department
    const subjectStats = {};
    filtered.filter(r => r.dept === dept).forEach(r => {
      if (!subjectStats[r.subject]) subjectStats[r.subject] = { present: 0, total: 0 };
      subjectStats[r.subject].total++;
      if (r.status === 'Present') subjectStats[r.subject].present++;
    });
    labels = Object.keys(subjectStats).slice(0, 8);
    dataPoints = labels.map(s => subjectStats[s]?.total ? Math.round(subjectStats[s].present / subjectStats[s].total * 100) : 0);
    title = `📊 Subject Comparison - ${dept}`;
  } else {
    // If no department selected, compare all departments
    const deptStats = {};
    DEPTS.forEach(d => deptStats[d] = { present: 0, total: 0 });
    
    filtered.forEach(r => {
      if (deptStats[r.dept]) {
        deptStats[r.dept].total++;
        if (r.status === 'Present') deptStats[r.dept].present++;
      }
    });
    
    labels = DEPTS;
    dataPoints = labels.map(d => deptStats[d].total ? Math.round(deptStats[d].present / deptStats[d].total * 100) : 0);
    title = '📊 All Departments Comparison';
  }
  
  return {
    title: title,
    data: {
      labels: labels.length > 0 ? labels : ['No Data'],
      datasets: [{
        label: 'Attendance %',
        data: dataPoints.length > 0 ? dataPoints : [0],
        backgroundColor: colors.slice(0, labels.length),
        borderColor: colors.slice(0, labels.length).map(c => c.replace(/[0-9a-f]{2}$/i, (m) => '99')),
        borderWidth: 2
      }]
    }
  };
}

// Notification System
function initNotificationSystem() {
  // Load read notifications from localStorage
  readNotifications = JSON.parse(sessionStorage.getItem('analysisReadNotifications')) || {};
  readFailureNotifications = JSON.parse(sessionStorage.getItem('analysisReadFailureNotifications')) || {};
  updateNotifications();
  setInterval(updateNotifications, 5000);
}

function updateNotifications() {
  const period = document.getElementById('attendancePeriod')?.value || 'daily';
  const year = document.getElementById('attendanceYear')?.value || '';
  const dept = document.getElementById('attendanceDept')?.value || '';
  
  let filtered = currentData.attendance || [];
  if (year) filtered = filtered.filter(r => r.year === year);
  if (dept) filtered = filtered.filter(r => r.dept === dept);
  
  // Calculate attendance for each department
  lowAttendanceDepartments = {};
  const deptStats = {};
  DEPTS.forEach(d => deptStats[d] = { present: 0, total: 0 });
  
  filtered.forEach(r => {
    if (deptStats[r.dept]) {
      deptStats[r.dept].total++;
      if (r.status === 'Present') deptStats[r.dept].present++;
    }
  });
  
  // Check for low attendance
  Object.keys(deptStats).forEach(d => {
    const attendance = deptStats[d].total ? Math.round(deptStats[d].present / deptStats[d].total * 100) : 0;
    if (attendance < LOW_ATTENDANCE_THRESHOLD && attendance > 0) {
      lowAttendanceDepartments[d] = attendance;
    }
  });
  
  // Calculate failure rates for each department (prediction data)
  failingDeptNotifications = {};
  const predFiltered = currentData.prediction || [];
  const failStats = {};
  DEPTS.forEach(d => failStats[d] = { failing: 0, total: 0 });
  
  predFiltered.forEach(p => {
    if (failStats[p.dept]) {
      failStats[p.dept].total++;
      if (p.predictedGrade < 50) failStats[p.dept].failing++;
    }
  });
  
  // Check for high failure rates (>20% failing)
  Object.keys(failStats).forEach(d => {
    const failRate = failStats[d].total ? Math.round(failStats[d].failing / failStats[d].total * 100) : 0;
    if (failRate >= 20 && failRate > 0) {
      failingDeptNotifications[d] = failRate;
    }
  });
  
  // Update badge count (attendance + failure alerts)
  const activeAlerts = Object.keys(lowAttendanceDepartments).filter(d => !readNotifications[d]).length +
                       Object.keys(failingDeptNotifications).filter(d => !readFailureNotifications[d]).length;
  const badge = document.getElementById('notificationBadge');
  if (badge) {
    badge.textContent = activeAlerts;
    badge.style.display = activeAlerts > 0 ? 'flex' : 'none';
  }
  
  // Update notification list
  renderNotifications();
}

function renderNotifications() {
  const notifList = document.getElementById('notificationsList');
  
  if (!notifList) return;
  
  // Combine both attendance and failure notifications
  const attendanceAlerts = Object.entries(lowAttendanceDepartments)
    .filter(([dept]) => !readNotifications[dept])
    .map(([dept, value]) => ({ type: 'attendance', dept, value, icon: value < 50 ? '🔴' : '🟡' }));
  
  const failureAlerts = Object.entries(failingDeptNotifications)
    .filter(([dept]) => !readFailureNotifications[dept])
    .map(([dept, value]) => ({ type: 'failure', dept, value, icon: value >= 30 ? '🔴' : '🟡' }));
  
  const allNotifications = [...attendanceAlerts, ...failureAlerts]
    .sort((a, b) => b.value - a.value); // Sort by severity (highest first)
  
  if (allNotifications.length === 0) {
    notifList.innerHTML = '<div class="notification-item-empty">✅ No alerts! All departments performing well!</div>';
    return;
  }
  
  const html = allNotifications
    .map(notif => {
      const deptId = `notif-${notif.type}-${notif.dept}`;
      const message = notif.type === 'attendance' 
        ? `Attendance: ${notif.value}% (Below 75%)`
        : `Failure Rate: ${notif.value}% students failing`;
      const label = notif.type === 'attendance' ? 'Low Attendance' : 'High Failure Rate';
      
      return `
        <div class="notification-item ${notif.value < 50 ? 'critical' : 'warning'}" id="${deptId}">
          <div class="notification-icon">${notif.icon}</div>
          <div class="notification-content">
            <div class="notification-title">${notif.dept} - ${label}</div>
            <div class="notification-msg">${message}</div>
          </div>
          <div class="notification-actions">
            <button class="notif-btn mark-read" onclick="markAsRead('${notif.dept}', '${notif.type}')" title="Mark as read">✓</button>
            <button class="notif-btn delete-btn" onclick="deleteNotification('${notif.dept}', '${notif.type}')" title="Delete">✕</button>
          </div>
        </div>
      `;
    }).join('');
  
  notifList.innerHTML = html;
}

function markAsRead(dept, type = 'attendance') {
  if (type === 'failure') {
    readFailureNotifications[dept] = true;
    sessionStorage.setItem('analysisReadFailureNotifications', JSON.stringify(readFailureNotifications));
  } else {
    readNotifications[dept] = true;
    sessionStorage.setItem('analysisReadNotifications', JSON.stringify(readNotifications));
  }
  updateNotifications();
}
function markAllRead() {
  Object.keys(lowAttendanceDepartments).forEach(dept => {
    readNotifications[dept] = true;
  });
  Object.keys(failingDeptNotifications).forEach(dept => {
    readFailureNotifications[dept] = true;
  });
  sessionStorage.setItem('analysisReadNotifications', JSON.stringify(readNotifications));
  sessionStorage.setItem('analysisReadFailureNotifications', JSON.stringify(readFailureNotifications));
  updateNotifications();
}

function clearAllNotifications() {
  readNotifications = {};
  readFailureNotifications = {};
  sessionStorage.setItem('analysisReadNotifications', JSON.stringify(readNotifications));
  sessionStorage.setItem('analysisReadFailureNotifications', JSON.stringify(readFailureNotifications));
  updateNotifications();
}

function deleteNotification(dept, type = 'attendance') {
  if (type === 'failure') {
    readFailureNotifications[dept] = true;
    sessionStorage.setItem('analysisReadFailureNotifications', JSON.stringify(readFailureNotifications));
  } else {
    readNotifications[dept] = true;
    sessionStorage.setItem('analysisReadNotifications', JSON.stringify(readNotifications));
  }
  const itemId = `notif-${type}-${dept}`;
  const item = document.getElementById(itemId);
  if (item) {
    item.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => {
      item.remove();
      // Update badge count immediately
      updateNotifications();
    }, 300);
  }
}

function toggleNotifications() {
  const panel = document.getElementById('notificationsPanel');
  const backdrop = document.getElementById('notificationsBackdrop');
  
  if (panel.classList.contains('open')) {
    panel.classList.remove('open');
    backdrop.classList.remove('open');
  } else {
    panel.classList.add('open');
    backdrop.classList.add('open');
  }
}

function closeNotifications() {
  const panel = document.getElementById('notificationsPanel');
  const backdrop = document.getElementById('notificationsBackdrop');
  panel.classList.remove('open');
  backdrop.classList.remove('open');
}



function getMovementData() {
  return {
    labels: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],
    datasets: [{
      label: 'Movements',
      data: [120,150,180,140,200,90,110],
      borderColor: '#f97316',
      backgroundColor: 'rgba(249,115,22,0.1)',
      tension: 0.4,
      fill: true
    }]
  };
}

function getAlertData() {
  const sev = { Low:45, Medium:30, High:15 };
  return {
    labels: ['Low', 'Medium', 'High'],
    datasets: [{ data: [45,30,15], backgroundColor: ['#10b981','#f59e0b','#ef4444'] }]
  };
}

function getCameraData() {
  return {
    labels: ['Main Gate','Library','Cafeteria','Labs'],
    datasets: [{ label: 'Logs', data: [50,35,25,20], backgroundColor: '#3b82f6' }]
  };
}



// Theme
function toggleTheme() {
  document.body.classList.toggle('dark-theme');
  localStorage.setItem('analysis_theme', document.body.classList.contains('dark-theme') ? 'dark' : 'light');
}

function initTheme() {
  if (localStorage.getItem('analysis_theme') === 'dark') {
    document.body.classList.add('dark-theme');
  }
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('collapsed');
}

// Exports
function exportData(type) {
  const csv = 'Module,Metric,Value\nAttendance,Avg,85%\nPrediction,Top,42\nCampus,Alerts,25';
  const blob = new Blob([csv], {type: 'text/csv'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'analysis.csv';
  a.click();
}

function exportCharts() {
  charts.forEach((chart,i) => {
    const link = document.createElement('a');
    link.download = `analysis_chart_${i+1}.png`;
    link.href = chart.toBase64Image();
    link.click();
  });
}

// PREDICTION CHARTS - Enhanced with Failure Analysis V2
let failingSubjects = {};
let failingDepartments = {};
const FAILURE_THRESHOLD = 50;
const PREDICTION_YEAR_FIELD = 'year';

function loadPredictionChartsV2() {
  console.log('Loading prediction charts v2...');
  populatePredictionSubjects();
  updatePredictionCharts();
}


function populatePredictionSubjects() {
  const deptSelect = document.getElementById('predictionDept');
  const yearSelect = document.getElementById('predictionYear');
  const subjectSelect = document.getElementById('predictionSubject');
  
  const dept = deptSelect?.value || '';
  const year = yearSelect?.value || '';
  
  subjectSelect.innerHTML = '<option value="">All Subjects</option>';
  
  if (dept) {
    let subjectsToShow = [];
    if (year && attendanceSubjects[dept] && attendanceSubjects[dept][year]) {
      subjectsToShow = attendanceSubjects[dept][year];
    } else if (attendanceSubjects[dept]) {
      Object.values(attendanceSubjects[dept]).forEach(yearSubs => {
        subjectsToShow.push(...yearSubs);
      });
      subjectsToShow = [...new Set(subjectsToShow)];
    }
    subjectsToShow.forEach(subject => {
      const opt = document.createElement('option');
      opt.value = subject;
      opt.textContent = subject;
      subjectSelect.appendChild(opt);
    });
  }
}

function updatePredictionCharts() {
  document.getElementById('predictionDept')?.addEventListener('change', populatePredictionSubjects);
  document.getElementById('predictionYear')?.addEventListener('change', populatePredictionSubjects);
  destroyCharts();
  setTimeout(() => {
    renderPredictionCharts();
    updateFailureNotifications();
  }, 100);
}

function resetPredictionFilters() {
  document.getElementById('predictionYear').value = '';
  document.getElementById('predictionDept').value = '';
  document.getElementById('predictionSubject').value = '';
  populatePredictionSubjects();
  updatePredictionCharts();
}


function renderPredictionCharts() {
  const year = document.getElementById('predictionYear')?.value || '';
  const dept = document.getElementById('predictionDept')?.value || '';
  const subject = document.getElementById('predictionSubject')?.value || '';
  
  // Get filtered data
  let filtered = currentData.prediction || [];
  if (year) filtered = filtered.filter(p => p.year === year);
  if (dept) filtered = filtered.filter(p => p.dept === dept);
  if (subject) filtered = filtered.filter(p => p.subject === subject);
  
  console.log('Total students:', filtered.length);
  
  // HIGH PERFORMERS (>=75)
  const highPerf = filtered
    .filter(p => p.predictedGrade >= 75)
    .sort((a, b) => b.predictedGrade - a.predictedGrade)
    .slice(0, 10);
  
  // LOW PERFORMERS (<35)
  const lowPerf = filtered
    .filter(p => p.predictedGrade < 35)
    .sort((a, b) => a.predictedGrade - b.predictedGrade)
    .slice(0, 10);
  
  console.log('High performers:', highPerf.length);
  console.log('Low performers:', lowPerf.length);
  
  try {
    // Overview Chart
    const ctxOverview = document.getElementById('predOverviewChart')?.getContext('2d');
    if (ctxOverview && charts.length < 10) {
      const excellent = filtered.filter(p => p.predictedGrade >= 80).length;
      const good = filtered.filter(p => p.predictedGrade >= 60 && p.predictedGrade < 80).length;
      const avg = filtered.filter(p => p.predictedGrade >= 50 && p.predictedGrade < 60).length;
      const fail = filtered.filter(p => p.predictedGrade < 50).length;
      
      const overviewChart = new Chart(ctxOverview, {
        type: 'bar',
        data: {
          labels: ['Excellent', 'Good', 'Average', 'Fail'],
          datasets: [{
            label: 'Students',
            data: [excellent, good, avg, fail],
            backgroundColor: ['#10b981', '#60a5fa', '#fbbf24', '#ef4444']
          }]
        },
        options: { responsive: true, maintainAspectRatio: true }
      });
      charts.push(overviewChart);
    }
    
    // Failure Chart
    const ctxFailure = document.getElementById('failureAnalysisChart')?.getContext('2d');
    if (ctxFailure && charts.length < 10) {
      const failureData = {
        labels: dept ? ['Failing Students'] : DEPTS,
        datasets: [{
          label: 'Failing Students',
          data: dept ? [filtered.filter(p => p.predictedGrade < 50).length] : DEPTS.map(d => filtered.filter(p => p.dept === d && p.predictedGrade < 50).length),
          backgroundColor: '#ef4444'
        }]
      };
      
      const failureChart = new Chart(ctxFailure, {
        type: 'bar',
        data: failureData,
        options: { responsive: true, maintainAspectRatio: true }
      });
      charts.push(failureChart);
    }
    
    // HIGH PERFORMERS CHART
    // HIGH PERFORMERS CHART
const ctxHigh = document.getElementById('highPerformersChart')?.getContext('2d');
if (ctxHigh && highPerf.length > 0) {
  if (window.highChart) window.highChart.destroy();
  
  window.highChart = new Chart(ctxHigh, {
    type: 'bar',
    data: {
      labels: highPerf.map(s => s.studentName),
      datasets: [{
        label: 'Grade %',
        data: highPerf.map(s => s.predictedGrade),
        backgroundColor: '#22c55e'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      indexAxis: 'y',
      plugins: {
        tooltip: {
          callbacks: {
            label: function(context) {
              const student = highPerf[context.dataIndex];
              return [
                `${student.dept} - ${student.year}`,
                `Subject: ${student.subject}`,
                `Grade: ${student.predictedGrade}%`
              ];
            }
          }
        }
      },
      scales: {
        x: { title: { display: true, text: 'Predicted Grade (%)' } }
      }
    }
  });
  charts.push(window.highChart);
} 
    
    // LOW PERFORMERS CHART
    // LOW PERFORMERS CHART
const ctxLow = document.getElementById('lowPerformersChart')?.getContext('2d');
if (ctxLow && lowPerf.length > 0) {
  if (window.lowChart) window.lowChart.destroy();
  
  window.lowChart = new Chart(ctxLow, {
    type: 'bar',
    data: {
      labels: lowPerf.map(s => s.studentName),
      datasets: [{
        label: 'Grade %',
        data: lowPerf.map(s => s.predictedGrade),
        backgroundColor: '#ef4444'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      indexAxis: 'y',
      plugins: {
        tooltip: {
          callbacks: {
            label: function(context) {
              const student = lowPerf[context.dataIndex];
              return [
                `${student.dept} - ${student.year}`,
                `Subject: ${student.subject}`,
                `Grade: ${student.predictedGrade}%`
              ];
            }
          }
        }
      },
      scales: {
        x: { title: { display: true, text: 'Predicted Grade (%)' } }
      }
    }
  });
  charts.push(window.lowChart);
}
    
  } catch (error) {
    console.error('Chart error:', error);

// Update failure notifications
if (typeof updateFailureNotifications === 'function') {
  updateFailureNotifications();
}

  }
}

// Add this function near the top with other functions (around line 100)
function updateFailureNotifications() {
  // This function handles failure notifications
  console.log('Checking failure notifications...');
  const failingStudents = currentData.prediction.filter(p => p.predictedGrade < 50);
  console.log('Students failing (<50%):', failingStudents.length);
}


  // Prediction & marks - CONNECT TO REAL PREDICTION MODULE DATA

  // Campus logs
 
// ✅ FIXED: Load real data from backend API
async function loadAllData() {
  const API_BASE = 'http://localhost:5000/api';
  
  try {
    // Fetch from backend APIs
    const [attRes, marksRes, studentsRes] = await Promise.all([
      fetch(`${API_BASE}/attendance`),
      fetch(`${API_BASE}/marks`),
      fetch(`${API_BASE}/student-records`)
    ]);
    
    const attendanceData = await attRes.json();
    const marksData = await marksRes.json();
    const students = await studentsRes.json();
    
    // Set attendance data
    currentData.attendance = attendanceData;
    currentData.marks = marksData;
    
    console.log(`✅ Loaded ${attendanceData.length} attendance records from backend`);
    console.log(`✅ Loaded ${marksData.length} marks records from backend`);
    console.log(`✅ Loaded ${students.length} students from backend`);
    
    // Process prediction data from marks
    if (marksData.length > 0) {
      currentData.prediction = marksData.map(m => {
        const totalMarks = (m.internal1 || 0) + (m.internal2 || 0) + (m.seminar || 0) + (m.assignment || 0);
        const percentage = (totalMarks / 40) * 100;
        
        const student = students.find(s => String(s.id) === String(m.studentId));
        const studentName = student ? student.name : `Student ${m.studentId}`;
        
        return {
          studentId: m.studentId,
          studentName: studentName,
          dept: m.dept || 'BCA',
          year: m.year || student?.year || '1st year',
          subject: m.sub || 'General',
          predictedGrade: Math.round(percentage * 10) / 10,
          passed: percentage >= 40
        };
      });
      
      console.log(`✅ Processed ${currentData.prediction.length} prediction records`);
    } else {
      console.log("⚠️ No marks data found in backend");
      currentData.prediction = [];
    }
    
    // Campus logs (keep as is or fetch if endpoint exists)
    try {
      currentData.campus = JSON.parse(localStorage.getItem('cms_monitoring_logs')) || [];
    } catch(e) { 
      currentData.campus = []; 
    }
    
  } catch (error) {
    console.error('❌ Failed to load data from backend:', error);
    // Fallback to localStorage only if backend fails
    try {
      currentData.attendance = JSON.parse(localStorage.getItem('attendanceRecords')) || [];
      const marksDataRaw = JSON.parse(localStorage.getItem('marksData')) || [];
      // ... rest of fallback logic
    } catch(e) {
      currentData.attendance = [];
      currentData.prediction = [];
    }
  }
  
  updateHeroStats();
}
