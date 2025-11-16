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

// List of all 47 Kenyan counties in order
const allCounties = [
  'Mombasa', 'Nairobi', 'Kiambu', 'Nakuru', 'Kisumu', 'Meru', 'Kwale', 'Lamu', 
  'Taita Taveta', 'Makueni', 'Kajiado', 'Narok', 'Bomet', 'Kericho', 'Siaya', 'Kisii', 
  'Homabay', 'Migori', 'Turkana', 'Samburu', 'Laikipia', 'Isiolo', 'Nyeri', 'Kirinyaga', 
  'Murang\'a', 'Embu', 'Tharaka Nithi', 'Elgeyo Marakwet', 'Nandi', 'Baringo', 'West Pokot', 
  'Uasin Gishu', 'Trans Nzoia', 'Bungoma', 'Busia', 'Vihiga', 'Kakamega'
];

async function loadRegions(){
  try {
    const res = await fetch(regionsUrl);
    regions = await res.json();
    // Populate counties in order
    allCounties.forEach(county => {
      if (regions[county]) {
        const opt = document.createElement('option');
        opt.value = county;
        opt.textContent = county;
        countyEl.appendChild(opt);
      }
    });
  } catch (err) {
    console.error('Failed to load regions:', err);
    // Fallback: still populate counties without data
    allCounties.forEach(county => {
      const opt = document.createElement('option');
      opt.value = county;
      opt.textContent = county;
      countyEl.appendChild(opt);
    });
  }
}

countyEl.addEventListener('change', () => {
  subEl.innerHTML = '<option value="">Select sub-county</option>';
  wardEl.innerHTML = '<option value="">Select ward</option>';
  const c = countyEl.value;
  if (!c || !regions[c]) return;
  Object.keys(regions[c]).forEach(sc => {
    const o = document.createElement('option');
    o.value = sc;
    o.textContent = sc;
    subEl.appendChild(o);
  });
});

subEl.addEventListener('change', () => {
  wardEl.innerHTML = '<option value="">Select ward</option>';
  const c = countyEl.value;
  const sc = subEl.value;
  if (!c || !sc || !regions[c] || !regions[c][sc]) return;
  regions[c][sc].forEach(w => {
    const o = document.createElement('option');
    o.value = w;
    o.textContent = w;
    wardEl.appendChild(o);
  });
});

// camera capture
useCameraBtn.addEventListener('click', async () => {
  document.getElementById('photo-camera').click();
});

// handle camera capture
const photoCameraInput = document.getElementById('photo-camera');
if (photoCameraInput) {
  photoCameraInput.addEventListener('change', () => {
    const f = photoCameraInput.files[0];
    if (!f) return;
    // copy camera file to main photo input
    const dt = new DataTransfer();
    dt.items.add(f);
    photoInput.files = dt.files;
    // show preview
    const reader = new FileReader();
    reader.onload = () => {
      preview.src = reader.result;
      preview.style.display = 'block';
    };
    reader.readAsDataURL(f);
  });
}

// preview file upload
photoInput.addEventListener('change', () => {
  const f = photoInput.files[0];
  if (!f) return;
  const reader = new FileReader();
  reader.onload = () => {
    preview.src = reader.result;
    preview.style.display = 'block';
    preview.dataset.photo = '';
  };
  reader.readAsDataURL(f);
});

// submit
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  msg.textContent = '';
  // client-side validation for kenyan id numeric only 2-12 digits
  const kenyanId = form.kenyan_id.value.trim();
  if (!/^\d{2,12}$/.test(kenyanId)) {
    msg.textContent = 'Kenyan ID must be numeric (2-12 digits).';
    msg.style.color = 'red';
    return;
  }
  // construct formdata for multipart
  const fd = new FormData(form);
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
        msg.style.color = 'red';
        msg.textContent = data.error || 'Registration failed';
      }
    }
  } catch (err) {
    msg.style.color = 'red';
    msg.textContent = 'Server error';
  }
});

loadRegions();
