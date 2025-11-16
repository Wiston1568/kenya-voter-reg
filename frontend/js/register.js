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
  // button now just triggers the hidden camera input (handled by HTML onclick)
  // this is a fallback in case HTML onclick fails
  document.getElementById('photo-camera').click();
});

// handle camera capture
const photoCameraInput = document.getElementById('photo-camera');
if (photoCameraInput) {
  photoCameraInput.addEventListener('change', () => {
    const f = photoCameraInput.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => { 
      preview.src = reader.result; 
      preview.style.display='block'; 
      preview.dataset.photo=''; 
    };
    reader.readAsDataURL(f);
  });
}


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
