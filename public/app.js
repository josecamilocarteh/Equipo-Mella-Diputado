import { upload } from '/blob-client.js';

/* =========================================================================
   Equipo Mella — app de organización del equipo
   ========================================================================= */

// ---------- Utilidades ----------
const $ = (s, el = document) => el.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
const pad = (n) => String(n).padStart(2, '0');
const store = {
  get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* sin almacenamiento */ } },
  del(k) { try { localStorage.removeItem(k); } catch { /* sin almacenamiento */ } }
};

const AREAS = { leg: 'Asesoría legislativa', pre: 'Prensa y audiovisual', ter: 'Territorio', gab: 'Jefatura de gabinete' };
const STATUS = [
  { k: 'pen', n: 'Pendiente' }, { k: 'cur', n: 'En curso' }, { k: 'rev', n: 'En revisión' }, { k: 'ok', n: 'Listo' }
];
const STATUS_N = Object.fromEntries(STATUS.map((s) => [s.k, s.n]));
const EVTYPES = { com: 'Comisión de Salud', sala: 'Sala', ter: 'Territorio', pre: 'Prensa', int: 'Equipo interno', otro: 'Otro' };
const DOCST = { bor: 'Borrador', rev: 'En revisión', fin: 'Final' };
const MEMST = ['Disponible', 'En comisión', 'En Sala', 'En terreno', 'En reunión', 'Ausente'];
const REMIND = { none: 'Sin recordatorio', d0: 'El mismo día a las 9:00', d1: '1 día antes', h2: '2 horas antes' };

// ---------- Fechas ----------
const toISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const todayISO = () => toISO(new Date());
const parseISO = (s) => new Date(`${s}T00:00:00`);
const addDays = (iso, n) => { const d = parseISO(iso); d.setDate(d.getDate() + n); return toISO(d); };
const mondayOf = (iso) => { const d = parseISO(iso); const w = (d.getDay() + 6) % 7; d.setDate(d.getDate() - w); return toISO(d); };
const daysBetween = (a, b) => Math.round((parseISO(b) - parseISO(a)) / 864e5);
const fDay = new Intl.DateTimeFormat('es-CL', { weekday: 'short', day: 'numeric', month: 'short' });
const fLong = new Intl.DateTimeFormat('es-CL', { weekday: 'long', day: 'numeric', month: 'long' });
const fShort = new Intl.DateTimeFormat('es-CL', { day: 'numeric', month: 'short' });
const fmtDay = (iso) => fDay.format(parseISO(iso)).replace(/\./g, '');
const fmtLong = (iso) => fLong.format(parseISO(iso));
const fmtShort = (iso) => fShort.format(parseISO(iso)).replace(/\./g, '');
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const nowISOts = () => new Date().toISOString();
function ago(ts) {
  const m = Math.round((Date.now() - new Date(ts)) / 60000);
  if (m < 1) return 'recién';
  if (m < 60) return `hace ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `hace ${h} h`;
  return fmtShort(toISO(new Date(ts)));
}

// ---------- Íconos ----------
const ICON = {
  home: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  tasks: '<rect x="3" y="3" width="18" height="18" rx="5"/><path d="m8 12 3 3 5-6"/>',
  cal: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  bell: '<path d="M6 16v-5a6 6 0 1 1 12 0v5l2 2H4z"/><path d="M10 21h4"/>',
  upload: '<path d="M12 16V4M7 9l5-5 5 5M4 20h16"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  chevL: '<path d="m15 6-6 6 6 6"/>',
  chevR: '<path d="m9 6 6 6-6 6"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/>',
  open: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
  clip: '<path d="m21 11-8.5 8.5a5 5 0 0 1-7-7L14 4a3.5 3.5 0 0 1 5 5l-8.5 8.5a2 2 0 0 1-3-3L15 7"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  check: '<path d="m5 12 5 5 9-10"/>',
  phone: '<rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/>'
};
const ic = (n, s = 18) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[n]}</svg>`;

// ---------- Estado ----------
const S = {
  code: store.get('em.code'),
  meId: store.get('em.me'),
  data: store.get('em.cache'),
  view: store.get('em.view') || 'inicio',
  online: true,
  lastHash: '',
  taskArea: 'all', taskMine: false, taskView: 'board', taskQ: '',
  weekStart: mondayOf(todayISO()),
  docFolder: 'all', docQ: '',
  uploads: [],
  gateError: '',
  newcomer: false
};
let deferredInstall = null;
const isStandalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

const D = () => S.data || { team: [], tasks: [], events: [], reminders: [], goals: [], docs: [], meetings: [], folders: [] };
const list = (col) => D()[col] || [];
const member = (id) => list('team').find((m) => m.id === id);
const meM = () => member(S.meId);
const initials = (name) => String(name || '?').trim().split(/\s+/).filter((w) => !/^(de|del|la|los|las|y)$/i.test(w)).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?';
function avatar(id, extra = '') {
  const m = member(id);
  if (!m) return `<span class="av empty ${extra}" title="Sin asignar">–</span>`;
  return `<span class="av v-${esc(m.area || 'x')} ${extra}" title="${esc(m.name)}">${esc(initials(m.name))}</span>`;
}
const firstName = (m) => (m && m.name ? m.name.split(/\s+/)[0] : '');

// ---------- Conexión ----------
async function api(path, opts = {}) {
  const headers = { 'x-team-code': S.code || '', ...(opts.body ? { 'content-type': 'application/json' } : {}) };
  let res;
  try { res = await fetch(path, { ...opts, headers }); } catch { throw new Error('Sin conexión'); }
  if (res.status === 401) { const e = new Error('Código de equipo incorrecto'); e.auth = true; throw e; }
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(j.error || 'Error de conexión');
  return j;
}

function setData(d) {
  const h = JSON.stringify(d);
  if (h === S.lastHash) return;
  S.lastHash = h;
  S.data = d;
  store.set('em.cache', d);
  render();
}

async function load(silent = false) {
  try {
    const d = await api('/api/data');
    S.online = true;
    setData(d);
  } catch (e) {
    S.online = false;
    if (e.auth) return logout('Código de equipo incorrecto. Vuelve a ingresarlo.');
    if (!silent) toast(e.message, true);
    render();
  }
}

async function saveItem(col, item) {
  const arr = D()[col] || (D()[col] = []);
  const i = arr.findIndex((x) => x.id === item.id);
  if (i >= 0) arr[i] = item; else arr.push(item);
  render();
  try {
    const d = await api('/api/data', { method: 'POST', body: JSON.stringify({ op: 'upsert', col, item }) });
    S.lastHash = '';
    setData(d);
    return true;
  } catch (e) {
    toast(`No se guardó: ${e.message}`, true);
    load(true);
    return false;
  }
}

async function removeItem(col, id) {
  S.data[col] = list(col).filter((x) => x.id !== id);
  render();
  try {
    const d = await api('/api/data', { method: 'POST', body: JSON.stringify({ op: 'delete', col, id }) });
    S.lastHash = '';
    setData(d);
  } catch (e) {
    toast(`No se eliminó: ${e.message}`, true);
    load(true);
  }
}

async function saveFolders(folders) {
  S.data.folders = folders;
  render();
  try {
    const d = await api('/api/data', { method: 'POST', body: JSON.stringify({ op: 'folders', folders }) });
    S.lastHash = '';
    setData(d);
  } catch (e) { toast(`No se guardó: ${e.message}`, true); load(true); }
}

function logout(msg = '') {
  S.code = null; S.meId = null; S.data = null; S.lastHash = ''; S.gateError = msg;
  store.del('em.code'); store.del('em.me'); store.del('em.cache');
  closeDlg();
  render();
}

let toastTimer;
function toast(msg, err = false) {
  const t = $('#toast');
  t.textContent = msg;
  t.className = `toast${err ? ' err' : ''}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.add('hidden'), 3200);
}

// ---------- Cálculos ----------
const goalPct = (g) => { const k = g.krs || []; return k.length ? Math.round((k.filter((x) => x.done).length / k.length) * 100) : 0; };
const byDue = (a, b) => (a.due || '9999').localeCompare(b.due || '9999') || (a.time || '99').localeCompare(b.time || '99');
const openTasks = () => list('tasks').filter((t) => t.status !== 'ok');
function dueInfo(t) {
  if (!t.due) return { label: 'Sin fecha', late: false };
  const d = daysBetween(todayISO(), t.due);
  const time = t.time ? `, ${t.time}` : '';
  if (t.status !== 'ok' && d < 0) return { label: `Vencida · ${fmtShort(t.due)}`, late: true };
  if (d === 0) return { label: `Hoy${time}`, late: false, today: true };
  if (d === 1) return { label: `Mañana${time}`, late: false };
  return { label: cap(fmtDay(t.due)) + time, late: false };
}
function taskRemindAt(t) {
  if (!t.due || !t.remind || t.remind === 'none') return null;
  const base = new Date(`${t.due}T${t.time || '18:00'}`);
  if (t.remind === 'd0') return new Date(`${t.due}T09:00`);
  if (t.remind === 'd1') return new Date(base.getTime() - 864e5);
  if (t.remind === 'h2') return new Date(base.getTime() - 2 * 36e5);
  return null;
}
const forMe = (who) => !who || who === S.meId;

function alerts() {
  const out = [];
  const today = todayISO();
  const now = new Date();
  let teamLate = 0;
  for (const t of openTasks()) {
    const mine = t.owner === S.meId || !t.owner;
    const late = t.due && t.due < today;
    if (late && !mine) { teamLate++; continue; }
    if (!mine) continue;
    if (late) out.push({ p: 0, tone: 'al-urg', title: `Vencida: ${t.title}`, meta: `Venció el ${fmtDay(t.due)}${t.owner ? '' : ' · sin encargado'}`, act: 'open-task', id: t.id });
    else if (t.due === today) out.push({ p: 1, tone: 'al-warn', title: `Vence hoy: ${t.title}`, meta: t.time ? `A las ${t.time}` : AREAS[t.area] || 'Tarea', act: 'open-task', id: t.id });
    else if (t.urgent) out.push({ p: 1, tone: 'al-urg', title: `Urgente: ${t.title}`, meta: dueInfo(t).label, act: 'open-task', id: t.id });
    else {
      const r = taskRemindAt(t);
      if (r && r <= now) out.push({ p: 2, tone: 'al-warn', title: `Recordatorio: ${t.title}`, meta: `Vence ${dueInfo(t).label.toLowerCase()}`, act: 'open-task', id: t.id });
    }
  }
  if (teamLate) out.push({ p: 2, tone: 'al-urg', title: `${teamLate} ${teamLate === 1 ? 'tarea del equipo está vencida' : 'tareas del equipo están vencidas'}`, meta: 'Revisa el tablero de tareas', act: 'nav', v: 'tareas' });
  for (const r of list('reminders')) {
    if (r.done || !forMe(r.who) || !r.date) continue;
    const at = new Date(`${r.date}T${r.time || '09:00'}`);
    if (r.date < today || at <= now || r.date === today) {
      out.push({ p: r.date < today ? 1 : 2, tone: 'al-warn', title: `Recordatorio: ${r.text}`, meta: r.date === today ? `Hoy${r.time ? ` a las ${r.time}` : ''}` : `Desde el ${fmtDay(r.date)}`, act: 'open-rem', id: r.id });
    }
  }
  for (const e of list('events')) {
    if (e.date === today) out.push({ p: 3, tone: 'al-info', title: `Hoy${e.start ? ` ${e.start}` : ''}: ${e.title}`, meta: [EVTYPES[e.type], e.place].filter(Boolean).join(' · '), act: 'open-event', id: e.id });
  }
  for (const m of list('meetings')) {
    if (m.date === today) out.push({ p: 3, tone: 'al-info', title: `Reunión de equipo hoy${m.time ? ` a las ${m.time}` : ''}`, meta: m.place || 'Ver pauta', act: 'open-meeting', id: m.id });
  }
  const dayAgo = Date.now() - 864e5;
  for (const d of list('docs')) {
    if (d.by !== S.meId && d.at && new Date(d.at).getTime() > dayAgo) {
      out.push({ p: 4, tone: 'al-ok', title: `Nuevo documento: ${d.name}`, meta: `${member(d.by)?.name || 'Equipo'} · ${ago(d.at)}`, act: 'open-doc', id: d.id });
    }
  }
  return out.sort((a, b) => a.p - b.p);
}

// ---------- Render principal ----------
const root = $('#root');
function render() {
  const a = document.activeElement;
  const fid = a && a.id && root.contains(a) ? a.id : null;
  const pos = fid && 'selectionStart' in a ? a.selectionStart : null;
  if (!S.code) root.innerHTML = gateCode();
  else if (!S.data) root.innerHTML = `<div class="gate"><div class="gate-card"><div class="logo">M</div><h1>Cargando…</h1><p>Conectando con el equipo.</p></div></div>`;
  else if (!meM()) root.innerHTML = gateWho();
  else root.innerHTML = shell();
  if (fid) {
    const el = document.getElementById(fid);
    if (el) { el.focus(); if (pos != null && el.setSelectionRange) { try { el.setSelectionRange(pos, pos); } catch { /* */ } } }
  }
}

function gateCode() {
  return `<div class="gate"><form class="gate-card" data-form="code">
    <div class="logo">M</div>
    <h1>Equipo Mella</h1>
    <p>Organización del equipo del diputado Cristián Mella. Ingresa el código que te entregó tu equipo.</p>
    <label class="field"><span>Código del equipo</span><input id="code-in" class="inp" name="code" autocomplete="off" autocapitalize="characters" required placeholder="Ej.: D6-XXXX-XXXX"></label>
    ${S.gateError ? `<p class="small" style="color:var(--red-ink);margin:10px 0 0;font-weight:600">${esc(S.gateError)}</p>` : ''}
    <button class="btn btn-p" style="width:100%;margin-top:18px">Entrar</button>
  </form></div>`;
}

function gateWho() {
  const team = list('team');
  return `<div class="gate"><div class="gate-card">
    <div class="logo">M</div>
    <h1>¿Quién eres?</h1>
    <p>Elige tu nombre para ver tus tareas y alertas. Si es tu primera vez, agrégate al equipo.</p>
    ${S.newcomer ? `<form data-form="newcomer" style="display:flex;flex-direction:column;gap:12px">
      <label class="field"><span>Nombre y apellido</span><input id="nc-name" class="inp" name="name" required maxlength="60"></label>
      <label class="field"><span>Cargo</span><input class="inp" name="role" required maxlength="60" placeholder="Ej.: Asesor legislativo"></label>
      <label class="field"><span>Área</span><select class="inp" name="area">${Object.entries(AREAS).map(([k, v]) => `<option value="${k}">${esc(v)}</option>`).join('')}</select></label>
      <div style="display:flex;gap:10px;margin-top:6px"><button type="button" class="btn" data-act="newcomer-cancel">Volver</button><button class="btn btn-p" style="flex:1">Unirme al equipo</button></div>
    </form>` : `<div class="who-list">${team.map((m) => `<button class="who" data-act="pick-me" data-id="${esc(m.id)}">${avatar(m.id, 'lg')}<span><b style="display:block">${esc(m.name)}</b><span class="small muted">${esc(m.role || '')}</span></span></button>`).join('')}</div>
    <button class="btn" style="width:100%" data-act="newcomer">${ic('plus', 16)}Soy nuevo en el equipo</button>
    <button class="linkbtn" style="margin-top:12px" data-act="logout">Usar otro código</button>`}
  </div></div>`;
}

const NAV = [
  { v: 'inicio', n: 'Inicio', i: 'home' },
  { v: 'tareas', n: 'Tareas', i: 'tasks' },
  { v: 'agenda', n: 'Planificador', short: 'Agenda', i: 'cal' },
  { v: 'docs', n: 'Documentos', short: 'Docs', i: 'folder' },
  { v: 'metas', n: 'Metas y equipo', short: 'Metas', i: 'target' }
];

function shell() {
  const me = meM();
  const al = alerts();
  const nOpen = openTasks().length;
  const views = { inicio: vInicio, tareas: vTareas, agenda: vAgenda, docs: vDocs, metas: vMetas };
  const view = views[S.view] ? S.view : 'inicio';
  const canInstall = !isStandalone() && (deferredInstall || isIOS());
  return `<div class="app">
  <aside class="side">
    <div class="brand"><div class="logo">M</div><div><b>Equipo Mella</b><span>Distrito 6 · Valparaíso</span></div></div>
    <nav class="nav" aria-label="Secciones">
      ${NAV.map((n) => `<button data-act="nav" data-v="${n.v}" ${view === n.v ? 'aria-current="page"' : ''}>${ic(n.i)}${n.n}${n.v === 'inicio' && al.length ? `<span class="cnt alert">${al.length}</span>` : ''}${n.v === 'tareas' ? `<span class="cnt">${nOpen}</span>` : ''}</button>`).join('')}
    </nav>
    <div class="side-foot">
      <span class="sync ${S.online ? '' : 'off'}" style="padding:0 12px"><i></i>${S.online ? 'Sincronizado' : 'Sin conexión'}</span>
      ${canInstall ? `<button class="btn btn-sm" data-act="install">${ic('phone', 16)}Instalar en el celular</button>` : ''}
      <button class="me" data-act="account" style="border:none;cursor:pointer;text-align:left">${avatar(me.id)}<div><b>${esc(me.name)}</b><span>${esc(me.role || '')}</span></div></button>
    </div>
  </aside>
  <div style="flex:1;min-width:0">
    <header class="topbar">
      <div class="logo">M</div><b>Equipo Mella</b>
      <span class="sp"></span>
      <span class="sync ${S.online ? '' : 'off'}" title="${S.online ? 'Sincronizado' : 'Sin conexión'}"><i></i></span>
      <button class="ghost" data-act="account" aria-label="Mi cuenta" style="width:44px;height:44px">${avatar(me.id)}</button>
    </header>
    <main class="main">${views[view]()}</main>
  </div>
  <nav class="tabbar" aria-label="Secciones">
    ${NAV.map((n) => `<button data-act="nav" data-v="${n.v}" ${view === n.v ? 'aria-current="page"' : ''}>${ic(n.i, 22)}${n.short || n.n}${n.v === 'inicio' && al.length ? `<span class="badge">${al.length}</span>` : ''}</button>`).join('')}
  </nav>
  <button class="fab" data-act="fab" aria-label="Crear">${ic('plus', 26)}</button>
</div>`;
}

// ---------- Vista: Inicio ----------
function installBanner() {
  if (isStandalone() || store.get('em.hideInstall')) return '';
  if (deferredInstall) return `<div class="banner">${ic('phone')}<span>Instala Equipo Mella en tu celular para abrirla como una app.</span><button class="btn btn-sm btn-p" data-act="install">Instalar</button><button class="ghost" data-act="hide-install" aria-label="Ocultar">${ic('x', 16)}</button></div>`;
  if (isIOS()) return `<div class="banner">${ic('phone')}<span>Para instalarla en el iPhone: abre esta página en Safari, toca <b>Compartir</b> y luego <b>Agregar a pantalla de inicio</b>.</span><button class="ghost" data-act="hide-install" aria-label="Ocultar" style="margin-left:auto">${ic('x', 16)}</button></div>`;
  return '';
}

function taskRow(t) {
  const di = dueInfo(t);
  return `<div class="row">
    <input type="checkbox" class="check" data-act="toggle-task" data-id="${esc(t.id)}" aria-label="Marcar como lista: ${esc(t.title)}" ${t.status === 'ok' ? 'checked' : ''}>
    <div class="row-main">
      <button class="row-title" data-act="open-task" data-id="${esc(t.id)}">${esc(t.title)}</button>
      <div class="row-meta">
        ${t.area ? `<span class="chip a-${esc(t.area)}">${esc(AREAS[t.area])}</span>` : ''}
        ${t.urgent ? '<span class="chip c-urg">Urgente</span>' : ''}
        <span class="${di.late ? 'late' : ''}">${esc(di.label)}</span>
        ${t.status !== 'pen' && t.status !== 'ok' ? `<span class="chip s-${esc(t.status)}">${esc(STATUS_N[t.status])}</span>` : ''}
      </div>
    </div>
    ${avatar(t.owner)}
  </div>`;
}

function evButton(e) {
  return `<button class="ev e-${esc(e.type || 'otro')}" data-act="open-event" data-id="${esc(e.id)}"><b>${esc(e.start ? `${e.start}${e.end ? `–${e.end}` : ''}` : 'Todo el día')}</b>${esc(e.title)}${e.place ? ` · ${esc(e.place)}` : ''}</button>`;
}

function vInicio() {
  const me = meM();
  const today = todayISO();
  const open = openTasks();
  const mine = open.filter((t) => t.owner === S.meId).sort(byDue);
  const weekEnd = addDays(mondayOf(today), 6);
  const thisWeek = open.filter((t) => t.due && t.due >= today && t.due <= weekEnd);
  const late = open.filter((t) => t.due && t.due < today);
  const goals = list('goals');
  const allKrs = goals.flatMap((g) => g.krs || []);
  const gPct = allKrs.length ? Math.round((allKrs.filter((k) => k.done).length / allKrs.length) * 100) : 0;
  const al = alerts();
  const h = new Date().getHours();
  const hello = h < 12 ? 'Buenos días' : h < 20 ? 'Buenas tardes' : 'Buenas noches';
  const upcoming = [];
  for (let i = 0; i < 7; i++) {
    const d = addDays(today, i);
    const evs = list('events').filter((e) => e.date === d).sort((a, b) => (a.start || '').localeCompare(b.start || ''));
    const mts = list('meetings').filter((m) => m.date === d);
    if (evs.length || mts.length) upcoming.push({ d, evs, mts });
  }
  return `
  <div class="head"><div><div class="eyebrow">${esc(cap(fmtLong(today)))}</div><h1 class="h1">${hello}, ${esc(firstName(me))}</h1></div>
    <div class="tools"><button class="btn btn-p" data-act="new-task">${ic('plus', 16)}Nueva tarea</button></div></div>
  ${installBanner()}
  <section class="stats" aria-label="Resumen">
    <div class="card stat"><div class="l">Mis tareas abiertas</div><div class="n">${mine.length}</div><div class="s">${mine.filter((t) => t.due === today).length} vencen hoy</div></div>
    <div class="card stat"><div class="l">Vencen esta semana</div><div class="n">${thisWeek.length}</div><div class="s">De todo el equipo</div></div>
    <div class="card stat"><div class="l">Tareas vencidas</div><div class="n" style="${late.length ? 'color:var(--red-ink)' : ''}">${late.length}</div><div class="s">${late.length ? 'Requieren atención' : 'Todo al día'}</div></div>
    <div class="card stat"><div class="l">Avance de metas</div><div class="n">${gPct}%</div><div class="s">${allKrs.filter((k) => k.done).length} de ${allKrs.length} resultados clave</div></div>
  </section>
  <div class="cols">
    <div class="col-main">
      <section class="card">
        <div class="card-h"><h2 class="h2">Mis tareas</h2><button class="linkbtn" data-act="nav" data-v="tareas" style="color:var(--blue)">Ver tablero →</button></div>
        ${mine.length ? mine.slice(0, 8).map(taskRow).join('') : `<div class="empty-state">No tienes tareas abiertas.<br><button class="btn btn-sm" style="margin-top:12px" data-act="new-task">${ic('plus', 14)}Crear tarea</button></div>`}
        ${mine.length > 8 ? `<p class="small muted" style="margin:10px 0 0">Y ${mine.length - 8} más en el tablero.</p>` : ''}
      </section>
      <section class="card">
        <div class="card-h"><h2 class="h2">Próximos 7 días</h2><button class="linkbtn" data-act="nav" data-v="agenda" style="color:var(--blue)">Abrir planificador →</button></div>
        ${upcoming.length ? `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:14px;margin-top:8px">${upcoming.map((u) => `<div style="display:flex;flex-direction:column;gap:8px">
          <div class="eyebrow">${esc(u.d === today ? 'Hoy' : fmtDay(u.d))}</div>
          ${u.mts.map((m) => `<button class="ev e-int" data-act="open-meeting" data-id="${esc(m.id)}"><b>${esc(m.time || '')}</b>Reunión de equipo</button>`).join('')}
          ${u.evs.map(evButton).join('')}</div>`).join('')}</div>` : '<div class="empty-state">No hay eventos en los próximos 7 días.</div>'}
      </section>
    </div>
    <div class="col-side">
      <section class="card">
        <div class="card-h"><h2 class="h2">Alertas</h2>${al.length ? `<span class="chip c-urg">${al.length}</span>` : ''}</div>
        ${al.length ? al.slice(0, 10).map((a) => `<button class="al" data-act="${a.act}" ${a.id ? `data-id="${esc(a.id)}"` : ''} ${a.v ? `data-v="${a.v}"` : ''}><span class="al-dot ${a.tone}"></span><span><b>${esc(a.title)}</b><span>${esc(a.meta || '')}</span></span></button>`).join('') : '<div class="empty-state">Sin alertas por ahora.</div>'}
      </section>
      <section class="card">
        <div class="card-h" style="margin-bottom:16px"><h2 class="h2">Metas</h2><button class="linkbtn" data-act="nav" data-v="metas" style="color:var(--blue)">Ver todas →</button></div>
        ${goals.length ? goals.map((g) => `<div class="goal-row"><div class="t"><span>${esc(g.name)}</span><span class="muted">${goalPct(g)}%</span></div><div class="bar"><i style="width:${goalPct(g)}%"></i></div></div>`).join('') : '<div class="empty-state">Aún no hay metas.</div>'}
      </section>
    </div>
  </div>`;
}

// ---------- Vista: Tareas ----------
function filteredTasks() {
  const q = S.taskQ.trim().toLowerCase();
  return list('tasks').filter((t) =>
    (S.taskArea === 'all' || t.area === S.taskArea) &&
    (!S.taskMine || t.owner === S.meId) &&
    (!q || `${t.title} ${t.desc || ''}`.toLowerCase().includes(q)));
}
const fine = () => matchMedia('(pointer:fine)').matches;
function taskCard(t) {
  const di = dueInfo(t);
  const ck = t.checks || [];
  return `<button class="tk" data-act="open-task" data-id="${esc(t.id)}" ${fine() ? 'draggable="true"' : ''}>
    <div class="tk-chips">${t.area ? `<span class="chip a-${esc(t.area)}">${esc(AREAS[t.area])}</span>` : ''}${t.urgent ? '<span class="chip c-urg">Urgente</span>' : ''}</div>
    <div class="tk-t">${esc(t.title)}</div>
    <div class="tk-m"><span class="${di.late ? 'late' : ''}">${esc(di.label)}</span>${ck.length ? `<span>${ic('check', 13)} ${ck.filter((c) => c.done).length}/${ck.length}</span>` : ''}${(t.comments || []).length ? `<span>${(t.comments || []).length} coment.</span>` : ''}${avatar(t.owner)}</div>
  </button>`;
}
function vTareas() {
  const ts = filteredTasks();
  const open = openTasks();
  const filters = [['all', 'Todas'], ...Object.entries(AREAS)];
  return `
  <div class="head"><div><div class="eyebrow">${open.length} abiertas · ${open.filter((t) => t.due && t.due < todayISO()).length} vencidas</div><h1 class="h1">Tareas</h1></div>
    <div class="tools">
      <label class="search">${ic('search', 16)}<span class="sr">Buscar tareas</span><input id="task-q" type="search" placeholder="Buscar tareas…" value="${esc(S.taskQ)}" data-input="taskQ"></label>
      <div class="seg" role="group" aria-label="Vista"><button data-act="task-view" data-k="board" aria-pressed="${S.taskView === 'board'}">Tablero</button><button data-act="task-view" data-k="list" aria-pressed="${S.taskView === 'list'}">Lista</button></div>
      <button class="btn btn-p" data-act="new-task">${ic('plus', 16)}Nueva tarea</button>
    </div></div>
  <div class="filters" role="group" aria-label="Filtrar">
    ${filters.map(([k, n]) => `<button class="filt" data-act="task-area" data-k="${k}" aria-pressed="${S.taskArea === k}">${esc(n)}</button>`).join('')}
    <button class="filt" data-act="task-mine" aria-pressed="${S.taskMine}">Solo mías</button>
  </div>
  ${S.taskView === 'board' ? `<div class="board">${STATUS.map((s) => {
    const items = ts.filter((t) => (t.status || 'pen') === s.k).sort((a, b) => (b.urgent ? 1 : 0) - (a.urgent ? 1 : 0) || byDue(a, b));
    return `<section class="lane" data-status="${s.k}" aria-label="${s.n}">
      <div class="lane-h"><span class="pip p-${s.k}"></span>${s.n}<span class="n">${items.length}</span></div>
      ${items.map(taskCard).join('')}
      <button class="add-lane" data-act="new-task" data-status="${s.k}">+ Agregar</button>
    </section>`;
  }).join('')}</div>` : `<section class="card list">${ts.length ? STATUS.flatMap((s) => ts.filter((t) => (t.status || 'pen') === s.k).sort(byDue)).map(taskRow).join('') : '<div class="empty-state">No hay tareas con estos filtros.</div>'}</section>`}`;
}

// ---------- Vista: Planificador ----------
function vAgenda() {
  const ws = S.weekStart;
  const today = todayISO();
  const days = Array.from({ length: 7 }, (_, i) => addDays(ws, i));
  const rems = list('reminders').filter((r) => !r.done).sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));
  const done = list('reminders').filter((r) => r.done).length;
  const perm = 'Notification' in window ? Notification.permission : 'unsupported';
  return `
  <div class="head"><div><div class="eyebrow">Semana del ${esc(fmtShort(days[0]))} al ${esc(fmtShort(days[6]))}</div><h1 class="h1">Planificador</h1></div>
    <div class="tools">
      <button class="icon-btn" data-act="week" data-k="-1" aria-label="Semana anterior">${ic('chevL')}</button>
      <button class="btn" data-act="week" data-k="0">Hoy</button>
      <button class="icon-btn" data-act="week" data-k="1" aria-label="Semana siguiente">${ic('chevR')}</button>
      <button class="btn btn-p" data-act="new-event">${ic('plus', 16)}Nuevo evento</button>
    </div></div>
  <div class="legend">${Object.entries(EVTYPES).map(([k, v]) => `<span class="lg"><span class="sw e-${k}"></span>${esc(v)}</span>`).join('')}</div>
  <div class="week" style="margin-bottom:24px">${days.map((d) => {
    const evs = list('events').filter((e) => e.date === d).sort((a, b) => (a.start || '').localeCompare(b.start || ''));
    const mts = list('meetings').filter((m) => m.date === d);
    const dts = openTasks().filter((t) => t.due === d);
    const wd = new Intl.DateTimeFormat('es-CL', { weekday: 'short' }).format(parseISO(d)).replace('.', '').toUpperCase();
    return `<section class="day ${d === today ? 'today' : ''}" aria-label="${esc(fmtLong(d))}">
      <div class="day-h"><div><div class="wd">${wd}</div><div class="dn">${parseISO(d).getDate()}</div></div><button class="ghost" data-act="new-event" data-date="${d}" aria-label="Agregar evento el ${esc(fmtLong(d))}">${ic('plus', 16)}</button></div>
      ${mts.map((m) => `<button class="ev e-int" data-act="open-meeting" data-id="${esc(m.id)}"><b>${esc(m.time || '')}</b>Reunión de equipo</button>`).join('')}
      ${evs.map(evButton).join('')}
      ${dts.map((t) => `<button class="day-task" data-act="open-task" data-id="${esc(t.id)}">${ic('tasks', 14)}<span>${esc(t.title)}</span></button>`).join('')}
    </section>`;
  }).join('')}</div>
  <div class="cols">
    <section class="card col-main">
      <div class="card-h"><h2 class="h2">Recordatorios</h2><button class="btn btn-sm" data-act="new-rem">${ic('plus', 14)}Nuevo</button></div>
      ${rems.length ? rems.map((r) => `<div class="rem">
        <input type="checkbox" class="check" data-act="toggle-rem" data-id="${esc(r.id)}" aria-label="Marcar como hecho: ${esc(r.text)}">
        <button class="row-main row-title" data-act="open-rem" data-id="${esc(r.id)}" style="font-weight:600">${esc(r.text)}<span class="small muted" style="display:block;font-weight:500;margin-top:3px">${esc(r.date ? cap(fmtDay(r.date)) : 'Sin fecha')}${r.time ? ` · ${esc(r.time)}` : ''} · ${esc(r.who ? (member(r.who)?.name || 'Persona') : 'Todo el equipo')}</span></button>
      </div>`).join('') : '<div class="empty-state">No hay recordatorios pendientes.</div>'}
      ${done ? `<p class="small muted" style="margin:8px 0 0">${done} recordatorios hechos.</p>` : ''}
    </section>
    <section class="card col-side">
      <h2 class="h2" style="margin-bottom:8px">Avisos en este dispositivo</h2>
      <p class="muted" style="font-size:14px;line-height:1.5;margin:0 0 14px">Recibe un aviso cuando llegue la hora de tus recordatorios, tareas y eventos mientras la app está abierta o en segundo plano.</p>
      ${perm === 'granted' ? '<span class="chip s-ok">Avisos activados</span>' : perm === 'denied' ? '<span class="chip c-urg">Bloqueados en la configuración del navegador</span>' : perm === 'unsupported' ? '<span class="chip s-pen">Este navegador no permite avisos</span>' : `<button class="btn" data-act="notif">${ic('bell', 16)}Activar avisos</button>`}
      ${isIOS() && !isStandalone() ? '<p class="small muted" style="margin:12px 0 0">En iPhone, los avisos funcionan después de instalar la app en la pantalla de inicio.</p>' : ''}
    </section>
  </div>`;
}

// ---------- Vista: Documentos ----------
function extOf(name) {
  const e = (String(name).split('.').pop() || '').toLowerCase();
  if (['doc', 'docx', 'odt', 'rtf', 'txt'].includes(e)) return ['DOC', 'x-doc'];
  if (e === 'pdf') return ['PDF', 'x-pdf'];
  if (['xls', 'xlsx', 'csv', 'ods'].includes(e)) return ['XLS', 'x-xls'];
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'heic', 'mp4', 'mov'].includes(e)) return [e.toUpperCase().slice(0, 4), 'x-img'];
  if (['ppt', 'pptx'].includes(e)) return ['PPT', 'x-oth'];
  return [(e || 'ARCH').toUpperCase().slice(0, 4), 'x-oth'];
}
const fmtSize = (b) => (b > 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);

function vDocs() {
  const folders = list('folders');
  const q = S.docQ.trim().toLowerCase();
  const docs = list('docs').filter((d) => (S.docFolder === 'all' || d.folder === S.docFolder) && (!q || d.name.toLowerCase().includes(q))).sort((a, b) => (b.at || '').localeCompare(a.at || ''));
  const count = (f) => list('docs').filter((d) => d.folder === f).length;
  const defFolder = S.docFolder !== 'all' ? S.docFolder : folders[0] || 'General';
  return `
  <div class="head"><div><div class="eyebrow">${list('docs').length} archivos</div><h1 class="h1">Documentos</h1></div>
    <div class="tools">
      <label class="search">${ic('search', 16)}<span class="sr">Buscar documentos</span><input id="doc-q" type="search" placeholder="Buscar por nombre…" value="${esc(S.docQ)}" data-input="docQ"></label>
      <button class="btn" data-act="new-folder">${ic('folder', 16)}Nueva carpeta</button>
    </div></div>
  <div class="drop" data-drop="docs">
    <span class="drop-ic">${ic('upload', 22)}</span>
    <div class="drop-t"><b>Sube documentos del equipo</b><span>Arrástralos aquí o selecciónalos. Word, PDF, Excel, imágenes y video, hasta 200 MB.</span></div>
    <div class="drop-opts">
      <label class="sr" for="up-folder">Carpeta</label>
      <select id="up-folder" class="mini-select" style="height:44px">${folders.map((f) => `<option ${f === defFolder ? 'selected' : ''}>${esc(f)}</option>`).join('')}</select>
      <button class="btn btn-p" data-act="pick-files">${ic('upload', 16)}Seleccionar archivos</button>
      <input id="doc-file" type="file" multiple class="sr" tabindex="-1" aria-hidden="true">
    </div>
    ${S.uploads.length ? `<div class="progress">${S.uploads.map((u) => `<div class="small" style="display:flex;justify-content:space-between;font-weight:600;margin-top:6px"><span>${esc(u.name)}</span><span>${u.pct}%</span></div><div class="bar" style="margin-top:4px"><i style="width:${u.pct}%"></i></div>`).join('')}</div>` : ''}
  </div>
  <div class="filters" role="group" aria-label="Carpetas">
    <button class="filt" data-act="doc-folder" data-k="all" aria-pressed="${S.docFolder === 'all'}">Todas</button>
    ${folders.map((f) => `<button class="filt" data-act="doc-folder" data-k="${esc(f)}" aria-pressed="${S.docFolder === f}">${esc(f)} · ${count(f)}</button>`).join('')}
  </div>
  <section class="card">
    ${docs.length ? docs.map((d) => {
      const [x, xc] = extOf(d.name);
      const task = d.task ? list('tasks').find((t) => t.id === d.task) : null;
      return `<div class="doc">
        <span class="ext ${xc}">${esc(x)}</span>
        <div class="doc-main">
          <button class="doc-name" data-act="open-doc" data-id="${esc(d.id)}">${esc(d.name)}</button>
          <div class="doc-meta">${esc(d.folder || '')} · ${esc(member(d.by)?.name || 'Equipo')} · ${esc(d.at ? ago(d.at) : '')}${d.size ? ` · ${fmtSize(d.size)}` : ''}${task ? ` · Tarea: <button class="linkbtn" style="padding:0;color:var(--blue)" data-act="open-task" data-id="${esc(task.id)}">${esc(task.title)}</button>` : ''}</div>
        </div>
        <div class="doc-act">
          <label class="sr" for="ds-${esc(d.id)}">Estado</label>
          <select id="ds-${esc(d.id)}" class="mini-select" data-act="doc-status" data-id="${esc(d.id)}">${Object.entries(DOCST).map(([k, v]) => `<option value="${k}" ${d.status === k ? 'selected' : ''}>${v}</option>`).join('')}</select>
          <button class="ghost" data-act="open-doc" data-id="${esc(d.id)}" aria-label="Abrir ${esc(d.name)}">${ic('open', 17)}</button>
          <button class="ghost" data-act="del-doc" data-id="${esc(d.id)}" aria-label="Eliminar ${esc(d.name)}">${ic('trash', 17)}</button>
        </div>
      </div>`;
    }).join('') : `<div class="empty-state">${q || S.docFolder !== 'all' ? 'No hay documentos con estos filtros.' : 'Todavía no hay documentos. Sube el primero.'}</div>`}
  </section>`;
}

// ---------- Vista: Metas y equipo ----------
function vMetas() {
  const goals = list('goals');
  const team = list('team');
  const today = todayISO();
  const mts = list('meetings').slice().sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));
  const next = mts.find((m) => m.date >= today);
  const pending = mts.filter((m) => m.date < today).flatMap((m) => (m.agreements || []).filter((a) => !a.done).map((a) => ({ ...a, mid: m.id })));
  const loadOf = (id) => openTasks().filter((t) => t.owner === id).length;
  return `
  <div class="head"><div><div class="eyebrow">Metas del equipo y quién hace qué</div><h1 class="h1">Metas y equipo</h1></div>
    <div class="tools"><button class="btn btn-p" data-act="new-goal">${ic('plus', 16)}Nueva meta</button></div></div>
  <div class="goals">${goals.map((g) => {
    const linked = list('tasks').filter((t) => t.goal === g.id && t.status !== 'ok').length;
    return `<article class="card goal">
      <div class="goal-top">${g.area ? `<span class="chip a-${esc(g.area)}">${esc(AREAS[g.area])}</span>` : '<span></span>'}<div style="display:flex;align-items:center;gap:4px"><span class="goal-pct">${goalPct(g)}%</span><button class="ghost" data-act="edit-goal" data-id="${esc(g.id)}" aria-label="Editar meta ${esc(g.name)}">${ic('edit', 16)}</button></div></div>
      <h3>${esc(g.name)}</h3>
      <div class="bar" style="margin-bottom:12px"><i style="width:${goalPct(g)}%"></i></div>
      ${(g.krs || []).map((k) => `<label class="kr ${k.done ? 'done' : ''}"><input type="checkbox" data-act="toggle-kr" data-g="${esc(g.id)}" data-id="${esc(k.id)}" ${k.done ? 'checked' : ''}><span>${esc(k.t)}</span></label>`).join('')}
      <div class="goal-foot">${avatar(g.owner)}<span>${g.owner ? esc(member(g.owner)?.name || 'Responsable') : 'Sin responsable'} · ${linked} ${linked === 1 ? 'tarea abierta' : 'tareas abiertas'}</span></div>
    </article>`;
  }).join('') || '<div class="card empty-state">Aún no hay metas. Crea la primera.</div>'}</div>
  <div class="cols">
    <section class="card col-main">
      <div class="card-h"><h2 class="h2">Equipo</h2><button class="btn btn-sm" data-act="new-member">${ic('plus', 14)}Agregar persona</button></div>
      ${team.map((m) => {
        const n = loadOf(m.id);
        const color = n >= 6 ? 'var(--red)' : n >= 4 ? 'var(--yellow)' : 'var(--teal)';
        return `<div class="mem">
          ${avatar(m.id, 'lg')}
          <div class="mem-main"><b>${esc(m.name)}${m.id === S.meId ? ' <span class="small muted">(tú)</span>' : ''}</b><span>${esc(m.role || '')}</span></div>
          <label class="sr" for="ms-${esc(m.id)}">Estado de ${esc(m.name)}</label>
          <select id="ms-${esc(m.id)}" class="mini-select" data-act="member-status" data-id="${esc(m.id)}">${MEMST.map((s) => `<option ${m.status === s ? 'selected' : ''}>${s}</option>`).join('')}</select>
          <div class="mem-load"><div class="small muted" style="margin-bottom:6px">${n} ${n === 1 ? 'tarea abierta' : 'tareas abiertas'}</div><div class="bar"><i style="width:${Math.min(100, n * 12.5)}%;background:${color}"></i></div></div>
          <button class="ghost" data-act="edit-member" data-id="${esc(m.id)}" aria-label="Editar ${esc(m.name)}">${ic('edit', 16)}</button>
        </div>`;
      }).join('')}
    </section>
    <section class="card col-side">
      <div class="card-h"><h2 class="h2">Reuniones</h2><button class="btn btn-sm" data-act="new-meeting">${ic('plus', 14)}Nueva</button></div>
      ${next ? `<div class="eyebrow" style="margin-top:6px">Próxima reunión</div>
        <button class="row-title serif" style="font-size:22px;font-weight:500;margin:6px 0 2px" data-act="open-meeting" data-id="${esc(next.id)}">${esc(cap(fmtLong(next.date)))}${next.time ? ` · ${esc(next.time)}` : ''}</button>
        <div class="small muted" style="margin-bottom:10px">${esc(next.place || '')}</div>
        ${(next.agenda || []).map((p, i) => `<div class="ag"><b>${i + 1}</b>${esc(p)}</div>`).join('') || '<div class="small muted">Sin pauta todavía.</div>'}` : '<div class="empty-state">No hay reuniones programadas.</div>'}
      <div class="eyebrow" style="margin:18px 0 4px">Acuerdos pendientes</div>
      ${pending.length ? pending.map((a) => `<label class="kr"><input type="checkbox" data-act="toggle-agr" data-m="${esc(a.mid)}" data-id="${esc(a.id)}"><span>${esc(a.t)}${a.owner ? ` <span class="muted small">· ${esc(member(a.owner)?.name || '')}</span>` : ''}</span></label>`).join('') : '<div class="small muted">No hay acuerdos pendientes.</div>'}
    </section>
  </div>`;
}

// ---------- Diálogos ----------
const dlg = $('#dlg');
let dlgCtx = null;
function openDlg(html, ctx) {
  dlg.innerHTML = html;
  dlgCtx = ctx;
  if (!dlg.open) dlg.showModal();
  const first = dlg.querySelector('[autofocus]');
  if (first && fine()) first.focus();
}
function closeDlg() { if (dlg.open) dlg.close(); dlgCtx = null; }
dlg.addEventListener('click', (e) => { if (e.target === dlg) closeDlg(); });
dlg.addEventListener('close', () => { dlgCtx = null; });
const dlgHead = (title) => `<div class="dlg-h"><h2 id="dlg-title">${esc(title)}</h2><button type="button" class="ghost" data-dlg="close" aria-label="Cerrar">${ic('x')}</button></div>`;
const opt = (v, label, sel) => `<option value="${esc(v)}" ${sel ? 'selected' : ''}>${esc(label)}</option>`;
const teamOptions = (sel, emptyLabel = 'Sin asignar') => opt('', emptyLabel, !sel) + list('team').map((m) => opt(m.id, m.name, m.id === sel)).join('');

// Tarea
function openTask(id, preset = {}) {
  const ex = id ? list('tasks').find((t) => t.id === id) : null;
  if (id && !ex) return toast('Esa tarea ya no existe', true);
  const t = ex ? JSON.parse(JSON.stringify(ex)) : {
    id: uid(), title: '', desc: '', area: meM()?.area || 'leg', owner: S.meId, status: preset.status || 'pen',
    urgent: false, due: preset.due || '', time: '', goal: '', remind: 'd1', checks: [], comments: [], by: S.meId, at: nowISOts()
  };
  openDlg(taskDlgHtml(t, !!ex), { kind: 'task', t, isNew: !ex });
}
function taskDlgHtml(t, exists) {
  const docs = list('docs').filter((d) => d.task === t.id);
  return `<form class="dlg" data-form="task">${dlgHead(exists ? 'Tarea' : 'Nueva tarea')}
  <div class="dlg-b">
    <label class="field"><span>Título</span><input class="inp" name="title" required maxlength="160" value="${esc(t.title)}" ${exists ? '' : 'autofocus'} placeholder="¿Qué hay que hacer?"></label>
    <label class="field"><span>Descripción</span><textarea class="inp" name="desc" rows="3" maxlength="4000" placeholder="Contexto, enlaces, instrucciones…">${esc(t.desc || '')}</textarea></label>
    <div class="grid2">
      <label class="field"><span>Encargado</span><select class="inp" name="owner">${teamOptions(t.owner)}</select></label>
      <label class="field"><span>Área</span><select class="inp" name="area">${Object.entries(AREAS).map(([k, v]) => opt(k, v, t.area === k)).join('')}</select></label>
      <label class="field"><span>Estado</span><select class="inp" name="status">${STATUS.map((s) => opt(s.k, s.n, t.status === s.k)).join('')}</select></label>
      <label class="field"><span>Meta vinculada</span><select class="inp" name="goal">${opt('', 'Ninguna', !t.goal)}${list('goals').map((g) => opt(g.id, g.name, t.goal === g.id)).join('')}</select></label>
    </div>
    <div class="grid3">
      <label class="field"><span>Fecha límite</span><input class="inp" type="date" name="due" value="${esc(t.due || '')}"></label>
      <label class="field"><span>Hora</span><input class="inp" type="time" name="time" value="${esc(t.time || '')}"></label>
      <label class="field"><span>Recordatorio</span><select class="inp" name="remind">${Object.entries(REMIND).map(([k, v]) => opt(k, v, (t.remind || 'none') === k)).join('')}</select></label>
    </div>
    <label class="toggle-row"><input type="checkbox" name="urgent" ${t.urgent ? 'checked' : ''}>Marcar como urgente</label>

    <div class="sub-h">Checklist</div>
    <div id="dlg-checks">${checksHtml(t)}</div>
    <div class="inline-add"><label class="sr" for="ck-new">Nuevo paso</label><input id="ck-new" class="inp" placeholder="Agregar un paso…" maxlength="200"><button type="button" class="btn btn-sm" data-dlg="add-check">Agregar</button></div>

    <div class="sub-h">Adjuntos</div>
    ${exists ? `${docs.map((d) => `<div class="file-row">${ic('clip', 15)}<span>${esc(d.name)}</span><button type="button" class="ghost" data-dlg="open-doc" data-id="${esc(d.id)}" aria-label="Abrir ${esc(d.name)}">${ic('open', 16)}</button></div>`).join('')}
      <div class="inline-add"><button type="button" class="btn btn-sm" data-dlg="attach">${ic('upload', 14)}Subir documento a esta tarea</button><input id="task-file" type="file" multiple class="sr" tabindex="-1" aria-hidden="true"></div>
      ${S.uploads.length ? `<div class="small muted">Subiendo ${S.uploads.length} archivo(s)…</div>` : ''}`
      : '<div class="small muted">Guarda la tarea para adjuntar documentos.</div>'}

    <div class="sub-h">Comentarios</div>
    ${(t.comments || []).map((c) => `<div class="cmt"><small>${esc(member(c.by)?.name || 'Equipo')} · ${esc(ago(c.at))}</small>${esc(c.text)}</div>`).join('') || '<div class="small muted">Sin comentarios.</div>'}
    <div class="inline-add"><label class="sr" for="cm-new">Comentario</label><input id="cm-new" class="inp" placeholder="Escribe un comentario…" maxlength="1000"><button type="button" class="btn btn-sm" data-dlg="add-comment">Enviar</button></div>
  </div>
  <div class="dlg-f">
    ${exists ? `<button type="button" class="btn btn-d left" data-dlg="delete">${ic('trash', 16)}Eliminar</button>` : ''}
    <button type="button" class="btn" data-dlg="close">Cancelar</button>
    <button class="btn btn-p">Guardar</button>
  </div></form>`;
}
function checksHtml(t) {
  return (t.checks || []).map((c) => `<div class="ck"><input type="checkbox" data-dlg="check" data-id="${esc(c.id)}" ${c.done ? 'checked' : ''} aria-label="${esc(c.t)}"><span class="grow" style="${c.done ? 'text-decoration:line-through;color:var(--slate)' : ''}">${esc(c.t)}</span><button type="button" class="ghost" data-dlg="del-check" data-id="${esc(c.id)}" aria-label="Quitar paso">${ic('x', 14)}</button></div>`).join('');
}
function readTaskForm(form, t) {
  const f = new FormData(form);
  return { ...t, title: String(f.get('title') || '').trim(), desc: String(f.get('desc') || ''), owner: f.get('owner') || '', area: f.get('area'), status: f.get('status'), goal: f.get('goal') || '', due: f.get('due') || '', time: f.get('time') || '', remind: f.get('remind'), urgent: f.get('urgent') === 'on' };
}

// Evento
function openEvent(id, preset = {}) {
  const ex = id ? list('events').find((e) => e.id === id) : null;
  if (id && !ex) return toast('Ese evento ya no existe', true);
  const e = ex ? { ...ex } : { id: uid(), title: '', type: 'com', date: preset.date || todayISO(), start: '', end: '', place: '', owner: '', notes: '' };
  openDlg(`<form class="dlg" data-form="event">${dlgHead(ex ? 'Evento' : 'Nuevo evento')}
  <div class="dlg-b">
    <label class="field"><span>Título</span><input class="inp" name="title" required maxlength="160" value="${esc(e.title)}" ${ex ? '' : 'autofocus'} placeholder="Ej.: Sesión Comisión de Salud"></label>
    <div class="grid2">
      <label class="field"><span>Tipo</span><select class="inp" name="type">${Object.entries(EVTYPES).map(([k, v]) => opt(k, v, e.type === k)).join('')}</select></label>
      <label class="field"><span>Fecha</span><input class="inp" type="date" name="date" required value="${esc(e.date)}"></label>
      <label class="field"><span>Inicio</span><input class="inp" type="time" name="start" value="${esc(e.start)}"></label>
      <label class="field"><span>Término</span><input class="inp" type="time" name="end" value="${esc(e.end)}"></label>
    </div>
    <label class="field"><span>Lugar</span><input class="inp" name="place" maxlength="160" value="${esc(e.place)}" placeholder="Sala, comuna o enlace"></label>
    <label class="field"><span>Responsable</span><select class="inp" name="owner">${teamOptions(e.owner, 'Todo el equipo')}</select></label>
    <label class="field"><span>Notas</span><textarea class="inp" name="notes" rows="3" maxlength="4000">${esc(e.notes)}</textarea></label>
  </div>
  <div class="dlg-f">${ex ? `<button type="button" class="btn btn-d left" data-dlg="delete">${ic('trash', 16)}Eliminar</button>` : ''}<button type="button" class="btn" data-dlg="close">Cancelar</button><button class="btn btn-p">Guardar</button></div></form>`, { kind: 'event', e, isNew: !ex });
}

// Recordatorio
function openRem(id) {
  const ex = id ? list('reminders').find((r) => r.id === id) : null;
  const r = ex ? { ...ex } : { id: uid(), text: '', date: todayISO(), time: '', who: S.meId, done: false, by: S.meId };
  openDlg(`<form class="dlg" data-form="rem">${dlgHead(ex ? 'Recordatorio' : 'Nuevo recordatorio')}
  <div class="dlg-b">
    <label class="field"><span>¿Qué hay que recordar?</span><input class="inp" name="text" required maxlength="200" value="${esc(r.text)}" ${ex ? '' : 'autofocus'}></label>
    <div class="grid2">
      <label class="field"><span>Fecha</span><input class="inp" type="date" name="date" required value="${esc(r.date)}"></label>
      <label class="field"><span>Hora</span><input class="inp" type="time" name="time" value="${esc(r.time)}"></label>
    </div>
    <label class="field"><span>Para</span><select class="inp" name="who">${teamOptions(r.who, 'Todo el equipo')}</select></label>
  </div>
  <div class="dlg-f">${ex ? `<button type="button" class="btn btn-d left" data-dlg="delete">${ic('trash', 16)}Eliminar</button>` : ''}<button type="button" class="btn" data-dlg="close">Cancelar</button><button class="btn btn-p">Guardar</button></div></form>`, { kind: 'rem', r, isNew: !ex });
}

// Meta
function openGoal(id) {
  const ex = id ? list('goals').find((g) => g.id === id) : null;
  const g = ex ? JSON.parse(JSON.stringify(ex)) : { id: uid(), name: '', area: 'leg', owner: '', krs: [] };
  openDlg(goalHtml(g, !!ex), { kind: 'goal', g, isNew: !ex });
}
function goalHtml(g, exists) {
  return `<form class="dlg" data-form="goal">${dlgHead(exists ? 'Meta' : 'Nueva meta')}
  <div class="dlg-b">
    <label class="field"><span>Nombre de la meta</span><input class="inp" name="name" required maxlength="160" value="${esc(g.name)}" ${exists ? '' : 'autofocus'}></label>
    <div class="grid2">
      <label class="field"><span>Área</span><select class="inp" name="area">${Object.entries(AREAS).map(([k, v]) => opt(k, v, g.area === k)).join('')}</select></label>
      <label class="field"><span>Responsable</span><select class="inp" name="owner">${teamOptions(g.owner, 'Sin responsable')}</select></label>
    </div>
    <div class="sub-h">Resultados clave</div>
    <div id="dlg-krs">${(g.krs || []).map((k) => `<div class="ck"><span class="grow">${esc(k.t)}</span><button type="button" class="ghost" data-dlg="del-kr" data-id="${esc(k.id)}" aria-label="Quitar resultado">${ic('x', 14)}</button></div>`).join('') || '<div class="small muted">Agrega los resultados que miden el avance de la meta.</div>'}</div>
    <div class="inline-add"><label class="sr" for="kr-new">Nuevo resultado clave</label><input id="kr-new" class="inp" placeholder="Ej.: Presentar indicaciones a la partida Salud" maxlength="200"><button type="button" class="btn btn-sm" data-dlg="add-kr">Agregar</button></div>
  </div>
  <div class="dlg-f">${exists ? `<button type="button" class="btn btn-d left" data-dlg="delete">${ic('trash', 16)}Eliminar</button>` : ''}<button type="button" class="btn" data-dlg="close">Cancelar</button><button class="btn btn-p">Guardar</button></div></form>`;
}

// Persona
function openMember(id) {
  const ex = id ? member(id) : null;
  const m = ex ? { ...ex } : { id: uid(), name: '', role: '', area: 'leg', status: 'Disponible' };
  openDlg(`<form class="dlg" data-form="member">${dlgHead(ex ? 'Persona del equipo' : 'Agregar persona')}
  <div class="dlg-b">
    <label class="field"><span>Nombre y apellido</span><input class="inp" name="name" required maxlength="60" value="${esc(m.name)}" ${ex ? '' : 'autofocus'}></label>
    <label class="field"><span>Cargo</span><input class="inp" name="role" maxlength="60" value="${esc(m.role)}"></label>
    <label class="field"><span>Área</span><select class="inp" name="area">${Object.entries(AREAS).map(([k, v]) => opt(k, v, m.area === k)).join('')}</select></label>
  </div>
  <div class="dlg-f">${ex && ex.id !== S.meId ? `<button type="button" class="btn btn-d left" data-dlg="delete">${ic('trash', 16)}Quitar del equipo</button>` : ''}<button type="button" class="btn" data-dlg="close">Cancelar</button><button class="btn btn-p">Guardar</button></div></form>`, { kind: 'member', m, isNew: !ex });
}

// Reunión
function openMeeting(id) {
  const ex = id ? list('meetings').find((m) => m.id === id) : null;
  const m = ex ? JSON.parse(JSON.stringify(ex)) : { id: uid(), date: todayISO(), time: '09:30', place: '', agenda: [], agreements: [], notes: '' };
  openDlg(meetingHtml(m, !!ex), { kind: 'meeting', m, isNew: !ex });
}
function meetingHtml(m, exists) {
  return `<form class="dlg" data-form="meeting">${dlgHead(exists ? 'Reunión de equipo' : 'Nueva reunión')}
  <div class="dlg-b">
    <div class="grid3">
      <label class="field"><span>Fecha</span><input class="inp" type="date" name="date" required value="${esc(m.date)}"></label>
      <label class="field"><span>Hora</span><input class="inp" type="time" name="time" value="${esc(m.time)}"></label>
      <label class="field"><span>Lugar</span><input class="inp" name="place" maxlength="120" value="${esc(m.place)}"></label>
    </div>
    <label class="field"><span>Pauta (un punto por línea)</span><textarea class="inp" name="agenda" rows="4" maxlength="3000">${esc((m.agenda || []).join('\n'))}</textarea></label>
    <div class="sub-h">Acuerdos</div>
    <div id="dlg-agr">${(m.agreements || []).map((a) => `<div class="ck"><input type="checkbox" data-dlg="agr" data-id="${esc(a.id)}" ${a.done ? 'checked' : ''} aria-label="${esc(a.t)}"><span class="grow">${esc(a.t)}${a.owner ? ` <span class="muted small">· ${esc(member(a.owner)?.name || '')}</span>` : ''}</span><button type="button" class="ghost" data-dlg="del-agr" data-id="${esc(a.id)}" aria-label="Quitar acuerdo">${ic('x', 14)}</button></div>`).join('') || '<div class="small muted">Sin acuerdos registrados.</div>'}</div>
    <div class="inline-add" style="flex-wrap:wrap"><label class="sr" for="agr-new">Nuevo acuerdo</label><input id="agr-new" class="inp" style="flex:1 1 200px" placeholder="Acuerdo…" maxlength="200"><label class="sr" for="agr-who">Responsable</label><select id="agr-who" class="inp" style="flex:0 1 180px;min-height:40px;font-size:14px">${teamOptions('', 'Responsable')}</select><button type="button" class="btn btn-sm" data-dlg="add-agr">Agregar</button></div>
    <label class="field"><span>Acta y notas</span><textarea class="inp" name="notes" rows="5" maxlength="8000">${esc(m.notes)}</textarea></label>
  </div>
  <div class="dlg-f">${exists ? `<button type="button" class="btn btn-d left" data-dlg="delete">${ic('trash', 16)}Eliminar</button>` : ''}<button type="button" class="btn" data-dlg="close">Cancelar</button><button class="btn btn-p">Guardar</button></div></form>`;
}

// Cuenta
function openAccount() {
  const me = meM();
  const perm = 'Notification' in window ? Notification.permission : 'unsupported';
  openDlg(`<div class="dlg">${dlgHead('Mi cuenta')}
  <div class="dlg-b">
    <div class="me">${avatar(me.id, 'lg')}<div><b>${esc(me.name)}</b><span>${esc(me.role || '')}</span></div></div>
    <button class="btn" data-dlg="edit-me">${ic('edit', 16)}Editar mis datos</button>
    ${!isStandalone() && (deferredInstall || isIOS()) ? `<button class="btn" data-dlg="install">${ic('phone', 16)}Instalar en este dispositivo</button>` : ''}
    ${perm === 'default' ? `<button class="btn" data-dlg="notif">${ic('bell', 16)}Activar avisos</button>` : ''}
    <button class="btn" data-dlg="switch">${ic('user', 16)}Cambiar de persona</button>
    <button class="btn btn-d" data-dlg="logout">Cerrar sesión en este dispositivo</button>
  </div></div>`, { kind: 'account' });
}

// ---------- Subida de documentos ----------
const slug = (s) => String(s || 'general').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase() || 'general';
const safeName = (n) => String(n).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9._-]+/g, '_').slice(-120) || 'archivo';

async function uploadFiles(files, { folder, task = '' }) {
  const arr = Array.from(files || []);
  if (!arr.length) return;
  for (const f of arr) {
    if (f.size > 200 * 1024 * 1024) { toast(`${f.name} supera los 200 MB`, true); continue; }
    const u = { name: f.name, pct: 0 };
    S.uploads.push(u);
    render();
    try {
      const blob = await upload(`docs/${slug(folder)}/${safeName(f.name)}`, f, {
        access: 'private',
        handleUploadUrl: '/api/upload',
        headers: { 'x-team-code': S.code },
        multipart: f.size > 20 * 1024 * 1024,
        onUploadProgress: (e) => { u.pct = Math.round(e.percentage || 0); if (S.view === 'docs') render(); }
      });
      S.uploads = S.uploads.filter((x) => x !== u);
      await saveItem('docs', { id: uid(), name: f.name, pathname: blob.pathname, size: f.size, ct: f.type || blob.contentType || '', folder, task, status: 'bor', by: S.meId, at: nowISOts() });
      toast(`Subido: ${f.name}`);
    } catch (e) {
      S.uploads = S.uploads.filter((x) => x !== u);
      render();
      toast(`No se pudo subir ${f.name}: ${e.message}`, true);
    }
  }
  if (dlgCtx && dlgCtx.kind === 'task') refreshTaskDlg();
}

async function openDoc(id) {
  const d = list('docs').find((x) => x.id === id);
  if (!d) return toast('Ese documento ya no existe', true);
  const w = window.open('', '_blank');
  try {
    const res = await fetch(`/api/file?p=${encodeURIComponent(d.pathname)}&n=${encodeURIComponent(d.name)}`, { headers: { 'x-team-code': S.code } });
    if (!res.ok) { const j = await res.json().catch(() => ({})); throw new Error(j.error || 'No se pudo abrir'); }
    const ct = res.headers.get('content-type') || '';
    let url;
    if (ct.includes('application/json')) { url = (await res.json()).url; } else { url = URL.createObjectURL(await res.blob()); }
    if (!url) throw new Error('No se pudo abrir');
    if (w) w.location.href = url; else location.href = url;
  } catch (e) {
    if (w) w.close();
    toast(e.message, true);
  }
}

// ---------- Avisos ----------
async function enableNotif() {
  if (!('Notification' in window)) return toast('Este navegador no permite avisos', true);
  const p = await Notification.requestPermission();
  if (p === 'granted') { toast('Avisos activados en este dispositivo'); checkNotify(); } else toast('No se activaron los avisos', true);
  render();
}
async function notify(title, body, tag) {
  try {
    const reg = await navigator.serviceWorker?.ready;
    if (reg) await reg.showNotification(title, { body, tag, icon: '/icons/icon-192.png', badge: '/icons/icon-192.png' });
    else new Notification(title, { body, tag, icon: '/icons/icon-192.png' });
  } catch { /* sin avisos */ }
}
function checkNotify() {
  if (!S.data || !meM() || !('Notification' in window) || Notification.permission !== 'granted') return;
  const sent = store.get('em.notified') || {};
  const now = Date.now();
  const win = 6 * 36e5;
  const fire = (key, at, title, body) => {
    if (sent[key] || !at || at > now || now - at > win) return;
    sent[key] = now;
    notify(title, body, key);
  };
  for (const r of list('reminders')) {
    if (r.done || !forMe(r.who) || !r.date) continue;
    fire(`r:${r.id}:${r.date}${r.time}`, new Date(`${r.date}T${r.time || '09:00'}`).getTime(), 'Recordatorio', r.text);
  }
  for (const t of openTasks()) {
    if (t.owner !== S.meId) continue;
    const at = taskRemindAt(t);
    if (at) fire(`t:${t.id}:${t.due}${t.time}${t.remind}`, at.getTime(), `Tarea: ${t.title}`, `Vence ${dueInfo(t).label.toLowerCase()}`);
  }
  for (const e of list('events')) {
    if (!e.start || (e.owner && e.owner !== S.meId)) continue;
    const at = new Date(`${e.date}T${e.start}`).getTime() - 15 * 60000;
    fire(`e:${e.id}:${e.date}${e.start}`, at, `En 15 minutos: ${e.title}`, [EVTYPES[e.type], e.place].filter(Boolean).join(' · '));
  }
  for (const k of Object.keys(sent)) if (now - sent[k] > 14 * 864e5) delete sent[k];
  store.set('em.notified', sent);
}

// ---------- Eventos de la interfaz ----------
function go(v) { S.view = v; store.set('em.view', v); render(); window.scrollTo({ top: 0 }); }

root.addEventListener('click', async (e) => {
  const el = e.target.closest('[data-act]');
  if (!el || el.tagName === 'SELECT' || (el.tagName === 'INPUT' && el.type === 'checkbox')) return;
  const { act, id, v, k } = el.dataset;
  switch (act) {
    case 'nav': return go(v);
    case 'pick-me': S.meId = id; store.set('em.me', id); return render();
    case 'newcomer': S.newcomer = true; return render();
    case 'newcomer-cancel': S.newcomer = false; return render();
    case 'logout': return logout();
    case 'account': return openAccount();
    case 'install': return doInstall();
    case 'hide-install': store.set('em.hideInstall', true); return render();
    case 'fab':
      if (S.view === 'agenda') return openEvent(null);
      if (S.view === 'docs') return $('#doc-file')?.click();
      if (S.view === 'metas') return openGoal(null);
      return openTask(null);
    case 'new-task': return openTask(null, { status: el.dataset.status });
    case 'open-task': return openTask(id);
    case 'task-area': S.taskArea = k; return render();
    case 'task-mine': S.taskMine = !S.taskMine; return render();
    case 'task-view': S.taskView = k; return render();
    case 'week': S.weekStart = k === '0' ? mondayOf(todayISO()) : addDays(S.weekStart, 7 * Number(k)); return render();
    case 'new-event': return openEvent(null, { date: el.dataset.date });
    case 'open-event': return openEvent(id);
    case 'new-rem': return openRem(null);
    case 'open-rem': return openRem(id);
    case 'notif': return enableNotif();
    case 'pick-files': return $('#doc-file')?.click();
    case 'doc-folder': S.docFolder = k; return render();
    case 'open-doc': return openDoc(id);
    case 'del-doc': {
      const d = list('docs').find((x) => x.id === id);
      if (d && confirm(`¿Eliminar "${d.name}"? Esta acción no se puede deshacer.`)) removeItem('docs', id);
      return;
    }
    case 'new-folder': {
      const name = (prompt('Nombre de la nueva carpeta') || '').trim().slice(0, 60);
      if (name && !list('folders').includes(name)) saveFolders([...list('folders'), name]);
      return;
    }
    case 'new-goal': return openGoal(null);
    case 'edit-goal': return openGoal(id);
    case 'new-member': return openMember(null);
    case 'edit-member': return openMember(id);
    case 'new-meeting': return openMeeting(null);
    case 'open-meeting': return openMeeting(id);
    default:
  }
});

root.addEventListener('change', (e) => {
  const el = e.target;
  const { act, id } = el.dataset;
  if (el.id === 'doc-file') { uploadFiles(el.files, { folder: $('#up-folder')?.value || 'General' }); el.value = ''; return; }
  if (act === 'toggle-task') {
    const t = list('tasks').find((x) => x.id === id);
    if (t) saveItem('tasks', { ...t, status: el.checked ? 'ok' : 'pen' });
  } else if (act === 'toggle-rem') {
    const r = list('reminders').find((x) => x.id === id);
    if (r) saveItem('reminders', { ...r, done: el.checked });
  } else if (act === 'doc-status') {
    const d = list('docs').find((x) => x.id === id);
    if (d) saveItem('docs', { ...d, status: el.value });
  } else if (act === 'member-status') {
    const m = member(id);
    if (m) saveItem('team', { ...m, status: el.value });
  } else if (act === 'toggle-kr') {
    const g = list('goals').find((x) => x.id === el.dataset.g);
    if (g) saveItem('goals', { ...g, krs: (g.krs || []).map((x) => (x.id === id ? { ...x, done: el.checked } : x)) });
  } else if (act === 'toggle-agr') {
    const m = list('meetings').find((x) => x.id === el.dataset.m);
    if (m) saveItem('meetings', { ...m, agreements: (m.agreements || []).map((a) => (a.id === id ? { ...a, done: el.checked } : a)) });
  }
});

root.addEventListener('input', (e) => {
  const key = e.target.dataset.input;
  if (key) { S[key] = e.target.value; render(); }
});

root.addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.target;
  const f = new FormData(form);
  if (form.dataset.form === 'code') {
    const code = String(f.get('code') || '').trim().toUpperCase();
    if (!code) return;
    S.code = code;
    S.gateError = '';
    render();
    try {
      const d = await api('/api/data');
      store.set('em.code', code);
      S.lastHash = '';
      setData(d);
    } catch (err) {
      S.code = null;
      S.gateError = err.auth ? 'Ese código no es válido. Revisa con tu equipo.' : err.message;
      render();
    }
  } else if (form.dataset.form === 'newcomer') {
    const m = { id: uid(), name: String(f.get('name')).trim(), role: String(f.get('role')).trim(), area: f.get('area'), status: 'Disponible' };
    if (!m.name) return;
    S.meId = m.id;
    store.set('em.me', m.id);
    S.newcomer = false;
    await saveItem('team', m);
    toast(`¡Bienvenido/a, ${firstName(m)}!`);
  }
});

// Arrastrar tareas entre columnas y archivos a la zona de subida
root.addEventListener('dragstart', (e) => {
  const tk = e.target.closest('.tk');
  if (!tk) return;
  e.dataTransfer.setData('text/x-task', tk.dataset.id);
  e.dataTransfer.effectAllowed = 'move';
  tk.classList.add('dragging');
});
root.addEventListener('dragend', (e) => e.target.closest?.('.tk')?.classList.remove('dragging'));
root.addEventListener('dragover', (e) => {
  const lane = e.target.closest('.lane');
  const drop = e.target.closest('[data-drop]');
  if (lane && e.dataTransfer.types.includes('text/x-task')) { e.preventDefault(); lane.classList.add('drop'); }
  if (drop && e.dataTransfer.types.includes('Files')) { e.preventDefault(); drop.classList.add('over'); }
});
root.addEventListener('dragleave', (e) => {
  const lane = e.target.closest('.lane');
  if (lane && !lane.contains(e.relatedTarget)) lane.classList.remove('drop');
  const drop = e.target.closest('[data-drop]');
  if (drop && !drop.contains(e.relatedTarget)) drop.classList.remove('over');
});
root.addEventListener('drop', (e) => {
  const lane = e.target.closest('.lane');
  const drop = e.target.closest('[data-drop]');
  if (lane && e.dataTransfer.types.includes('text/x-task')) {
    e.preventDefault();
    const t = list('tasks').find((x) => x.id === e.dataTransfer.getData('text/x-task'));
    if (t && t.status !== lane.dataset.status) saveItem('tasks', { ...t, status: lane.dataset.status });
    else render();
  } else if (drop && e.dataTransfer.files.length) {
    e.preventDefault();
    drop.classList.remove('over');
    uploadFiles(e.dataTransfer.files, { folder: $('#up-folder')?.value || 'General' });
  }
});

// ---------- Eventos de los diálogos ----------
function refreshTaskDlg() {
  if (!dlgCtx || dlgCtx.kind !== 'task') return;
  const form = dlg.querySelector('form');
  dlgCtx.t = readTaskForm(form, dlgCtx.t);
  const scroll = dlg.querySelector('.dlg-b')?.scrollTop || 0;
  dlg.innerHTML = taskDlgHtml(dlgCtx.t, !dlgCtx.isNew);
  const b = dlg.querySelector('.dlg-b'); if (b) b.scrollTop = scroll;
}

dlg.addEventListener('click', async (e) => {
  const el = e.target.closest('[data-dlg]');
  if (!el || !dlgCtx) { if (el && el.dataset.dlg === 'close') closeDlg(); return; }
  if (el.tagName === 'INPUT' && el.type === 'checkbox') return;
  const a = el.dataset.dlg;
  const ctx = dlgCtx;
  if (a === 'close') return closeDlg();

  if (ctx.kind === 'account') {
    if (a === 'edit-me') return openMember(S.meId);
    if (a === 'install') { closeDlg(); return doInstall(); }
    if (a === 'notif') { closeDlg(); return enableNotif(); }
    if (a === 'switch') { closeDlg(); S.meId = null; store.del('em.me'); return render(); }
    if (a === 'logout') { if (confirm('¿Cerrar sesión en este dispositivo?')) logout(); return; }
  }

  if (ctx.kind === 'task') {
    const form = dlg.querySelector('form');
    if (a === 'add-check') {
      const inp = $('#ck-new', dlg); const v = inp.value.trim(); if (!v) return;
      ctx.t = readTaskForm(form, ctx.t); ctx.t.checks = [...(ctx.t.checks || []), { id: uid(), t: v, done: false }];
      refreshTaskDlg(); $('#ck-new', dlg)?.focus(); return;
    }
    if (a === 'del-check') { ctx.t.checks = (ctx.t.checks || []).filter((c) => c.id !== el.dataset.id); return refreshTaskDlg(); }
    if (a === 'add-comment') {
      const inp = $('#cm-new', dlg); const v = inp.value.trim(); if (!v) return;
      ctx.t = readTaskForm(form, ctx.t);
      const c = { id: uid(), by: S.meId, text: v, at: nowISOts() };
      ctx.t.comments = [...(ctx.t.comments || []), c];
      if (!ctx.isNew) {
        const saved = list('tasks').find((x) => x.id === ctx.t.id);
        if (saved) saveItem('tasks', { ...saved, comments: [...(saved.comments || []), c] });
      }
      return refreshTaskDlg();
    }
    if (a === 'attach') return $('#task-file', dlg)?.click();
    if (a === 'open-doc') return openDoc(el.dataset.id);
    if (a === 'delete') { if (confirm('¿Eliminar esta tarea?')) { removeItem('tasks', ctx.t.id); closeDlg(); } return; }
  }

  if (ctx.kind === 'goal') {
    const form = dlg.querySelector('form');
    const keep = () => { const f = new FormData(form); ctx.g = { ...ctx.g, name: String(f.get('name') || ''), area: f.get('area'), owner: f.get('owner') || '' }; };
    if (a === 'add-kr') { const v = $('#kr-new', dlg).value.trim(); if (!v) return; keep(); ctx.g.krs = [...(ctx.g.krs || []), { id: uid(), t: v, done: false }]; dlg.innerHTML = goalHtml(ctx.g, !ctx.isNew); $('#kr-new', dlg)?.focus(); return; }
    if (a === 'del-kr') { keep(); ctx.g.krs = ctx.g.krs.filter((k) => k.id !== el.dataset.id); dlg.innerHTML = goalHtml(ctx.g, !ctx.isNew); return; }
    if (a === 'delete') { if (confirm('¿Eliminar esta meta?')) { removeItem('goals', ctx.g.id); closeDlg(); } return; }
  }

  if (ctx.kind === 'meeting') {
    const form = dlg.querySelector('form');
    const keep = () => { const f = new FormData(form); ctx.m = { ...ctx.m, date: f.get('date'), time: f.get('time'), place: String(f.get('place') || ''), agenda: String(f.get('agenda') || '').split('\n').map((s) => s.trim()).filter(Boolean), notes: String(f.get('notes') || '') }; };
    if (a === 'add-agr') { const v = $('#agr-new', dlg).value.trim(); if (!v) return; const who = $('#agr-who', dlg).value; keep(); ctx.m.agreements = [...(ctx.m.agreements || []), { id: uid(), t: v, owner: who, done: false }]; dlg.innerHTML = meetingHtml(ctx.m, !ctx.isNew); return; }
    if (a === 'del-agr') { keep(); ctx.m.agreements = ctx.m.agreements.filter((x) => x.id !== el.dataset.id); dlg.innerHTML = meetingHtml(ctx.m, !ctx.isNew); return; }
    if (a === 'delete') { if (confirm('¿Eliminar esta reunión?')) { removeItem('meetings', ctx.m.id); closeDlg(); } return; }
  }

  if (a === 'delete') {
    const map = { event: ['events', ctx.e?.id, '¿Eliminar este evento?'], rem: ['reminders', ctx.r?.id, '¿Eliminar este recordatorio?'], member: ['team', ctx.m?.id, '¿Quitar a esta persona del equipo? Sus tareas quedarán sin encargado.'] };
    const [col, id, q] = map[ctx.kind] || [];
    if (col && confirm(q)) { removeItem(col, id); closeDlg(); }
  }
});

dlg.addEventListener('change', (e) => {
  const el = e.target;
  if (!dlgCtx) return;
  if (el.id === 'task-file' && dlgCtx.kind === 'task') {
    const t = dlgCtx.t;
    uploadFiles(el.files, { folder: list('folders')[0] || 'General', task: t.id });
    refreshTaskDlg();
    return;
  }
  if (el.dataset.dlg === 'check' && dlgCtx.kind === 'task') {
    dlgCtx.t.checks = (dlgCtx.t.checks || []).map((c) => (c.id === el.dataset.id ? { ...c, done: el.checked } : c));
    refreshTaskDlg();
  }
  if (el.dataset.dlg === 'agr' && dlgCtx.kind === 'meeting') {
    dlgCtx.m.agreements = (dlgCtx.m.agreements || []).map((a) => (a.id === el.dataset.id ? { ...a, done: el.checked } : a));
  }
});

dlg.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter') return;
  const map = { 'ck-new': 'add-check', 'cm-new': 'add-comment', 'kr-new': 'add-kr', 'agr-new': 'add-agr' };
  const a = map[e.target.id];
  if (a) { e.preventDefault(); dlg.querySelector(`[data-dlg="${a}"]`)?.click(); }
});

dlg.addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.target;
  const f = new FormData(form);
  const ctx = dlgCtx;
  if (!ctx) return;
  if (ctx.kind === 'task') {
    const t = readTaskForm(form, ctx.t);
    if (!t.title) return;
    closeDlg();
    await saveItem('tasks', t);
  } else if (ctx.kind === 'event') {
    const ev = { ...ctx.e, title: String(f.get('title')).trim(), type: f.get('type'), date: f.get('date'), start: f.get('start') || '', end: f.get('end') || '', place: String(f.get('place') || '').trim(), owner: f.get('owner') || '', notes: String(f.get('notes') || '') };
    if (!ev.title || !ev.date) return;
    closeDlg();
    await saveItem('events', ev);
  } else if (ctx.kind === 'rem') {
    const r = { ...ctx.r, text: String(f.get('text')).trim(), date: f.get('date'), time: f.get('time') || '', who: f.get('who') || '' };
    if (!r.text) return;
    closeDlg();
    await saveItem('reminders', r);
  } else if (ctx.kind === 'goal') {
    const g = { ...ctx.g, name: String(f.get('name')).trim(), area: f.get('area'), owner: f.get('owner') || '' };
    if (!g.name) return;
    closeDlg();
    await saveItem('goals', g);
  } else if (ctx.kind === 'member') {
    const m = { ...ctx.m, name: String(f.get('name')).trim(), role: String(f.get('role') || '').trim(), area: f.get('area') };
    if (!m.name) return;
    closeDlg();
    await saveItem('team', m);
  } else if (ctx.kind === 'meeting') {
    const m = { ...ctx.m, date: f.get('date'), time: f.get('time') || '', place: String(f.get('place') || '').trim(), agenda: String(f.get('agenda') || '').split('\n').map((s) => s.trim()).filter(Boolean), notes: String(f.get('notes') || '') };
    closeDlg();
    await saveItem('meetings', m);
  }
});

// ---------- Instalación ----------
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferredInstall = e; render(); });
window.addEventListener('appinstalled', () => { deferredInstall = null; toast('App instalada'); render(); });
async function doInstall() {
  if (deferredInstall) {
    deferredInstall.prompt();
    await deferredInstall.userChoice.catch(() => null);
    deferredInstall = null;
    render();
  } else if (isIOS()) {
    toast('En Safari: Compartir → Agregar a pantalla de inicio');
  }
}

// ---------- Inicio ----------
if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
render();
if (S.code) load(!!S.data);
setInterval(() => { if (S.code && document.visibilityState === 'visible') load(true); }, 30000);
setInterval(checkNotify, 60000);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && S.code) { load(true); checkNotify(); } });
window.addEventListener('online', () => S.code && load(true));
window.addEventListener('offline', () => { S.online = false; render(); });
setTimeout(checkNotify, 4000);
