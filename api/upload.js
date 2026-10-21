import { handleUpload } from '@vercel/blob/client';
import { requireCode } from './_lib.js';

// Entrega un permiso temporal para que el navegador suba un documento
// directamente al almacenamiento privado (sin pasar por el límite de 4,5 MB de las funciones).
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });
  if (!requireCode(req, res)) return;

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    if (body.type !== 'blob.generate-client-token') {
      return res.status(400).json({ error: 'Solicitud no válida' });
    }
    const result = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (pathname) => {
        if (!pathname.startsWith('docs/') || pathname.includes('..')) throw new Error('Ruta no permitida');
        return {
          addRandomSuffix: true,
          maximumSizeInBytes: 200 * 1024 * 1024,
          validUntil: Date.now() + 10 * 60 * 1000
        };
      }
    });
    return res.status(200).json(result);
  } catch (e) {
    console.error(e);
    return res.status(400).json({ error: e.message || 'No se pudo preparar la subida' });
  }
}
