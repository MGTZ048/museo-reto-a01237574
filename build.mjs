// Genera dist/ para Vercel e inyecta las variables de entorno de Supabase.
// Uso: node build.mjs   (lee SUPABASE_URL y SUPABASE_ANON_KEY del entorno o de .env.local)
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';

const env = { ...process.env };
if (existsSync('.env.local')) {
  for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !env[m[1]]) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

const config = {
  SUPABASE_URL: env.SUPABASE_URL || '',
  SUPABASE_ANON_KEY: env.SUPABASE_ANON_KEY || '',
};
if (!config.SUPABASE_URL || !config.SUPABASE_ANON_KEY) {
  console.warn('⚠️  Faltan SUPABASE_URL o SUPABASE_ANON_KEY: la página funcionará en modo demo.');
}

rmSync('dist', { recursive: true, force: true });
mkdirSync('dist');
for (const p of ['index.html', 'css', 'js', 'assets']) {
  if (existsSync(p)) cpSync(p, `dist/${p}`, { recursive: true });
}
writeFileSync('dist/js/config.js', `window.ENV = ${JSON.stringify(config)};\n`);
console.log('✓ dist/ listo');
