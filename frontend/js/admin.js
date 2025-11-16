const API_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:4000'
  : `${window.location.protocol}//${window.location.host}`;
let currentUser = null;
let scannerActive = false;
let scannedVoters = new Set();

// Initialize
async function init() {
  const token = localStorage.getItem('adminToken');
  if (!token) {
    window.location.href = 'admin_login.html';
    return;
  }
  
  await loadProfile();
  await fetchStats();
  setInterval(fetchStats, 5000);
  await loadVoters();
  // poll for new voters so admin sees registrations immediately
  setInterval(loadVoters, 5000);
  setupEventListeners();
  checkSuperadminAccess();
}

async function loadProfile() {
  try {
    const res = await fetch(`${API_URL}/admin/my-profile`, {
      headers: { 'x-admin-token': localStorage.getItem('adminToken') }
    });
    if (!res.ok) throw new Error('Failed to load profile');
    currentUser = await res.json();
    document.getElementById('profile-name').textContent = currentUser.username;
    if (currentUser.profile_picture) {
      document.getElementById('profile-pic').src = currentUser.profile_picture;
    }
  } catch (err) {
    console.error(err);
  }
}

function setupEventListeners() {
  document.getElementById('profile-pic').addEventListener('click', () => {
    const dropdown = document.getElementById('profile-dropdown');
    dropdown.classList.toggle('active');
  });
  
  document.addEventListener('click', (e) => {
    const profileMenu = document.querySelector('.profile-menu');
    if (!profileMenu.contains(e.target)) {
      document.getElementById('profile-dropdown').classList.remove('active');
    }
  });
  
  document.getElementById('btn-logout').addEventListener('click', logout);
  document.getElementById('btn-scanner').addEventListener('click', () => openModal('modal-scanner'));
  document.getElementById('close-scanner').addEventListener('click', () => {
    stopScanner();
    closeModal('modal-scanner');
  });
  document.getElementById('btn-start-camera').addEventListener('click', startScanner);
  document.getElementById('btn-stop-camera').addEventListener('click', stopScanner);
  document.getElementById('btn-submit-reg-no').addEventListener('click', submitManualRegNo);
  
  document.getElementById('btn-settings').addEventListener('click', () => openSettings());
  document.getElementById('close-settings').addEventListener('click', () => closeModal('modal-settings'));
  
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const tabName = e.target.getAttribute('data-tab');
      switchTab(tabName);
    });
  });
  
  // Form for adding admin users (in settings)
  if (document.getElementById('form-add-admin-user')) {
    document.getElementById('form-add-admin-user').addEventListener('submit', addAdminUser);
  }
  
  // Toggle registration button (in manage users tab)
  const toggleBtn = document.getElementById('btn-toggle-registration');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => openModal('modal-toggle-registration'));
  }
  
  document.getElementById('close-toggle-registration').addEventListener('click', () => closeModal('modal-toggle-registration'));
  document.getElementById('confirm-toggle').addEventListener('click', toggleRegistration);
  
  document.getElementById('save-profile').addEventListener('click', saveProfile);
  
  document.getElementById('search-voter').addEventListener('input', (e) => searchVoters(e.target.value));
  document.getElementById('voters-search').addEventListener('input', (e) => searchSettingsVoters(e.target.value));
}

function openModal(id) {
  document.getElementById(id).classList.add('active');
}

function closeModal(id) {
  document.getElementById(id).classList.remove('active');
}

async function logout() {
  try {
    await fetch(`${API_URL}/admin/logout`, {
      method: 'POST',
      headers: { 'x-admin-token': localStorage.getItem('adminToken') }
    });
  } catch (err) {
    console.error(err);
  }
  localStorage.removeItem('adminToken');
  localStorage.removeItem('adminUser');
  window.location.href = 'admin_login.html';
}

async function fetchStats() {
  try {
    const res = await fetch(`${API_URL}/admin/stats`, {
      headers: { 'x-admin-token': localStorage.getItem('adminToken') }
    });
    if (!res.ok) return;
    const data = await res.json();
    document.getElementById('voter-count').textContent = data.voters;
  if (document.getElementById('live-count')) document.getElementById('live-count').textContent = data.online || 0;
    document.getElementById('superadmin-count').textContent = data.superadmin;
    document.getElementById('admin-count').textContent = data.admin;
    document.getElementById('superuser-count').textContent = data.superuser;
    document.getElementById('user-count').textContent = data.user;
  } catch (err) {
    console.error(err);
  }
}

async function loadVoters() {
  try {
    const res = await fetch(`${API_URL}/voter/list`, {
      headers: { 'x-admin-token': localStorage.getItem('adminToken') }
    });
    if (!res.ok) {
      console.warn('/voter/list returned', res.status, await res.text().catch(()=>''));
      return;
    }
    const data = await res.json();
    displayVoters(data.rows);
  } catch (err) {
    console.error(err);
  }
}

function displayVoters(voters) {
  const tbody = document.querySelector('#voter-table tbody');
  tbody.innerHTML = '';
  voters.forEach(voter => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${voter.first_name} ${voter.last_name}</td>
      <td>${voter.county}</td>
      <td>${voter.voter_reg_no}</td>
      <td>
        <button onclick="downloadPDF('${voter.voter_reg_no}')">PDF</button>
        <button onclick="deleteVoter('${voter.voter_reg_no}')">Delete</button>
      </td>
    `;
    tbody.appendChild(row);
  });
}

// delete voter (called from UI)
async function deleteVoter(regno) {
  if (!confirm('Delete voter ' + regno + '? This cannot be undone.')) return;
  try {
    const res = await fetch(`${API_URL}/voter/${encodeURIComponent(regno)}`, {
      method: 'DELETE',
      headers: { 'x-admin-token': localStorage.getItem('adminToken') }
    });
    const data = await res.json();
    if (res.ok) {
      alert('Deleted');
      await loadVoters();
    } else {
      alert('Error deleting voter: ' + (data.error || res.status));
    }
  } catch (err) { alert('Error: ' + err.message); }
}

function searchVoters(query) {
  const rows = document.querySelectorAll('#voter-table tbody tr');
  rows.forEach(row => {
    const text = row.textContent.toLowerCase();
    row.style.display = text.includes(query.toLowerCase()) ? '' : 'none';
  });
}

function searchSettingsVoters(query) {
  const rows = document.querySelectorAll('#settings-voters-table tbody tr');
  rows.forEach(row => {
    const text = row.textContent.toLowerCase();
    row.style.display = text.includes(query.toLowerCase()) ? '' : 'none';
  });
}

async function downloadPDF(regno) {
  try {
    const res = await fetch(`${API_URL}/pdf/${regno}`, {
      headers: { 'x-admin-token': localStorage.getItem('adminToken') }
    });
    if (!res.ok) throw new Error('Failed to download PDF');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `voter_${regno}.pdf`;
    a.click();
  } catch (err) {
    alert('Error downloading PDF: ' + err.message);
  }
}

async function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function addAdminUser(e) {
  e.preventDefault();
  const form = e.target;
  const formData = new FormData(form);
  const payload = {
    username: formData.get('username'),
    password: formData.get('password'),
    role: formData.get('role'),
    county: formData.get('county') || ''
  };
  
  if (formData.get('profile_picture') && formData.get('profile_picture').size > 0) {
    payload.profile_picture = await fileToBase64(formData.get('profile_picture'));
  }
  
  try {
    const res = await fetch(`${API_URL}/admin/add-user`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-token': localStorage.getItem('adminToken')
      },
      body: JSON.stringify(payload)
    });
    const result = await res.json();
  const msg = document.getElementById('admin-user-msg');
    if (res.ok) {
      msg.style.color = 'green';
      msg.textContent = 'Admin user added successfully';
      form.reset();
      await loadSettingsAdminUsers();
      setTimeout(() => {
        msg.textContent = '';
      }, 2000);
    } else {
      msg.style.color = 'red';
      msg.textContent = result.error || 'Error adding admin user';
    }
  } catch (err) {
  document.getElementById('admin-user-msg').textContent = 'Error: ' + err.message;
  }
}

async function toggleRegistration() {
  const pwd = document.getElementById('toggle-password').value;
  if (!pwd) {
    alert('Please enter your password');
    return;
  }
  
  try {
    const res = await fetch(`${API_URL}/admin/toggle-registration`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-token': localStorage.getItem('adminToken')
      },
      body: JSON.stringify({ password: pwd })
    });
    const result = await res.json();
    const msg = document.getElementById('toggle-msg');
    if (res.ok) {
      msg.style.color = 'green';
      msg.textContent = `Registration is now ${result.open ? 'OPEN' : 'CLOSED'}`;
      document.getElementById('toggle-password').value = '';
      setTimeout(() => closeModal('modal-toggle-registration'), 2000);
    } else {
      msg.style.color = 'red';
      msg.textContent = result.error || 'Error';
    }
  } catch (err) {
    document.getElementById('toggle-msg').textContent = 'Error: ' + err.message;
  }
}

function checkSuperadminAccess() {
  const userRole = localStorage.getItem('user_role');
  const toggleRegSection = document.getElementById('toggle-registration-section');
  
  if (toggleRegSection) {
    if (userRole === 'superadmin') {
      toggleRegSection.style.display = 'block';
    } else {
      toggleRegSection.style.display = 'none';
    }
  }
}

async function openSettings() {
  const tabName = 'edit-profile';
  switchTab(tabName);
  await loadSettingsProfile();
  await loadSettingsAdminUsers();
  await loadManageUsers();
  checkSuperadminAccess();
  openModal('modal-settings');
}

async function loadSettingsProfile() {
  document.getElementById('setting-username').value = currentUser.username;
  document.getElementById('setting-password').value = '';
  if (currentUser.profile_picture) {
    document.getElementById('current-profile-pic').src = currentUser.profile_picture;
  }
}

async function loadSettingsAdminUsers() {
  try {
    const res = await fetch(`${API_URL}/admin/list-users`, {
      headers: { 'x-admin-token': localStorage.getItem('adminToken') }
    });
    if (!res.ok) return;
    const data = await res.json();
    const tbody = document.querySelector('#admin-users-table tbody');
    tbody.innerHTML = '';
    data.users.forEach(user => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${user.username}</td>
        <td>${user.role}</td>
        <td>${user.county || '-'}</td>
      `;
      tbody.appendChild(row);
    });
  } catch (err) {
    console.error(err);
  }
}

async function loadManageUsers() {
  try {
    const res = await fetch(`${API_URL}/admin/list-users`, {
      headers: { 'x-admin-token': localStorage.getItem('adminToken') }
    });
    if (!res.ok) return;
    const data = await res.json();
    const container = document.getElementById('manage-users-list');
    container.innerHTML = '';
    
    if (data.users.length === 0) {
      container.innerHTML = '<p>No subordinate users</p>';
      return;
    }
    
    data.users.forEach(user => {
      const item = document.createElement('div');
      item.className = 'manage-users-item';
      item.innerHTML = `
        <div>
          <strong>${user.username}</strong> 
          <span style="color: #666; font-size: 0.9em;">${user.role}</span>
          ${user.county ? '<span style="color: #999; font-size: 0.9em;">• ' + user.county + '</span>' : ''}
        </div>
        <div>
          <button onclick="resetUserPassword('${user.id}', '${user.username}')" class="btn-small">Reset Password</button>
          <button onclick="promoteUser('${user.id}', '${user.username}', '${user.role}')" class="btn-small">Promote</button>
          <button onclick="deleteAdminUser('${user.id}', '${user.username}')" class="btn-small btn-danger">Delete</button>
        </div>
      `;
      container.appendChild(item);
    });
  } catch (err) {
    console.error(err);
  }
}

async function resetUserPassword(userId, username) {
  const newPwd = prompt(`Enter new password for ${username}:`);
  if (!newPwd) return;
  
  try {
    const res = await fetch(`${API_URL}/admin/reset-password/${userId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-token': localStorage.getItem('adminToken')
      },
      body: JSON.stringify({ new_password: newPwd })
    });
    const result = await res.json();
    if (res.ok) {
      alert('Password reset successfully');
      await loadManageUsers();
    } else {
      alert('Error: ' + result.error);
    }
  } catch (err) {
    alert('Error: ' + err.message);
  }
}

async function deleteAdminUser(userId, username) {
  if (!confirm(`Delete admin user ${username}?`)) return;
  try {
    const res = await fetch(`${API_URL}/admin/delete-user/${userId}`, {
      method: 'DELETE',
      headers: { 'x-admin-token': localStorage.getItem('adminToken') }
    });
    const data = await res.json();
    if (res.ok) {
      alert('User deleted');
      await loadManageUsers();
    } else {
      alert('Error deleting user: ' + (data.error || res.status));
    }
  } catch (err) { alert('Error: ' + err.message); }
}

function switchTab(tabName) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
  document.getElementById(tabName).classList.add('active');
  event.target.classList.add('active');
}

async function saveProfile() {
  const payload = {};
  const username = document.getElementById('setting-username').value;
  const password = document.getElementById('setting-password').value;
  const profilePicFile = document.getElementById('setting-profile-pic').files[0];
  
  if (username) payload.username = username;
  if (password) payload.password = password;
  if (profilePicFile) payload.profile_picture = await fileToBase64(profilePicFile);
  
  try {
    const res = await fetch(`${API_URL}/admin/update-profile`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-token': localStorage.getItem('adminToken')
      },
      body: JSON.stringify(payload)
    });
    const result = await res.json();
    if (res.ok) {
      alert('Profile updated successfully');
      await loadProfile();
    } else {
      alert('Error: ' + result.error);
    }
  } catch (err) {
    alert('Error: ' + err.message);
  }
}

async function registerVoter(e) {
  e.preventDefault();
  const form = e.target;
  const formData = new FormData(form);
  
  const payload = {
    first_name: formData.get('first_name'),
    last_name: formData.get('last_name'),
    kenyan_id: formData.get('kenyan_id'),
    phone: formData.get('phone') || '',
    email: formData.get('email') || '',
    county: formData.get('county') || '',
    sub_county: formData.get('sub_county') || '',
    ward: formData.get('ward') || ''
  };
  
  const photoFile = formData.get('photo');
  
  try {
    // pre-check duplicate kenyan_id to avoid unnecessary upload
    if (payload.kenyan_id) {
      try {
        const chk = await fetch(`${API_URL}/voter/by-id?kenyan_id=${encodeURIComponent(payload.kenyan_id)}`);
        if (chk.ok) {
          const existing = await chk.json();
          const msg = document.getElementById('register-msg');
          msg.style.color = 'red';
          msg.textContent = 'Kenyan ID already registered: ' + existing.record.voter_reg_no;
          return;
        }
      } catch (e) { /* ignore check errors and continue */ }
    }
    let res;
    if (photoFile && photoFile.size > 0) {
      const multiForm = new FormData();
      Object.keys(payload).forEach(key => multiForm.append(key, payload[key]));
      multiForm.append('photo', photoFile);
      
      res = await fetch(`${API_URL}/register`, {
        method: 'POST',
        body: multiForm
      });
    } else {
      res = await fetch(`${API_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    }
    
    const result = await res.json();
    const msg = document.getElementById('register-msg');
    if (res.ok) {
      msg.style.color = 'green';
      msg.textContent = `Voter registered: ${result.record.voter_reg_no}`;
      form.reset();
      await loadSettingsVoters();
    } else {
      msg.style.color = 'red';
      if (res.status === 409) msg.textContent = (result.error || 'Duplicate') + ' — registration blocked.';
      else msg.textContent = result.error || 'Error registering voter';
    }
  } catch (err) {
    document.getElementById('register-msg').textContent = 'Error: ' + err.message;
  }
}

async function startScanner() {
  scannerActive = true;
  scannedVoters.clear();
  
  const video = document.getElementById('scanner-video');
  const canvas = document.getElementById('scanner-canvas');
  const resultDiv = document.getElementById('scanner-result');
  resultDiv.innerHTML = '<p>Starting camera...</p>';
  
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment' }
    });
    
    video.srcObject = stream;
    video.onloadedmetadata = () => {
      video.play();
      scanQRCode(canvas, video, resultDiv);
    };
    
    document.getElementById('btn-start-camera').style.display = 'none';
    document.getElementById('btn-stop-camera').style.display = 'block';
  } catch (err) {
    resultDiv.innerHTML = `<p style="color:red;">Camera error: ${err.message}</p>`;
  }
}

function stopScanner() {
  scannerActive = false;
  const video = document.getElementById('scanner-video');
  if (video.srcObject) {
    video.srcObject.getTracks().forEach(track => track.stop());
  }
  document.getElementById('btn-start-camera').style.display = 'block';
  document.getElementById('btn-stop-camera').style.display = 'none';
}

function scanQRCode(canvas, video, resultDiv) {
  if (!scannerActive) return;
  
  const context = canvas.getContext('2d');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  context.drawImage(video, 0, 0);
  
  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  const code = jsQR(imageData.data, imageData.width, imageData.height);
  
  if (code) {
    handleQRCode(code.data, resultDiv);
    stopScanner();
  } else {
    requestAnimationFrame(() => scanQRCode(canvas, video, resultDiv));
  }
}

async function handleQRCode(data, resultDiv) {
  const regno = data.trim();
  
  if (scannedVoters.has(regno)) {
    resultDiv.innerHTML = `<p style="color:orange;">Voter already scanned in this session</p>`;
    return;
  }
  
  try {
    const res = await fetch(`${API_URL}/scanner/lookup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ voter_reg_no: regno })
    });
    
    const result = await res.json();
    
    if (res.ok) {
      const markRes = await fetch(`${API_URL}/scanner/mark-voted`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voter_reg_no: regno })
      });
      
      if (markRes.ok) {
        scannedVoters.add(regno);
        resultDiv.innerHTML = `
          <div style="background:green;padding:10px;border-radius:5px;color:white;">
            <p><strong>✓ Voter Verified</strong></p>
            <p>Name: ${result.first_name} ${result.last_name}</p>
            <p>ID: ${result.kenyan_id}</p>
            <p>Status: Marked as voted</p>
          </div>
        `;
      }
    } else {
      resultDiv.innerHTML = `<div style="background:orange;padding:10px;border-radius:5px;color:white;"><p>${result.error}</p></div>`;
    }
  } catch (err) {
    resultDiv.innerHTML = `<p style="color:red;">Error: ${err.message}</p>`;
  }
}

async function submitManualRegNo() {
  const regno = document.getElementById('manual-reg-no').value.trim();
  if (!regno) {
    alert('Please enter registration number');
    return;
  }
  
  const resultDiv = document.getElementById('scanner-result');
  await handleQRCode(regno, resultDiv);
  document.getElementById('manual-reg-no').value = '';
}

document.addEventListener('DOMContentLoaded', init);
