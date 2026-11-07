/**
 * Rebuild both downloadable versions from the current source.
 * PHP ZIP has install.php at its root; local configuration and player data are never included.
 */
import { promises as fs } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { ZipWriter } from './lib/zip.mjs';
// PHP assets are compiled only when the PHP source tree is present.
// The independent Next.js source archive does not require build-php.mjs.

const root = process.cwd();
const outDir = path.join(root, 'downloads');
const skipDirs = new Set(['node_modules', '.next', '.git', 'downloads', '.turbo', 'coverage', 'next-source', 'test-results', 'playwright-report', '.checks']);
const skipFiles = new Set(['.env', '.env.local', 'config.local.php', 'next-env.d.ts', 'tsconfig.tsbuildinfo']);
const allowedHidden = new Set(['.htaccess', '.env.example']);
const text = lines => lines.join('\n') + '\n';

async function collect(dir, base = dir, acc = []) {
  const entries = (await fs.readdir(dir, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name));
  for (const entry of entries) {
    if (entry.name.startsWith('.') && !allowedHidden.has(entry.name)) continue;
    if (entry.name.startsWith('.valley-config-')) continue;
    const full = path.join(dir, entry.name);
    const relative = path.relative(base, full).split(path.sep).join('/');
    if (entry.isDirectory()) {
      if (skipDirs.has(entry.name)) continue;
      acc.push({ relative, full, dir: true });
      await collect(full, base, acc);
    } else if (entry.isFile()) {
      if (skipFiles.has(entry.name) || /\.(?:log|zip|tmp|tsbuildinfo)$/.test(entry.name)) continue;
      acc.push({ relative, full, dir: false });
    }
  }
  return acc;
}

async function addFiles(zip, files, prefix = '') {
  for (const file of files) {
    const target = prefix ? `${prefix}/${file.relative}` : file.relative;
    if (file.dir) zip.addDirectory(target);
    else zip.add(target, await fs.readFile(file.full));
  }
}

async function atomicWrite(name, buffer) {
  const target = path.join(outDir, name);
  const temporary = `${target}.tmp`;
  await fs.writeFile(temporary, buffer);
  await fs.rename(temporary, target);
  return { bytes: buffer.length, sha256: createHash('sha256').update(buffer).digest('hex') };
}

async function main() {
  await fs.mkdir(outDir, { recursive: true });
  const phpRoot = path.join(root, 'php');
  const hasPhp = await fs.access(path.join(phpRoot, 'install.php')).then(() => true, () => false);
  if (hasPhp) await import('./build-php.mjs');
  const nextFiles = (await collect(root)).filter(file =>
    file.relative !== 'php' && !file.relative.startsWith('php/') &&
    file.relative !== 'src/php-client.tsx' &&
    file.relative !== 'scripts/build-php.mjs' &&
    !/^scripts\/test-php-[^/]+\.mjs$/.test(file.relative)
  );
  const phpFiles = hasPhp ? await collect(phpRoot) : [];
  if (hasPhp) {
    for (const required of ['install.php', 'install-cli.php', 'lib/installer.php', 'lib/config.php', 'schema.sql', '.htaccess', 'data/.htaccess', 'assets/installer.css', 'assets/installer.js', 'assets/app.js', 'data/config.json']) {
      if (!phpFiles.some(file => !file.dir && file.relative === required)) throw new Error(`PHP archive is missing ${required}`);
    }
    if (phpFiles.some(file => file.relative.endsWith('config.local.php'))) throw new Error('Local configuration must not be packaged');
  }

  const nextZip = new ZipWriter();
  nextZip.addDirectory('valley-next');
  await addFiles(nextZip, nextFiles, 'valley-next');
  nextZip.add('valley-next/README.md', text([
    '# Тихая долина — Next.js + PostgreSQL', '',
    'В этом архиве только исходники Next.js. PHP-файлов здесь нет.',
    'Установка: npm install, настройте DATABASE_URL, npx drizzle-kit push, npm run build.',
    'Полная инструкция: README-NEXT.md. Архив PHP скачивается отдельно в админке.',
  ]));

  const phpZip = new ZipWriter();
  // No nesting: upload extracted contents directly to the PHP hosting document root.
  if (hasPhp) await addFiles(phpZip, phpFiles);
  // START-HERE.txt is already part of phpFiles; never add it a second time.

  // Reject regressions where one version silently gets bundled into the other.
  if (nextFiles.some(file => file.relative === 'php' || file.relative.startsWith('php/'))) throw new Error('Next.js ZIP contains PHP files');
  if (phpFiles.some(file => file.relative === 'next-source' || file.relative.startsWith('next-source/'))) throw new Error('PHP ZIP contains Next.js source');
  const nextInfo = await atomicWrite('valley-next.zip', nextZip.buffer());
  const phpInfo = hasPhp ? await atomicWrite('valley-php.zip', phpZip.buffer()) : null;
  // Keep a PHP archive uploaded separately to a Next-only deployment.
  const schema = hasPhp ? await fs.readFile(path.join(phpRoot, 'schema.sql'), 'utf8') : '';
  const manifest = {
    builtAt: new Date().toISOString(),
    archives: { next: nextInfo, php: phpInfo },
    phpInstaller: {
      available: hasPhp,
      version: hasPhp ? '1.1.0-php' : null,
      automaticConfiguration: hasPhp,
      tables: (schema.match(/CREATE TABLE IF NOT EXISTS/g) ?? []).length,
      entryPoint: hasPhp ? 'install.php' : null,
      layout: hasPhp ? 'archive-root' : null,
    },
  };
  await atomicWrite('manifest.json', Buffer.from(JSON.stringify(manifest, null, 2) + '\n'));
  console.log(JSON.stringify({ ok: true, ...manifest, files: { next: nextFiles.filter(f => !f.dir).length + 1, php: hasPhp ? phpFiles.filter(f => !f.dir).length : 0 } }, null, 2));
}

main().catch(error => {
  console.error('build-downloads failed:', error);
  process.exit(1);
});
