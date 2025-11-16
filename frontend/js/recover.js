// recover.js
const form = document.getElementById('recover-form');
const msg = document.getElementById('rmsg');
const rdownload = document.getElementById('rdownload');

form.addEventListener('submit', async (e) => {
  e.preventDefault(); msg.textContent=''; rdownload.style.display='none';
  const id = document.getElementById('rid').value.trim();
  const API_BASE = window.location.hostname === 'localhost'
    ? 'http://localhost:4000'
    : `${window.location.protocol}//${window.location.host}`;
  try {
    // simple approach: search by kenyan_id via /voter/list requires auth; but we have /lookup/:regno only
    // We'll call an ad-hoc endpoint: /voter/by-id?kenyan_id=...
    const res = await fetch(`${API_BASE}/voter/by-id?kenyan_id=${encodeURIComponent(id)}`);
    const data = await res.json();
    if (res.ok && data.record) {
      msg.textContent = `Found record: ${data.record.voter_reg_no}`;
      const pdfRes = await fetch(`${API_BASE}/pdf/${data.record.voter_reg_no}`, { headers: {} });
      const blob = await pdfRes.blob();
      rdownload.href = URL.createObjectURL(blob);
      rdownload.download = `voter_${data.record.voter_reg_no}.pdf`;
      rdownload.textContent = 'Download Voter Card';
      rdownload.style.display = 'inline-block';
    } else {
      msg.textContent = data.error || 'Not found';
    }
  } catch (err) { msg.textContent = 'Server error'; }
});
