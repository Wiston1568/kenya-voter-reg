// main.js - handles the registration form
const API_BASE = window.location.hostname === 'localhost' 
  ? 'http://localhost:4000'
  : `${window.location.protocol}//${window.location.host}`;

document.getElementById('themeToggle').addEventListener('change', (e) => {
  if (e.target.checked) document.body.classList.add('light');
  else document.body.classList.remove('light');
});

const form = document.getElementById('regForm');
const resultDiv = document.getElementById('result');

form.addEventListener('submit', async (ev) => {
  ev.preventDefault();
  resultDiv.style.display = 'none';
  const data = {
    kenyan_id: document.getElementById('kenyan_id').value.trim(),
    phone: document.getElementById('phone').value.trim(),
    first_name: document.getElementById('first_name').value.trim(),
    last_name: document.getElementById('last_name').value.trim(),
    county: document.getElementById('county').value.trim(),
    sub_county: document.getElementById('sub_county').value.trim(),
    division: document.getElementById('division').value.trim(),
    ward: document.getElementById('ward').value.trim(),
    location: document.getElementById('location').value.trim()
  };

  if (!data.kenyan_id) {
    alert('Kenyan ID is required');
    return;
  }

  document.getElementById('submitBtn').disabled = true;
  document.getElementById('submitBtn').innerText = 'Registering...';

  try {
    const res = await fetch(`${API_BASE}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    if (!res.ok) {
      const err = await res.json().catch(()=>({ error: 'server error' }));
      alert(err.error || 'Registration failed');
      return;
    }

    const json = await res.json();
    // show result: reg no, qr preview (we'll display link to success page with base64 pdf)
    const rec = json.record;
    const pdfBase64 = json.pdf_base64;
    const downloadHref = `data:application/pdf;base64,${pdfBase64}`;

    resultDiv.style.display = 'block';
    resultDiv.innerHTML = `
      <strong>Success!</strong>
      <p>Voter Reg No: <b>${rec.voter_reg_no}</b></p>
      <p><a id="downloadPdf" href="${downloadHref}" download="voter_${rec.voter_reg_no}.pdf" class="button">Download ID (PDF)</a></p>
      <p class="small">Or <a href="success.html?reg=${encodeURIComponent(rec.voter_reg_no)}" target="_blank">open success page</a></p>
    `;
  } catch (err) {
    console.error(err);
    alert('Network error');
  } finally {
    document.getElementById('submitBtn').disabled = false;
    document.getElementById('submitBtn').innerText = 'Register';
  }
});
