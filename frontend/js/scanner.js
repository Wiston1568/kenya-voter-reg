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
let scanCanvas = null;
let scanContext = null;

async function startScanner() {
  const msg = document.getElementById("scan-result");

  try {
    video = document.getElementById("qr-video");

    // Preferred constraints: rear camera, higher resolution for better scanning
    const constraints = {
      audio: false,
      video: {
        facingMode: { ideal: "environment" },
        width: { ideal: 1280 },
        height: { ideal: 720 }
      }
    };

    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    video.srcObject = stream;
    video.setAttribute("playsinline", true);
    video.muted = true;
    video.style.display = "block";

    // Wait for video metadata so we have videoWidth/videoHeight
    await new Promise((resolve, reject) => {
      const onLoaded = () => {
        video.removeEventListener('loadedmetadata', onLoaded);
        resolve();
      };
      video.addEventListener('loadedmetadata', onLoaded);
      // fallback timeout
      setTimeout(resolve, 2000);
    });

    // create or resize scan canvas once
    if (!scanCanvas) {
      scanCanvas = document.createElement('canvas');
      scanContext = scanCanvas.getContext('2d');
    }

    // set scanning flag and start playing
    scanning = true;
    try { await video.play(); } catch (e) { /* ignore play errors */ }

    requestAnimationFrame(tick);
  } catch (err) {
    msg.textContent = "Camera access denied or not available.";
    msg.className = "error";
    msg.classList.add("show");
  }
}

// stop camera
function stopScanner() {
  if (video && video.srcObject) {
    try { video.srcObject.getTracks().forEach(t => t.stop()); } catch (e) {}
    video.style.display = "none";
    scanning = false;
  }
}

// continuous QR reading loop (reuses a single canvas to reduce GC)
let frameSkip = 0;
const FRAME_SKIP_RATE = 2; // process every 3rd frame for better performance

function tick() {
  if (!scanning) return;
  if (!video || video.readyState < 2) {
    requestAnimationFrame(tick);
    return;
  }

  // skip frames for better performance on slower devices
  frameSkip++;
  if (frameSkip % FRAME_SKIP_RATE !== 0) {
    requestAnimationFrame(tick);
    return;
  }

  // choose a processing width to balance speed and accuracy
  const procWidth = Math.min(video.videoWidth || video.clientWidth || 1280, 640);
  const scale = procWidth / (video.videoWidth || procWidth);
  const procHeight = Math.floor((video.videoHeight || (video.clientHeight || procWidth)) * scale);

  scanCanvas.width = procWidth;
  scanCanvas.height = procHeight;

  // draw scaled image to canvas with horizontal flip to match video display
  try {
    scanContext.save();
    // flip horizontally to match the CSS transform: scaleX(-1) on the video
    scanContext.translate(scanCanvas.width, 0);
    scanContext.scale(-1, 1);
    scanContext.drawImage(video, 0, 0, scanCanvas.width, scanCanvas.height);
    scanContext.restore();
    
    const imgData = scanContext.getImageData(0, 0, scanCanvas.width, scanCanvas.height);

    // try jsQR on the current frame
    const code = jsQR(imgData.data, imgData.width, imgData.height);
    if (code) {
      // stop scanning to avoid duplicates
      scanning = false;
      try { video.srcObject.getTracks().forEach(t => t.stop()); } catch (e) {}
      processQR(code.data);
      return;
    }
  } catch (e) {
    // ignore errors from getImageData on cross-origin or unsupported platforms
  }

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
