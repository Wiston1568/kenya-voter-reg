// success.js
const info = document.getElementById('info');
const link = document.getElementById('download');

const last = sessionStorage.getItem('lastRegistration');
if (!last) { info.textContent = 'No registration found.'; }
else {
  const obj = JSON.parse(last);
  // show a friendly, themed success block
  const container = document.createElement('div');
  container.className = 'success-block';
  container.innerHTML = `<h3>Registration complete</h3><p><strong>Voter number:</strong> ${obj.voter_reg_no}</p>`;

  // PDF download
  if (obj.pdf_base64) {
    const byteChars = atob(obj.pdf_base64);
    const bytes = new Uint8Array(byteChars.length);
    for (let i=0;i<byteChars.length;i++) bytes[i]=byteChars.charCodeAt(i);
    const blob = new Blob([bytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `voter_${obj.voter_reg_no}.pdf`; a.textContent = 'Download your voter card (PDF)';
    a.className = 'button';
    container.appendChild(a);
  }

  // QR image if available
  if (obj.qr_data_url) {
    const img = document.createElement('img');
    img.src = obj.qr_data_url;
    img.alt = 'Voter QR Code';
    img.style.width = '160px';
    img.style.height = '160px';
    img.style.display = 'block';
    img.style.marginTop = '12px';
    container.appendChild(img);
  }

  info.innerHTML = '';
  info.appendChild(container);
}
