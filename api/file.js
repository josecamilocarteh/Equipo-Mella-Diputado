import { get, issueSignedToken, presignUrl } from '@vercel/blob';
import { Readable } from 'node:stream';
import { requireCode } from './_lib.js';

// Devuelve un enlace temporal (5 minutos) para abrir un documento privado.
// Si el enlace firmado no está disponible, transmite el archivo directamente.
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (!requireCode(req, res)) return;

  const pathname = String((req.query && req.query.p) || '');
  if (!pathname.startsWith('docs/') || pathname.includes('..')) {
    return res.status(400).json({ error: 'Documento no válido' });
  }

  if (req.query.mode !== 'stream') {
    try {
      const validUntil = Date.now() + 5 * 60 * 1000;
      const token = await issueSignedToken({ pathname, operations: ['get'], validUntil });
      const { presignedUrl } = await presignUrl(token, { operation: 'get', pathname, access: 'private', validUntil });
      return res.status(200).json({ url: presignedUrl });
    } catch (e) {
      console.error('Enlace firmado no disponible, se usa transmisión', e);
    }
  }

  try {
    const r = await get(pathname, { access: 'private' });
    if (!r || !r.stream) return res.status(404).json({ error: 'No se encontró el documento' });
    res.setHeader('Content-Type', r.blob.contentType || 'application/octet-stream');
    const name = String(req.query.n || pathname.split('/').pop()).replace(/[\r\n"]/g, '');
    res.setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(name)}`);
    Readable.fromWeb(r.stream).pipe(res);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'No se pudo abrir el documento' });
  }
}
