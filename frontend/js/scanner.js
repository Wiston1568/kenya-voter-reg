// frontend/js/scanner.js
// handles scanning + fallback search

let video = null;
let scanning = false;

// fallback manual search handler
async function lookupManual() {
  const reg = document.getElementById("manual-reg").value.trim();
  const msg = document.getElementById("scan-result");
  const API_BASE = window.location.hostname === 'localhost'
    ? 'http://localhost:4000'
    : `${window.location.protocol}//${window.location.host}`;

  if (!reg) {
    msg.textContent = "Enter registration number";
    msg.className = "error";
    msg.classList.add("show");
    return;
  }

  const res = await fetch(`${API_BASE}/scanner/lookup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ voter_reg_no: reg })
  });

  const data = await res.json();

  if (data.error) {
    msg.textContent = data.error;
    msg.className = "error";
    msg.classList.add("show");
  } else {
    msg.textContent = `✔ Verified: ${data.first_name} ${data.last_name}`;
    msg.className = "success";
    msg.classList.add("show");

    // prevent re-voting
    markAsVoted(data.voter_reg_no);
  }
}

// mark user as voted
async function markAsVoted(regNo) {
  const API_BASE = window.location.hostname === 'localhost'
    ? 'http://localhost:4000'
    : `${window.location.protocol}//${window.location.host}`;
  await fetch(`${API_BASE}/scanner/mark-voted`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ voter_reg_no: regNo })
  });
}

// start camera for QR scanning
async function startScanner() {
  const msg = document.getElementById("scan-result");

  try {
    video = document.getElementById("qr-video");
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    video.srcObject = stream;
    video.setAttribute("playsinline", true);
    video.play();
    video.style.display = "block";
    scanning = true;

    tick();
  } catch (err) {
    msg.textContent = "Camera access denied.";
    msg.style.color = "red";
  }
}

// stop camera
function stopScanner() {
  if (video && video.srcObject) {
    video.srcObject.getTracks().forEach(t => t.stop());
    video.style.display = "none";
    scanning = false;
  }
}

// continuous QR reading loop
function tick() {
  if (!scanning) return;

  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  context.drawImage(video, 0, 0, canvas.width, canvas.height);

  try {
    const code = jsQR(
      context.getImageData(0, 0, canvas.width, canvas.height).data,
      canvas.width,
      canvas.height
    );

    if (code) {
      processQR(code.data);
    }
  } catch (e) {}

  requestAnimationFrame(tick);
}

// process QR result
async function processQR(raw) {
  const msg = document.getElementById("scan-result");
  const API_BASE = window.location.hostname === 'localhost'
    ? 'http://localhost:4000'
    : `${window.location.protocol}//${window.location.host}`;

  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    msg.textContent = "Invalid QR";
    msg.className = "error";
    msg.classList.add("show");
    return;
  }

  const res = await fetch(`${API_BASE}/scanner/lookup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ voter_reg_no: data.voter_reg_no })
  });

  const result = await res.json();

  if (result.error) {
    msg.textContent = result.error;
    msg.className = "error";
    msg.classList.add("show");
  } else {
    msg.textContent = `✔ Verified: ${result.first_name} ${result.last_name}`;
    msg.className = "success";
    msg.classList.add("show");

    markAsVoted(result.voter_reg_no);
  }
}

window.startScanner = startScanner;
window.lookupManual = lookupManual;
