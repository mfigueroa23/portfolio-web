import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { contentTypeFor, entityTag, resolveStaticFile } from './static-files';

describe('resolveStaticFile', () => {
  const root = mkdtempSync(join(tmpdir(), 'site-'));
  mkdirSync(join(root, 'es'));
  writeFileSync(join(root, 'index.html'), '<html>home</html>');
  writeFileSync(join(root, 'es', 'index.html'), '<html>inicio</html>');
  writeFileSync(join(root, 'robots.txt'), 'User-agent: *');
  writeFileSync(join(root, 'hello world.txt'), 'hi');
  mkdirSync(join(root, 'empty'));

  it('finds a file of the site', async () => {
    const file = await resolveStaticFile(root, '/robots.txt');
    expect(file?.path).toBe(join(root, 'robots.txt'));
    expect(file?.size).toBe(13);
  });

  it('serves the index of a directory, with or without the trailing slash', async () => {
    expect((await resolveStaticFile(root, '/'))?.path).toBe(join(root, 'index.html'));
    expect((await resolveStaticFile(root, '/es'))?.path).toBe(join(root, 'es', 'index.html'));
    expect((await resolveStaticFile(root, '/es/'))?.path).toBe(join(root, 'es', 'index.html'));
  });

  it('decodes the path', async () => {
    expect((await resolveStaticFile(root, '/hello%20world.txt'))?.path).toBe(
      join(root, 'hello world.txt'),
    );
  });

  it('answers null for missing files and directories without an index', async () => {
    expect(await resolveStaticFile(root, '/projects')).toBeNull();
    expect(await resolveStaticFile(root, '/empty')).toBeNull();
  });

  it('never leaves the site directory', async () => {
    expect(await resolveStaticFile(root, '/../../etc/passwd')).toBeNull();
    expect(await resolveStaticFile(root, '/%2e%2e/%2e%2e/etc/passwd')).toBeNull();
    expect(await resolveStaticFile(root, '/..%2f..%2fetc/passwd')).toBeNull();
  });

  it('rejects malformed paths and null bytes', async () => {
    expect(await resolveStaticFile(root, '/%E0%A4%A')).toBeNull();
    expect(await resolveStaticFile(root, '/robots.txt%00.html')).toBeNull();
  });
});

describe('contentTypeFor', () => {
  it('types the files the site serves', () => {
    expect(contentTypeFor('/a/index.html')).toBe('text/html; charset=utf-8');
    expect(contentTypeFor('main-GAP437HP.js')).toBe('text/javascript; charset=utf-8');
    expect(contentTypeFor('worker.mjs')).toBe('text/javascript; charset=utf-8');
    expect(contentTypeFor('styles.CSS')).toBe('text/css; charset=utf-8');
    expect(contentTypeFor('site.webmanifest')).toBe('application/manifest+json');
    expect(contentTypeFor('hero-bg.webp')).toBe('image/webp');
    expect(contentTypeFor('favicon.ico')).toBe('image/x-icon');
  });

  it('falls back to a binary type', () => {
    expect(contentTypeFor('archive.unknown')).toBe('application/octet-stream');
    expect(contentTypeFor('README')).toBe('application/octet-stream');
  });
});

describe('entityTag', () => {
  it('derives a strong tag from the modification time and size', () => {
    expect(entityTag(1_700_000_000_500, 255)).toBe('"6553f100-ff"');
  });
});
