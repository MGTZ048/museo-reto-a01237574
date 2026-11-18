# Los Secretos del Arocena · Landing page

Landing page de reservas para el escape room "Los Secretos del Arocena" en el Museo Arocena (Torreón, Coahuila).

- **Frontend:** HTML, CSS y JavaScript sin frameworks, diseñado primero para celular.
- **Base de datos:** Supabase. Tiene las tablas `reservas` y `solicitudes`; cualquiera puede insertar registros, pero no leerlos. El cupo por horario se consulta con `slot_counts()`.
- **Hosting:** Vercel.

## Variables de entorno

| Variable | Dónde se obtiene |
| --- | --- |
| `SUPABASE_URL` | Supabase → Project Settings → API |
| `SUPABASE_ANON_KEY` | Supabase → Project Settings → API (clave `anon`, pública) |

`build.mjs` genera `dist/js/config.js` con estas variables. Si faltan, la página funciona en modo demo y guarda las reservas solo en el navegador.

## Desarrollo local

```bash
cp .env.example .env.local   # y llena los valores
node build.mjs               # genera dist/
```

## Base de datos

El esquema está en `supabase/migrations/`. Para aplicarlo:

```bash
supabase link --project-ref <ref>
supabase db push
```
