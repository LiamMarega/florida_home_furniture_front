#!/usr/bin/env node
// Checks that every dynamic URL built in app/sitemap.ts (`${baseUrl}/segment/${value}`) points to an
// existing App Router route (app/segment/[param]/page.tsx), so the sitemap cannot list URLs that 404.
// Usage: node scripts/check-sitemap-routes.mjs
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const source = readFileSync(join(root, 'app/sitemap.ts'), 'utf8');

const templates = [...source.matchAll(/`\$\{baseUrl\}(\/[^`]*\$\{[^`]*)`/g)].map(match => match[1]);
if (templates.length === 0) {
  console.error('check-sitemap-routes: no dynamic sitemap URL found in app/sitemap.ts');
  process.exit(1);
}

function routeExists(segments) {
  let dir = join(root, 'app');
  for (const segment of segments) {
    if (segment.includes('${')) {
      const dynamic = existsSync(dir) ? readdirSync(dir).find(name => /^\[[^\]]+\]$/.test(name)) : undefined;
      if (!dynamic) return false;
      dir = join(dir, dynamic);
    } else {
      dir = join(dir, segment);
    }
  }
  return ['page.tsx', 'page.ts', 'page.jsx', 'page.js'].some(file => existsSync(join(dir, file)));
}

let failed = false;
for (const template of templates) {
  const segments = template.split('/').filter(Boolean);
  const ok = routeExists(segments);
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${template}`);
  if (!ok) failed = true;
}
process.exit(failed ? 1 : 0);
