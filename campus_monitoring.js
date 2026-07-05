// Campus Monitoring Module JS - CLEAN VERSION - Syntax Fixed
// Student View (Upload) loads FIRST - No more brace errors!

// Global state
let monitoringLogs = [];
let alerts = [];
let currentFilters = { dateFrom: '', dateTo: '', camera: '' };
const API_BASE = 'http://localhost:5000/api';
let cmsNotifications = JSON.parse(localStorage.getItem('cms_notifications')) || [];
let notifications = JSON.parse(localStorage.getItem('cms_notifications')) || [];

// Get filtered logs
function getFilteredLogs() {
  let filtered = monitoringLogs;
  if (currentFilters.dateFrom) {
    filtered = filtered.filter(log => log.timestamp >= currentFilters.dateFrom);
  }
  if (currentFilters.dateTo) {
    filtered = filtered.filter(log => log.timestamp <= currentFilters.dateTo);
  }
  if (currentFilters.camera) {
    filtered = filtered.filter(log => log.camera === currentFilters.camera);
  }
  return filtered;
}

// Get filtered alerts
function getFilteredAlerts() {
  let filtered = alerts.filter(a => a.status === 'Active');
  if (currentFilters.dateFrom) {
    filtered = filtered.filter(alert => alert.timestamp >= currentFilters.dateFrom);
  }
  if (currentFilters.dateTo) {
    filtered = filtered.filter(alert => alert.timestamp <= currentFilters.dateTo);
  }
  if (currentFilters.camera) {
    filtered = filtered.filter(alert => alert.details && alert.details.includes(currentFilters.camera));
  }
  return filtered;
}

// Fetch monitoring data from backend
async function loadMonitoringData() {
  try {
    const [logsRes, alertsRes] = await Promise.all([
      fetch(`${API_BASE}/monitoring-logs`),
      fetch(`${API_BASE}/monitoring-alerts`)
    ]);
    monitoringLogs = await logsRes.json();
    alerts = await alertsRes.json();
  } catch (e) {
    console.log('Backend not available, using localStorage fallback');
    const savedLogs = localStorage.getItem('cms_monitoring_logs');
    const savedAlerts = localStorage.getItem('cms_alerts');
    if (savedLogs) monitoringLogs = JSON.parse(savedLogs);
    if (savedAlerts) alerts = JSON.parse(savedAlerts);
  }
  renderLogsTable();
  renderAlertsTable();
  updateAnalytics();
}

// Save monitoring data to backend
async function saveMonitoringData() {
  localStorage.setItem('cms_monitoring_logs', JSON.stringify(monitoringLogs));
  localStorage.setItem('cms_alerts', JSON.stringify(alerts));
  
  // Sync to backend
  try {
    for (const log of monitoringLogs.slice(0, 20)) {
      await fetch(`${API_BASE}/monitoring-logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(log)
      });
    }
    for (const alert of alerts.slice(0, 20)) {
      await fetch(`${API_BASE}/monitoring-alerts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(alert)
      });
    }
  } catch (e) {
    console.log('Backend sync failed, saved to localStorage only');
  }
}



function applyFilters() {
  currentFilters.dateFrom = document.getElementById('dateFrom')?.value || '';
  currentFilters.dateTo = document.getElementById('dateTo')?.value || '';
  currentFilters.camera = document.getElementById('filterCamera')?.value || '';
  updateAnalytics();
}

function clearFilters() {
  currentFilters = { dateFrom: '', dateTo: '', camera: '' };
  ['dateFrom', 'dateTo', 'filterCamera'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  updateAnalytics();
}

function renderLogsTable() {
  const tbody = document.getElementById('logsTableBody');
  if (!tbody) return;
  const filtered = getFilteredLogs().slice(0, 10);
  tbody.innerHTML = filtered.length ? filtered.map(log => `
    <tr>
      <td>${log.timestamp}</td>
      <td>${log.camera}</td>
      
      <td>${log.students || 'None'}</td>
      <td><span class="status-badge status-${log.status.toLowerCase()}">${log.status}</span></td>
      <td><button class="action-btn" onclick="viewImage(${log.id})">👁️</button></td>
      <td><button class="delete-btn" onclick="deleteLog(${log.id})">🗑️</button></td>
    </tr>
  `).join('') : '<tr><td colspan="7" style="text-align:center;color:#666">No logs</td></tr>';
}

function renderAlertsTable() {
  const tbody = document.getElementById('alertsTableBody');
  if (!tbody) return;
  const filtered = getFilteredAlerts().slice(0, 10);
  
  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#888;padding:20px">No active alerts</td></tr>';
    return;
  }
  
  tbody.innerHTML = filtered.map(alert => {
    const severityColor = alert.severity === 'High' ? '#ef4444' : alert.severity === 'Medium' ? '#f59e0b' : '#10b981';
    return `
      <tr>
        <td>${alert.type || 'Alert'}</td>
        <td><span style="color:${severityColor};font-weight:600">${alert.severity || 'Unknown'}</span></td>
        <td>${alert.details || 'No details'}</td>
        <td>${alert.timestamp || 'N/A'}</td>
        <td><span style="color:${alert.status === 'Active' ? '#10b981' : '#999'}">${alert.status || 'Pending'}</span></td>
        <td><button class="btn-secondary" onclick="resolveAlert('${alert.id}')">✅ Resolve</button></td>
      </tr>
    `;
  }).join('');
}

function updateAnalytics() {
  renderLogsTable();
  renderAlertsTable();
  
}

function analyzeImage(e) {
  e.preventDefault();
  const camera = document.getElementById('cameraLocation')?.value;
  const fileInput = document.getElementById('imageUpload');
  const file = fileInput?.files[0];
  
  if (!camera || !file) {
    alert('Please select camera location and image!');
    return;
  }
  
  // Show loading
  const analysisDiv = document.getElementById('quickAnalysis');
  if (analysisDiv) {
    analysisDiv.innerHTML = '<div style="text-align:center;padding:20px;">⏳ Analyzing image with AI...</div>';
  }
  
  const formData = new FormData();
  formData.append('image', file);
  
  fetch(`${API_BASE}/analyze-image`, {
    method: 'POST',
    body: formData
  })
  .then(res => res.json())
  .then(data => {
    console.log('YOLO Detection Results:', data);
    
    if (data.error) {
      alert('❌ Error: ' + data.error);
      return;
    }
    
    const analysis = {
  activity: data.activity || 'normal activity',
  students: data.students || 'No students',
  movements: data.count || 0,
  anomaly: data.status !== 'Normal',
  status: data.status || 'Normal'
};
    const reader = new FileReader();
    reader.onload = function(e) {
      const imgData = e.target.result;
      const logId = Date.now();
      
      const newLog = {
        id: logId,
        timestamp: new Date().toLocaleString(),
        camera: camera,
        movements: analysis.movements,
        students: analysis.students,
        image: imgData,
        anomaly: analysis.anomaly,
        status: analysis.status
      };
      
      monitoringLogs.unshift(newLog);
      
      if (analysis.anomaly) {
        alerts.unshift({
          id: Date.now(),
          type: 'Suspicious Activity',
          severity: data.status === 'High Risk' ? 'High' : 'Medium',
          details: `${camera}: ${analysis.activity}`,
          timestamp: newLog.timestamp,
          status: 'Active',
          logId: newLog.id
        });
      }
      
      saveMonitoringData();
      showPreview(imgData, analysis);
      updateAnalytics();
      
      document.getElementById('uploadForm').reset();
      
      const notificationType = analysis.anomaly ? 'warning' : 'success';
      const notificationMsg = `📊 <strong>${camera}</strong><br>Activity: ${analysis.activity}<br>Status: <strong>${analysis.status}</strong>`;
      generateAlert(notificationType, notificationMsg);
      
      console.log('✅ AI Analysis completed!');
    };
    reader.readAsDataURL(file);
  })
  .catch(err => {
    console.error('Error:', err);
    alert('❌ Failed to analyze image. Make sure backend is running.');
    if (analysisDiv) {
      analysisDiv.innerHTML = '<div style="text-align:center;padding:20px;color:#ef4444;">❌ Error connecting to AI backend</div>';
    }
  });
}

function performFakeAnalysis(fileName) {
  const suspiciousKeywords = /talking|mobile|phone|copying|exam|cheating|chat|fight|violence|sitting/i;
  const lowerFile = fileName.toLowerCase();
  const isSuspicious = suspiciousKeywords.test(lowerFile);
  
  let activity = 'standing/waiting';
  let students = ['Normal student'];
  let status = 'Normal';
  
  // Detect specific activities from filename
  if (/sitting|sitt/.test(lowerFile)) {
    activity = 'sitting on ground/stairs';
    students = ['Student sitting'];
    status = 'Suspicious';
  } else if (/fight|violence|brawl|attack/i.test(lowerFile)) {
    activity = 'physical fighting/violence';
    students = ['Students fighting'];
    status = 'High Risk';
  } else if (/talking|chat|talk/i.test(lowerFile)) {
    activity = 'talking in groups';
    students = ['Group talking'];
    status = 'Suspicious';
  } else if (/mobile|phone/i.test(lowerFile)) {
    activity = 'using mobile phone';
    students = ['Using phone'];
    status = 'Suspicious';
  } else if (/cheating|copy/i.test(lowerFile)) {
    activity = 'cheating/copying';
    students = ['Cheating detected'];
    status = 'High Risk';
  } else {
    activity = 'normal activity';
    students = ['Campus student'];
    status = 'Normal';
  }
  
  const movements = status === 'High Risk' ? 15 + Math.floor(Math.random() * 5) : 
                   status === 'Suspicious' ? 8 + Math.floor(Math.random() * 5) : 2 + Math.floor(Math.random() * 3);
  const anomaly = status !== 'Normal';
  
  return { 
    activity, 
    students, 
    movements, 
    anomaly, 
    status 
  };
}

function showPreview(imgData, analysis) {
  const preview = document.getElementById('previewImg');
  const analysisDiv = document.getElementById('quickAnalysis');
  if (preview && analysisDiv) {
    preview.src = imgData;
    preview.style.display = 'block';
    analysisDiv.innerHTML = `
      <div><strong>Detected Activity:</strong> ${analysis.activity}</div>
      <div><strong>Students:</strong> ${analysis.students}</div>
      <div><strong>Status:</strong> <span class="status-badge status-${analysis.status.toLowerCase()}">${analysis.status}</span></div>
    `;
    document.getElementById('uploadPreview').style.display = 'block';
  }
}

// ===== NOTIFICATION SYSTEM =====


function generateAlert(type, message) {
  const notification = {
    id: Date.now(),
    type: type || 'info',
    message: message,
    timestamp: new Date().toLocaleString(),
    read: false
  };
  notifications.unshift(notification);
  saveNotifications();
  updateNotificationBadge();
  renderNotifications();
  
  // Also add to alerts table if it's a warning
  if (type === 'warning' || type === 'danger') {
    const alert = {
      id: Date.now(),
      type: 'Suspicious Activity',
      severity: type === 'danger' ? 'High' : 'Medium',
      details: message.replace(/<[^>]*>/g, ''), // Remove HTML tags
      timestamp: new Date().toLocaleString(),
      status: 'Active',
      logId: Date.now()
    };
    alerts.unshift(alert);
    saveMonitoringData();
    renderAlertsTable();
  }
}

function saveNotifications() {
  localStorage.setItem('cms_notifications', JSON.stringify(notifications));
}

function updateNotificationBadge() {
  const unread = notifications.filter(n => !n.read).length;
  const badge = document.getElementById('notificationBadge');
  if (badge) {
    badge.textContent = unread > 99 ? '99+' : unread;
    badge.style.display = unread > 0 ? 'flex' : 'none';
  }
}

function renderNotifications() {
  const list = document.getElementById('notificationsList');
  if (!list) return;
  
  if (notifications.length === 0) {
    list.innerHTML = '<li class="notification-item"><div style="text-align:center;color:#999;padding:20px;">No notifications</div></li>';
    return;
  }
  
  list.innerHTML = notifications.slice(0, 20).map(n => `
    <li class="notification-item ${n.read ? '' : 'unread'}">
      <div class="notification-message">${n.message}</div>
      <div class="notification-time">${n.timestamp}</div>
      <button class="delete-notification" onclick="deleteNotification(${n.id})">🗑️</button>
    </li>
  `).join('');
}

function deleteNotification(id) {
  notifications = notifications.filter(n => n.id !== id);
  saveNotifications();
  updateNotificationBadge();
  renderNotifications();
}

function markAllRead() {
  notifications.forEach(n => n.read = true);
  saveNotifications();
  updateNotificationBadge();
  renderNotifications();
}

function clearAllNotifications() {
  notifications = [];
  saveNotifications();
  updateNotificationBadge();
  renderNotifications();
}

function toggleNotifications() {
  const panel = document.getElementById('notificationsPanel');
  const backdrop = document.getElementById('notificationsBackdrop');
  if (panel) {
    panel.classList.toggle('open');
    if (backdrop) backdrop.classList.toggle('open');
    renderNotifications();
  }
}

function closeNotifications() {
  const panel = document.getElementById('notificationsPanel');
  const backdrop = document.getElementById('notificationsBackdrop');
  if (panel) panel.classList.remove('open');
  if (backdrop) backdrop.classList.remove('open');
}

function viewImage(logId) {
  const log = monitoringLogs.find(l => l.id === logId);
  if (log?.image) {
    const modalImg = document.getElementById('modalImg');
    const modalDetails = document.getElementById('modalDetails');
    const modal = document.getElementById('imageModal');
    if (modalImg && modalDetails && modal) {
      modalImg.src = log.image;
      modalDetails.innerHTML = `
        <strong>${log.camera}</strong><br>
        ${log.timestamp}<br>
        Status: <span class="status-badge status-${log.status.toLowerCase()}">${log.status}</span>
      `;
      modal.style.display = 'block';
    }
  }
}

function closeImageModal() {
  document.getElementById('imageModal').style.display = 'none';
}

function deleteLog(logId) {
  if (confirm('Delete log?')) {
    monitoringLogs = monitoringLogs.filter(l => l.id !== logId);
    saveMonitoringData();
    updateAnalytics();
    // Delete from backend
    fetch(`${API_BASE}/monitoring-logs/${logId}`, { method: 'DELETE' })
      .catch(e => console.log('Backend delete failed'));
  }
}

async function resolveAlert(alertId) {
  const alertIdx = alerts.findIndex(a => a.id == alertId);
  if (alertIdx > -1) {
    alerts[alertIdx].status = 'Resolved';
    saveMonitoringData();
    updateAnalytics();
    // Resolve in backend
    try {
      await fetch(`${API_BASE}/monitoring-alerts/${alertId}/resolve`, { method: 'POST' });
    } catch (e) {
      console.log('Backend resolve failed');
    }
  }
}

// Theme functions
function initTheme() {
  if (localStorage.getItem('cms_theme') === 'dark') {
    document.body.classList.add('dark-theme');
  }
  updateThemeIcon();
}

function toggleTheme() {
  document.body.classList.toggle('dark-theme');
  localStorage.setItem('cms_theme', document.body.classList.contains('dark-theme') ? 'dark' : 'light');
  updateThemeIcon();
}

function updateThemeIcon() {
  const btn = document.getElementById('themeToggle');
  if (btn) btn.textContent = document.body.classList.contains('dark-theme') ? '☀️' : '🌙';
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('collapsed');
}

// CRITICAL FIX: Force Student View (Upload) on EVERY load
document.addEventListener('DOMContentLoaded', function() {
  console.log('🎯 Campus Monitoring LOADED - Student View Mode');
  
  initTheme();
  
  // FORCE STUDENT VIEW - Remove ALL active classes first
  document.querySelectorAll('.nav-item.active, .tab-content.active').forEach(el => {
    el.classList.remove('active');
  });
  
  // Activate Student View (upload)
  const studentNav = document.querySelector('[data-tab="upload"]');
  const studentTab = document.getElementById('upload-tab');
  if (studentNav && studentTab) {
    studentNav.classList.add('active');
    studentTab.classList.add('active');
    console.log('✅ Student View activated by default!');
  }
  
  // Setup form
  const uploadForm = document.getElementById('uploadForm');
  if (uploadForm) uploadForm.addEventListener('submit', analyzeImage);
  
  loadMonitoringData();
  
  // Initial data render
  updateAnalytics();
  
  // Tab switching
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
      document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
      
      item.classList.add('active');
      const tabId = item.dataset.tab + '-tab';
      document.getElementById(tabId)?.classList.add('active');
      
      if (tabId === 'analytics-tab') {
        setTimeout(() => initCharts(), 100);
      }
    });
  });
  

});

function renderStaticCharts() {
  ['trendChart', 'alertsPie', 'cameraBar', 'statusDoughnut'].forEach(id => {
    const canvas = document.getElementById(id);
    if (canvas) canvas.style.display = 'none';
  });
}

