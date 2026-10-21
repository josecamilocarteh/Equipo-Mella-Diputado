import { del } from '@vercel/blob';
import { COLLECTIONS, loadData, requireCode, updateData } from './_lib.js';

function validItem(item) {
  return item && typeof item === 'object' && !Array.isArray(item) &&
    typeof item.id === 'string' && item.id.length > 0 && item.id.length <= 64 &&
    JSON.stringify(item).length <= 64 * 1024;
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (!requireCode(req, res)) return;

  try {
    if (req.method === 'GET') {
      const { data } = await loadData();
      return res.status(200).json(data);
    }

    if (req.method !== 'POST') {
      res.setHeader('Allow', 'GET, POST');
      return res.status(405).json({ error: 'Método no permitido' });
    }

    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const { op, col, item, id, folders } = body;

    if (op === 'folders') {
      if (!Array.isArray(folders) || folders.length > 40 || folders.some((f) => typeof f !== 'string' || !f.trim() || f.length > 60)) {
        return res.status(400).json({ error: 'Carpetas no válidas' });
      }
      const { data } = await updateData((d) => { d.folders = [...new Set(folders.map((f) => f.trim()))]; });
      return res.status(200).json(data);
    }

    if (!COLLECTIONS.includes(col)) return res.status(400).json({ error: 'Colección no válida' });

    if (op === 'upsert') {
      if (!validItem(item)) return res.status(400).json({ error: 'Elemento no válido' });
      const stamped = { ...item, updatedAt: new Date().toISOString() };
      const { data } = await updateData((d) => {
        d[col] = d[col] || [];
        const i = d[col].findIndex((x) => x.id === stamped.id);
        if (i >= 0) d[col][i] = stamped; else d[col].push(stamped);
      });
      return res.status(200).json(data);
    }

    if (op === 'delete') {
      if (typeof id !== 'string') return res.status(400).json({ error: 'Falta el identificador' });
      let removed = null;
      const { data } = await updateData((d) => {
        d[col] = d[col] || [];
        const i = d[col].findIndex((x) => x.id === id);
        if (i >= 0) removed = d[col].splice(i, 1)[0];
      });
      if (col === 'docs' && removed && typeof removed.pathname === 'string' && removed.pathname.startsWith('docs/')) {
        try { await del(removed.pathname); } catch (e) { console.error('No se pudo borrar el archivo', e); }
      }
      return res.status(200).json(data);
    }

    return res.status(400).json({ error: 'Operación no válida' });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e.message || 'Error del servidor' });
  }
}
