# Equipo Mella

App web instalable para organizar al equipo del diputado Cristián Mella. Incluye:

- Tareas con encargados, fechas límite, recordatorios, checklist, comentarios y adjuntos.
- Planificador semanal y recordatorios.
- Alertas dentro de la app y avisos en el celular.
- Documentos privados organizados por carpeta.
- Metas con resultados clave, carga del equipo y reuniones con acuerdos.

Todo el equipo comparte los mismos datos, guardados en Vercel Blob en modo privado.

## Publicar en Vercel

1. Crea un proyecto nuevo en Vercel con esta carpeta. El framework es "Other"; la configuración ya está en `vercel.json`.
2. En **Storage**, crea un almacenamiento **Blob** con acceso **Private** y conéctalo al proyecto. Eso agrega la variable `BLOB_READ_WRITE_TOKEN`.
3. En **Settings → Environment Variables**, agrega `TEAM_CODE` con el código de acceso del equipo (por ejemplo `D6-XXXX-XXXX`) y márcala como *Sensitive*.
4. Publica el proyecto. Para cambiar el código de acceso, edita `TEAM_CODE` y vuelve a publicar.

## Cómo se usa

- Cada persona entra con el código del equipo y elige su nombre. La primera vez se agrega con "Soy nuevo en el equipo".
- **Android (Chrome):** menú ⋮ → *Instalar app*, o el botón "Instalar" dentro de la app.
- **iPhone (Safari):** Compartir → *Agregar a pantalla de inicio*.
- Los avisos se activan en *Planificador → Activar avisos*. En iPhone funcionan solo con la app instalada.

## Límites de esta versión

- El acceso es con un código compartido, no con cuentas individuales.
- Los avisos llegan mientras la app está abierta o en segundo plano reciente. No hay notificaciones push con la app cerrada.
- Cada archivo puede pesar hasta 200 MB.
