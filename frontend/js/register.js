// register.js
const regionsUrl = window.location.hostname === 'localhost'
  ? 'http://localhost:4000/regions'
  : `${window.location.protocol}//${window.location.host}/regions`; // served by backend
const countyEl = document.getElementById('county');
const subEl = document.getElementById('sub_county');
const wardEl = document.getElementById('ward');
const form = document.getElementById('regForm');
const msg = document.getElementById('msg');
const photoInput = document.getElementById('photo');
const preview = document.getElementById('photo-preview');
const useCameraBtn = document.getElementById('use-camera');
let regions = {};

async function loadRegions(){
  const res = await fetch(regionsUrl);
  regions = await res.json();
  Object.keys(regions).forEach(c => {
    const opt = document.createElement('option'); opt.value=c; opt.textContent=c; countyEl.appendChild(opt);
  });
}
countyEl.addEventListener('change', () => {
  subEl.innerHTML = '<option value="">Select sub-county</option>'; wardEl.innerHTML = '<option value="">Select ward</option>';
  const c = countyEl.value; if(!c) return;
  Object.keys(regions[c]).forEach(sc => { const o=document.createElement('option'); o.value=sc; o.textContent=sc; subEl.appendChild(o); });
});
subEl.addEventListener('change', () => {
  wardEl.innerHTML = '<option value="">Select ward</option>';
  const c=countyEl.value, sc=subEl.value; if(!c||!sc) return;
  regions[c][sc].forEach(w => { const o=document.createElement('option'); o.value=w; o.textContent=w; wardEl.appendChild(o); });
});

// camera capture
useCameraBtn.addEventListener('click', async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    const video = document.createElement('video');
    video.autoplay = true;
    video.playsInline = true; // important for mobile (prevents fullscreen on iOS)
    video.muted = true; // avoid autoplay restrictions
    video.srcObject = stream;
    // build modal with an overlay and inner container; place capture button over video so it's always visible on mobile
    const modal = document.createElement('div');
    modal.style.position = 'fixed'; modal.style.left = 0; modal.style.top = 0; modal.style.right = 0; modal.style.bottom = 0;
    modal.style.display = 'flex'; modal.style.alignItems = 'center'; modal.style.justifyContent = 'center';
    modal.style.background = 'rgba(0,0,0,0.6)'; modal.style.zIndex = 9999; modal.style.padding = '12px';

    const inner = document.createElement('div');
    inner.style.position = 'relative'; inner.style.background = '#000'; inner.style.borderRadius = '8px'; inner.style.overflow = 'hidden';
    inner.style.maxWidth = '92vw'; inner.style.maxHeight = '80vh'; inner.style.display = 'flex'; inner.style.alignItems = 'center'; inner.style.justifyContent = 'center';
    // style video to fit inner box
    video.style.width = '100%'; video.style.height = '100%'; video.style.objectFit = 'cover';
    inner.appendChild(video);

    // controls container (overlayed at bottom center)
    const controls = document.createElement('div');
    controls.style.position = 'absolute'; controls.style.left = 0; controls.style.right = 0; controls.style.bottom = '12px';
    controls.style.display = 'flex'; controls.style.justifyContent = 'center'; controls.style.gap = '12px'; controls.style.zIndex = 3;

    const snapBtn = document.createElement('button'); snapBtn.textContent = 'Capture';
    snapBtn.style.padding = '10px 16px'; snapBtn.style.borderRadius = '6px'; snapBtn.style.border = 'none'; snapBtn.style.background = '#ff9500'; snapBtn.style.color = '#fff'; snapBtn.style.fontWeight = '700'; snapBtn.style.boxShadow = '0 6px 18px rgba(0,0,0,.3)';

    const cancelBtn = document.createElement('button'); cancelBtn.textContent = 'Cancel';
    cancelBtn.style.padding = '10px 12px'; cancelBtn.style.borderRadius = '6px'; cancelBtn.style.border = 'none'; cancelBtn.style.background = 'rgba(255,255,255,.85)'; cancelBtn.style.color = '#111'; cancelBtn.style.fontWeight = '600';

    controls.appendChild(snapBtn); controls.appendChild(cancelBtn);
    inner.appendChild(controls);

    modal.appendChild(inner); document.body.appendChild(modal);

    // ensure video plays (some browsers require play() call)
    try { await video.play(); } catch (e) { /* ignore */ }

    snapBtn.addEventListener('click', () => {
      const canvas = document.createElement('canvas'); canvas.width = video.videoWidth || video.clientWidth; canvas.height = video.videoHeight || video.clientHeight; canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
      preview.src = dataUrl; preview.style.display = 'block';
      // stop stream
      stream.getTracks().forEach(t => t.stop());
      document.body.removeChild(modal);
      // store data url in preview dataset
      preview.dataset.photo = dataUrl;
    });

    cancelBtn.addEventListener('click', () => {
      try { stream.getTracks().forEach(t => t.stop()); } catch (e) {}
      if (modal.parentNode) document.body.removeChild(modal);
    });
  } catch (err) {
    alert('Camera access failed.');
  }
});

// preview file upload
photoInput.addEventListener('change', () => {
  const f = photoInput.files[0];
  if (!f) return;
  const reader = new FileReader();
  reader.onload = () => { preview.src = reader.result; preview.style.display='block'; preview.dataset.photo=''; };
  reader.readAsDataURL(f);
});

// submit
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  msg.textContent = '';
  // client-side validation for kenyan id numeric only 2-12 digits
  const kenyanId = form.kenyan_id.value.trim();
  if (!/^\d{2,12}$/.test(kenyanId)) { msg.textContent='Kenyan ID must be numeric (2-12 digits).'; msg.style.color='red'; return; }
  // construct formdata for multipart
  const fd = new FormData(form);
  if (preview.dataset.photo) {
    // capture photo dataurl (camera)
    const blob = await (await fetch(preview.dataset.photo)).blob();
    fd.set('photo', blob, 'photo.jpg');
  }
  // else file input already included
  try {
    const res = await fetch(`${regionsUrl.replace('/regions', '/register')}`, { method: 'POST', body: fd });
    const data = await res.json();
    if (res.ok) {
      // redirect to success page with voter number via sessionStorage
      const payload = { voter_reg_no: data.record.voter_reg_no, pdf_base64: data.pdf_base64 };
      if (data.qr_data_url) payload.qr_data_url = data.qr_data_url;
      sessionStorage.setItem('lastRegistration', JSON.stringify(payload));
      window.location.href = 'success.html';
    } else {
      // specific handling for duplicate kenyan id
      if (res.status === 409) {
        msg.style.color = 'red';
        msg.innerHTML = (data.error || 'Kenyan ID already registered') + ' — if this is you, try <a href="recover.html">recovering your reg</a>.';
      } else {
        msg.style.color='red'; msg.textContent = data.error || 'Registration failed';
      }
    }
  } catch (err) {
    msg.style.color='red'; msg.textContent = 'Server error';
  }
});

loadRegions();
