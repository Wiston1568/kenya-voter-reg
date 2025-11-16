const API_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:4000'
  : `${window.location.protocol}//${window.location.host}`;

document.getElementById('recoverForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const kenyanId = document.getElementById('recover-kenyan-id').value.trim();
  const msg = document.getElementById('recover-msg');

  if (!kenyanId || !/^\d{2,12}$/.test(kenyanId)) {
    msg.style.color = 'red';
    msg.textContent = 'Please enter a valid Kenyan ID (2-12 digits)';
    return;
  }

  try {
    // First, lookup the voter by kenyan_id
    const res = await fetch(`${API_URL}/voter/by-id?kenyan_id=${encodeURIComponent(kenyanId)}`);
    if (!res.ok) {
      msg.style.color = 'red';
      msg.textContent = 'Voter not found. Please check your Kenyan ID and try again.';
      return;
    }

    const data = await res.json();
    const voterRegNo = data.record.voter_reg_no;

    // Download the PDF using the public endpoint
    try {
      const pdfRes = await fetch(`${API_URL}/pdf-public/${encodeURIComponent(voterRegNo)}`);
      if (!pdfRes.ok) {
        throw new Error('Failed to download PDF');
      }
      const blob = await pdfRes.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `voter_${voterRegNo}.pdf`;
      a.click();
      URL.revokeObjectURL(url);

      msg.style.color = '#4CAF50';
      msg.textContent = '✓ Voter card downloaded successfully!';
      document.getElementById('recoverForm').reset();
    } catch (err) {
      msg.style.color = 'red';
      msg.textContent = 'Error downloading voter card: ' + err.message;
    }
  } catch (err) {
    msg.style.color = 'red';
    msg.textContent = 'Error: ' + err.message;
  }
});
