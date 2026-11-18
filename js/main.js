/* Los Secretos del Arocena · lógica de la landing
   - Menú y botón fijo (RF7)
   - Reserva en 3 pasos con cupo, total y confirmación (RF1–RF4)
   - Formulario de escuelas y eventos (RF5)
   - WhatsApp (RF6)

   ⚙️ CONFIGURACIÓN: llena estos datos antes de publicar. */
const ENV = window.ENV || {};
const CONFIG = {
  // Supabase: vienen de las variables de entorno SUPABASE_URL y SUPABASE_ANON_KEY
  // (js/config.js se genera con build.mjs). Vacías = modo demo en este navegador.
  SUPABASE_URL: (ENV.SUPABASE_URL || '').replace(/\/$/, ''),
  SUPABASE_ANON_KEY: ENV.SUPABASE_ANON_KEY || '',
  // Número de WhatsApp con lada de país y sin espacios, ej. '52871XXXXXXX'.
  WHATSAPP: '',
  WHATSAPP_MSG: 'Hola, quiero información sobre Los Secretos del Arocena',
  INSTAGRAM: '#',
  FACEBOOK: '#',
  TIKTOK: '#',
  CAPACITY: 2,             // equipos por horario (PRD, sección 14)
  PRICE_DAY: 80,
  PRICE_NIGHT: 100,
};

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const money = n => '$' + n.toLocaleString('es-MX');

/* ---------- Menú hamburguesa ---------- */
const toggle = $('.nav__toggle');
const menu = $('#menu');
toggle.addEventListener('click', () => {
  const open = toggle.getAttribute('aria-expanded') === 'true';
  toggle.setAttribute('aria-expanded', String(!open));
  toggle.setAttribute('aria-label', open ? 'Abrir menú' : 'Cerrar menú');
  menu.classList.toggle('is-open', !open);
});
$$('a', menu).forEach(a => a.addEventListener('click', () => {
  toggle.setAttribute('aria-expanded', 'false');
  menu.classList.remove('is-open');
}));

/* ---------- Botón fijo: se oculta cuando ya estás en la reserva ---------- */
const sticky = $('#sticky-cta');
const hideStickyOn = [$('.hero'), $('#horarios'), $('.footer')];
const visible = new Set();
const io = new IntersectionObserver(entries => {
  entries.forEach(e => e.isIntersecting ? visible.add(e.target) : visible.delete(e.target));
  sticky.classList.toggle('is-hidden', visible.size > 0);
}, { threshold: 0.15 });
hideStickyOn.forEach(el => io.observe(el));

/* ---------- Enlaces externos ---------- */
$('#wa-btn').href = (CONFIG.WHATSAPP ? `https://wa.me/${CONFIG.WHATSAPP}` : 'https://wa.me/') +
  '?text=' + encodeURIComponent(CONFIG.WHATSAPP_MSG);
$('#ig').href = CONFIG.INSTAGRAM;
$('#fb').href = CONFIG.FACEBOOK;
$('#tt').href = CONFIG.TIKTOK;

/* ---------- Aviso de privacidad ---------- */
const privacy = $('#privacy');
$$('[data-open-privacy]').forEach(a => a.addEventListener('click', e => {
  e.preventDefault();
  privacy.showModal();
}));

/* ---------- Horarios del próximo fin de semana ---------- */
function upcomingFriday() {
  const d = new Date(); d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0 dom … 6 sáb
  const offset = day === 6 ? -1 : day === 0 ? -2 : 5 - day;
  d.setDate(d.getDate() + offset);
  return d;
}
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const fmtDate = d => d.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });

const fri = upcomingFriday();
const SLOTS = [
  { date: fri,             time: '6:00 a 8:00 pm',   mode: 'day' },
  { date: addDays(fri, 1), time: '11:00 am a 1:00 pm', mode: 'day' },
  { date: addDays(fri, 1), time: '8:00 a 10:00 pm',  mode: 'night' },
  { date: addDays(fri, 2), time: '11:00 am a 1:00 pm', mode: 'day' },
].map(s => ({ ...s, id: `${iso(s.date)}_${s.mode}_${s.time.split(' ')[0]}` }));

/* ---------- Datos: Supabase o, en modo demo, este navegador ---------- */
const USE_DB = !!(CONFIG.SUPABASE_URL && CONFIG.SUPABASE_ANON_KEY);
const LS_KEY = 'lsda-reservas';
const localBookings = () => { try { return JSON.parse(localStorage.getItem(LS_KEY)) || []; } catch { return []; } };
const saveLocal = b => { try { localStorage.setItem(LS_KEY, JSON.stringify([...localBookings(), b])); } catch {} };

function db(path, body) {
  return fetch(`${CONFIG.SUPABASE_URL}/rest/v1/${path}`, {
    method: 'POST',
    headers: {
      apikey: CONFIG.SUPABASE_ANON_KEY,
      Authorization: `Bearer ${CONFIG.SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(body ?? {}),
  });
}

// { slotId: equiposReservados }
async function getCounts() {
  if (USE_DB) {
    try {
      const r = await db('rpc/slot_counts');
      if (r.ok) return (await r.json()).reduce((acc, row) => (acc[row.slot_id] = Number(row.equipos), acc), {});
    } catch {}
    return {};
  }
  return localBookings().reduce((acc, b) => (acc[b.slotId] = (acc[b.slotId] || 0) + 1, acc), {});
}

// Devuelve 'ok', 'lleno' o 'error'
async function saveBooking(b) {
  if (!USE_DB) { saveLocal(b); return 'ok'; }
  try {
    const r = await db('reservas', {
      code: b.code, slot_id: b.slotId, fecha: b.fecha, horario: b.horario, modalidad: b.modalidad,
      equipo: b.equipo, personas: b.personas, total: b.total,
      nombre: b.nombre, correo: b.correo, telefono: b.telefono,
    });
    if (r.ok) return 'ok';
    const err = await r.json().catch(() => ({}));
    return /HORARIO_LLENO/.test(err.message || '') ? 'lleno' : 'error';
  } catch { return 'error'; }
}

async function saveRequest(data) {
  if (!USE_DB) return true;
  try {
    const r = await db('solicitudes', {
      tipo: data.tipo, nombre: data.nombre, institucion: data.institucion,
      personas: Number(data.personas), fecha: data.fecha, correo: data.correo, telefono: data.telefono,
    });
    return r.ok;
  } catch { return false; }
}

/* ---------- Reserva en 3 pasos ---------- */
const state = { step: 1, slot: null };
const alertBox = $('#booking-alert');

function showAlert(msg) { alertBox.textContent = msg; alertBox.hidden = !msg; }

function goTo(step) {
  state.step = step;
  $$('.step').forEach(f => f.hidden = Number(f.dataset.step) !== step);
  $('#confirmation').hidden = step !== 4;
  $('.progress').hidden = step === 4;
  $$('.progress li').forEach((li, i) => {
    li.classList.toggle('is-active', i + 1 === step);
    li.classList.toggle('is-done', i + 1 < step);
  });
  if (step === 1) renderSlots();
  const target = step === 4 ? $('#confirmation') : $(`.step[data-step="${step}"] input, .step[data-step="${step}"] button`);
  target?.focus({ preventScroll: true });
  $('#booking').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function renderSlots() {
  const counts = await getCounts();
  const box = $('#slots');
  box.innerHTML = '';
  SLOTS.forEach(s => {
    const left = CONFIG.CAPACITY - (counts[s.id] || 0);
    const full = left <= 0;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'slot';
    btn.disabled = full;
    btn.innerHTML = `
      <span class="slot__day">${cap(fmtDate(s.date))}</span>
      <span class="slot__mode">${s.mode === 'night' ? 'De noche · $100' : 'De día · $80'}</span>
      <span class="slot__time">${s.time}</span>
      <span class="slot__left">${full ? 'Lleno' : `${left} ${left === 1 ? 'lugar' : 'lugares'}`}</span>`;
    btn.setAttribute('aria-label', `${fmtDate(s.date)}, ${s.time}, ${s.mode === 'night' ? 'de noche' : 'de día'}. ${full ? 'Lleno' : `Quedan ${left} lugares para equipos`}`);
    btn.addEventListener('click', () => {
      state.slot = s;
      showAlert('');
      $('#chosen-slot').textContent = `${cap(fmtDate(s.date))} · ${s.time} · ${s.mode === 'night' ? 'De noche' : 'De día'}`;
      updateTotal();
      goTo(2);
    });
    box.appendChild(btn);
  });
}
const cap = t => t.charAt(0).toUpperCase() + t.slice(1);

const price = () => state.slot?.mode === 'night' ? CONFIG.PRICE_NIGHT : CONFIG.PRICE_DAY;
const size = () => Number($('input[name="team-size"]:checked').value);
function updateTotal() {
  const t = size() * price();
  $('#total').textContent = money(t);
  $('#total-3').textContent = money(t);
  $('#total-detail').textContent = `(${size()} × ${money(price())})`;
}
$$('input[name="team-size"]').forEach(r => r.addEventListener('change', updateTotal));

/* Validación */
function setError(input, msg) {
  const field = input.closest('.field');
  field?.classList.toggle('has-error', !!msg);
  const err = field?.querySelector('.field__error');
  if (err) err.textContent = msg || '';
  input.setAttribute('aria-invalid', msg ? 'true' : 'false');
  return !msg;
}
const validEmail = v => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
const validPhone = v => v.replace(/\D/g, '').length >= 10;

$$('[data-back]').forEach(b => b.addEventListener('click', () => goTo(state.step - 1)));
$('.step[data-step="2"] [data-next]').addEventListener('click', () => {
  const name = $('#team-name');
  if (setError(name, name.value.trim() ? '' : 'Escribe el nombre de tu equipo.')) goTo(3);
  else name.focus();
});

$('#confirm').addEventListener('click', async () => {
  const name = $('#cap-name'), email = $('#cap-email'), phone = $('#cap-phone'), ok = $('#cap-privacy');
  const checks = [
    setError(name, name.value.trim() ? '' : 'Escribe tu nombre.'),
    setError(email, validEmail(email.value.trim()) ? '' : 'Escribe un correo válido.'),
    setError(phone, validPhone(phone.value) ? '' : 'Escribe un teléfono de 10 dígitos.'),
  ];
  $('#privacy-error').textContent = ok.checked ? '' : 'Debes aceptar el aviso de privacidad.';
  if (checks.includes(false) || !ok.checked) {
    $('.step[data-step="3"] [aria-invalid="true"]')?.focus();
    return;
  }

  const btn = $('#confirm');
  btn.disabled = true; btn.textContent = 'Confirmando…';

  // ¿Se llenó el horario mientras reservabas?
  const counts = await getCounts();
  if ((counts[state.slot.id] || 0) >= CONFIG.CAPACITY) {
    btn.disabled = false; btn.textContent = 'Confirmar reserva';
    showAlert('Este horario ya se llenó, elige otro.');
    goTo(1);
    return;
  }

  const booking = {
    code: 'ARO-' + Math.random().toString(36).slice(2, 7).toUpperCase(),
    slotId: state.slot.id,
    fecha: cap(fmtDate(state.slot.date)),
    horario: state.slot.time,
    modalidad: state.slot.mode === 'night' ? 'Noche' : 'Día',
    equipo: $('#team-name').value.trim(),
    personas: size(),
    total: size() * price(),
    nombre: name.value.trim(),
    correo: email.value.trim(),
    telefono: phone.value.trim(),
    creada: new Date().toISOString(),
  };

  const result = await saveBooking(booking);
  if (result !== 'ok') {
    btn.disabled = false; btn.textContent = 'Confirmar reserva';
    if (result === 'lleno') { showAlert('Este horario ya se llenó, elige otro.'); goTo(1); }
    else showAlert('No pudimos guardar tu reserva. Revisa tu conexión e inténtalo de nuevo, o escríbenos por WhatsApp.');
    return;
  }
  showAlert('');

  $('#c-code').textContent = booking.code;
  $('#c-team').textContent = `${booking.equipo} (${booking.personas} personas)`;
  $('#c-date').textContent = booking.fecha;
  $('#c-time').textContent = `${booking.horario} · ${booking.modalidad}`;
  $('#c-total').textContent = money(booking.total);
  $('#c-email').textContent = booking.correo;
  btn.disabled = false; btn.textContent = 'Confirmar reserva';
  goTo(4);
});

$('#new-booking').addEventListener('click', () => {
  $$('.step input[type="text"], .step input[type="email"], .step input[type="tel"]').forEach(i => i.value = '');
  $('#cap-privacy').checked = false;
  $('input[name="team-size"][value="4"]').checked = true;
  state.slot = null;
  goTo(1);
});

renderSlots();

/* ---------- Formulario de escuelas y eventos ---------- */
const gform = $('#group-form');
gform.fecha.min = iso(new Date());
gform.addEventListener('submit', async e => {
  e.preventDefault();
  const f = gform;
  const checks = [
    setError(f.tipo, f.tipo.value ? '' : 'Elige el tipo de solicitud.'),
    setError(f.nombre, f.nombre.value.trim() ? '' : 'Escribe tu nombre.'),
    setError(f.institucion, f.institucion.value.trim() ? '' : 'Escribe la institución o empresa.'),
    setError(f.personas, Number(f.personas.value) >= 4 ? '' : 'Mínimo 4 personas.'),
    setError(f.fecha, f.fecha.value ? '' : 'Elige una fecha.'),
    setError(f.correo, validEmail(f.correo.value.trim()) ? '' : 'Escribe un correo válido.'),
    setError(f.telefono, validPhone(f.telefono.value) ? '' : 'Escribe un teléfono de 10 dígitos.'),
  ];
  $('[data-for="privacidad"]').textContent = f.privacidad.checked ? '' : 'Debes aceptar el aviso de privacidad.';
  if (checks.includes(false) || !f.privacidad.checked) {
    $('[aria-invalid="true"]', f)?.focus();
    return;
  }
  const data = Object.fromEntries(new FormData(f));
  delete data.privacidad;
  const btn = f.querySelector('button[type="submit"]');
  btn.disabled = true;
  const saved = await saveRequest(data);
  btn.disabled = false;
  if (!saved) {
    $('#group-ok').hidden = false;
    $('#group-ok').textContent = 'No pudimos enviar tu solicitud. Inténtalo de nuevo o escríbenos por WhatsApp.';
    return;
  }
  $('#group-ok').textContent = '¡Gracias! Te contactaremos en 48 horas.';
  f.reset();
  $('#group-ok').hidden = false;
  $('#group-ok').focus?.();
});
