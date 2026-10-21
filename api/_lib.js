import { get, put, BlobPreconditionFailedError } from '@vercel/blob';
import { timingSafeEqual } from 'node:crypto';

export const DATA_PATH = 'mella/data.json';

export const COLLECTIONS = ['team', 'tasks', 'events', 'reminders', 'goals', 'docs', 'meetings'];

// --- Acceso -------------------------------------------------------------

export function codeOk(code) {
  const expected = process.env.TEAM_CODE || '';
  if (!expected || typeof code !== 'string') return false;
  const a = Buffer.from(code.trim().toUpperCase());
  const b = Buffer.from(expected.trim().toUpperCase());
  return a.length === b.length && timingSafeEqual(a, b);
}

export function requireCode(req, res) {
  const code = req.headers['x-team-code'];
  if (!codeOk(Array.isArray(code) ? code[0] : code)) {
    res.status(401).json({ error: 'Código de equipo incorrecto' });
    return false;
  }
  return true;
}

// --- Datos iniciales ----------------------------------------------------

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

function seed() {
  const kr = (t) => ({ id: uid(), t, done: false });
  return {
    version: 1,
    folders: [
      'Minutas de comisión',
      'Mociones e indicaciones',
      'Oficios de fiscalización',
      'Prensa y audiovisual',
      'Territorio D6',
      'Actas de equipo'
    ],
    team: [
      { id: 'diputado', name: 'Cristián Mella', role: 'Diputado · Distrito 6', area: 'gab', status: 'Disponible' }
    ],
    tasks: [],
    events: [],
    reminders: [],
    meetings: [],
    docs: [],
    goals: [
      { id: uid(), name: 'Prestaciones TEA en el GES', area: 'leg', owner: '', krs: [kr('Presentar la solicitud de resolución'), kr('Oficiar por el cumplimiento de los artículos transitorios de la Ley N° 21.545'), kr('Audiencia con agrupaciones TEA del distrito')] },
      { id: uid(), name: 'Hoja de ruta Distrito 6', area: 'ter', owner: '', krs: [kr('Definir comunas prioritarias'), kr('Calendarizar visitas a las comunas'), kr('Catastro de organizaciones sociales')] },
      { id: uid(), name: 'Presencia en medios regionales', area: 'pre', owner: '', krs: [kr('Entrevistas en medios de la región'), kr('Cápsula mensual sobre salud'), kr('Calendario editorial del trimestre')] },
      { id: uid(), name: 'Presupuesto 2027: puntos políticos', area: 'gab', owner: '', krs: [kr('Análisis de la partida Salud'), kr('Definir prioridades del distrito'), kr('Vocería y posición en la votación')] }
    ]
  };
}

// --- Lectura y escritura con control de concurrencia ---------------------

async function streamToString(stream) {
  const reader = stream.getReader();
  const chunks = [];
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(Buffer.from(value));
  }
  return Buffer.concat(chunks).toString('utf8');
}

export async function loadData() {
  const r = await get(DATA_PATH, { access: 'private', useCache: false });
  if (!r || r.statusCode !== 200 || !r.stream) {
    const data = seed();
    try {
      const w = await put(DATA_PATH, JSON.stringify(data), {
        access: 'private', addRandomSuffix: false, contentType: 'application/json', allowOverwrite: false
      });
      return { data, etag: w.etag };
    } catch (e) {
      // Otra solicitud lo creó al mismo tiempo: leer de nuevo.
      const again = await get(DATA_PATH, { access: 'private', useCache: false });
      return { data: JSON.parse(await streamToString(again.stream)), etag: again.blob.etag };
    }
  }
  const text = await streamToString(r.stream);
  return { data: JSON.parse(text), etag: r.blob.etag };
}

const MAX_BYTES = 4 * 1024 * 1024;

// Aplica `mutate(data)` y guarda solo si nadie escribió entremedio; reintenta si hubo choque.
export async function updateData(mutate) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data, etag } = await loadData();
    const result = mutate(data);
    const body = JSON.stringify(data);
    if (Buffer.byteLength(body) > MAX_BYTES) throw new Error('Los datos superan el tamaño permitido');
    try {
      const w = await put(DATA_PATH, body, {
        access: 'private', addRandomSuffix: false, contentType: 'application/json', ifMatch: etag
      });
      return { data, etag: w.etag, result };
    } catch (e) {
      if (e instanceof BlobPreconditionFailedError || /precondition/i.test(String(e && e.message))) {
        await new Promise((r) => setTimeout(r, 80 + Math.random() * 200));
        continue;
      }
      throw e;
    }
  }
  throw new Error('No se pudo guardar por cambios simultáneos; intenta de nuevo');
}
