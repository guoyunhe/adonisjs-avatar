/**
 * adonisjs-avatar
 *
 * (c) guoyunhe
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { MultipartFile } from '@adonisjs/bodyparser';
import { Disk } from '@adonisjs/drive';
import { FSDriver } from '@adonisjs/drive/drivers/fs';
import { test } from '@japa/runner';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { AvatarManager } from '../src/avatar_manager.js';
import { defineConfig } from '../src/define_config.js';

/**
 * Creates a temporary directory and returns its path.
 */
async function createTmpDir(prefix: string): Promise<string> {
  const dir = join(tmpdir(), `adonisjs-avatar-test-${prefix}-${Date.now()}`);
  await mkdir(dir, { recursive: true });
  return dir;
}

/**
 * Creates a fake MultipartFile for testing.
 */
function createFakeFile(
  opts: Partial<{
    fieldName: string;
    clientName: string;
    extname: string;
    size: number;
    tmpPath: string;
  }> = {},
): MultipartFile {
  const file = new MultipartFile(
    {
      fieldName: opts.fieldName ?? 'avatar',
      clientName: opts.clientName ?? 'photo.jpg',
      headers: { 'content-type': 'image/jpeg' },
    },
    {},
  );
  file.extname = opts.extname ?? 'jpg';
  file.size = opts.size ?? 1024;
  file.type = 'image';
  file.subtype = 'jpeg';
  if (opts.tmpPath) file.tmpPath = opts.tmpPath;
  return file;
}

/**
 * Creates a real image file in a temp directory using sharp and returns
 * a MultipartFile pointed at it.
 */
async function createRealImageFile(dir: string, filename = 'test.jpg'): Promise<MultipartFile> {
  const tmpPath = join(dir, filename);

  // Use sharp to create a valid 10x10 JPEG
  const sharp = (await import('sharp')).default;
  const imageBuffer = await sharp({
    create: { width: 10, height: 10, channels: 3, background: { r: 100, g: 150, b: 200 } },
  })
    .jpeg()
    .toBuffer();

  await writeFile(tmpPath, imageBuffer);

  const file = new MultipartFile(
    {
      fieldName: 'avatar',
      clientName: filename,
      headers: { 'content-type': 'image/jpeg' },
    },
    {},
  );
  file.extname = 'jpg';
  file.size = imageBuffer.length;
  file.type = 'image';
  file.subtype = 'jpeg';
  file.tmpPath = tmpPath;
  return file;
}

/**
 * Creates a Disk backed by the local filesystem.
 */
function createDisk(location: string): Disk {
  const driver = new FSDriver({
    location,
    visibility: 'public',
    urlBuilder: {
      async generateURL(key) {
        return `http://localhost/uploads/${key}`;
      },
    },
  });
  return new Disk(driver);
}

test.group('defineConfig', () => {
  test('returns defaults when no options are provided', ({ assert }) => {
    const config = defineConfig({});
    assert.equal(config.folder, 'avatars');
    assert.deepEqual(config.sizes, {
      small: 64,
      medium: 256,
      large: 1024,
    });
    assert.equal(config.format, 'avif');
  });

  test('allows overriding each option', ({ assert }) => {
    const config = defineConfig({
      folder: 'profile-pics',
      sizes: {
        small: 32,
        medium: 128,
        large: 512,
      },
      format: 'webp',
      disk: 's3',
    });
    assert.equal(config.folder, 'profile-pics');
    assert.deepEqual(config.sizes, {
      small: 32,
      medium: 128,
      large: 512,
    });
    assert.equal(config.format, 'webp');
    assert.equal(config.disk, 's3');
  });
});

test.group('AvatarManager - validation', (group) => {
  let tmpDir: string;
  let disk: Disk;
  let manager: AvatarManager;

  group.setup(async () => {
    tmpDir = await createTmpDir('validation');
    disk = createDisk(tmpDir);
    manager = new AvatarManager(disk, defineConfig({}));
  });

  group.teardown(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  test('throws when file has no tmpPath', async ({ assert }) => {
    const file = createFakeFile();
    await assert.rejects(() => manager.upload(file), /Avatar file has no temporary path/);
  });

  test('throws when file is not an image', async ({ assert }) => {
    const dir = await createTmpDir('ext-check');
    try {
      const tmpPath = join(dir, 'malware.exe');
      await writeFile(tmpPath, 'not-an-image');
      const file = createFakeFile({ extname: 'exe', tmpPath, size: 10 });
      file.type = 'application';
      file.subtype = 'octet-stream';
      await assert.rejects(() => manager.upload(file), /must be an image/);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});

test.group('AvatarManager - upload', (group) => {
  let tmpDir: string;
  let storageDir: string;
  let disk: Disk;
  let manager: AvatarManager;

  group.setup(async () => {
    tmpDir = await createTmpDir('upload');
    storageDir = await createTmpDir('storage');
    disk = createDisk(storageDir);
    manager = new AvatarManager(disk, defineConfig({}));
  });

  group.teardown(async () => {
    await rm(tmpDir, { recursive: true, force: true });
    await rm(storageDir, { recursive: true, force: true });
  });

  test('uploads a file and returns key and url', async ({ assert }) => {
    const file = await createRealImageFile(tmpDir);
    const result = await manager.upload(file);

    assert.isString(result.key);
    assert.isNumber(result.version);
    assert.isAbove(result.version, 0);
    assert.match(result.key, /^avatars\/.+_medium\.avif$/);
    assert.match(result.variants.small, /^avatars\/.+_small\.avif$/);
    assert.match(result.variants.medium, /^avatars\/.+_medium\.avif$/);
    assert.match(result.variants.large, /^avatars\/.+_large\.avif$/);
    assert.isString(result.url);
    assert.include(result.url!, result.key);
    assert.include(result.url!, `v=${result.version}`);

    assert.isTrue(await disk.exists(result.variants.small));
    assert.isTrue(await disk.exists(result.variants.medium));
    assert.isTrue(await disk.exists(result.variants.large));
  });

  test('marks the file as moved after upload', async ({ assert }) => {
    const file = await createRealImageFile(tmpDir, 'moved-test.jpg');
    await manager.upload(file);
    assert.equal(file.state, 'moved');
  });

  test('uses the configured folder', async ({ assert }) => {
    const customManager = new AvatarManager(disk, defineConfig({ folder: 'profile-pics' }));
    const file = await createRealImageFile(tmpDir, 'folder-test.jpg');
    const result = await customManager.upload(file);
    assert.match(result.key, /^profile-pics\/.+_medium\.avif$/);
  });

  test('uses the configured output format', async ({ assert }) => {
    const customManager = new AvatarManager(disk, defineConfig({ format: 'png' }));
    const file = await createRealImageFile(tmpDir, 'format-test.jpg');
    const result = await customManager.upload(file);
    assert.match(result.key, /^avatars\/.+_medium\.png$/);
  });
});

test.group('AvatarManager - delete', (group) => {
  let tmpDir: string;
  let storageDir: string;
  let disk: Disk;
  let manager: AvatarManager;

  group.setup(async () => {
    tmpDir = await createTmpDir('delete');
    storageDir = await createTmpDir('storage-delete');
    disk = createDisk(storageDir);
    manager = new AvatarManager(disk, defineConfig({}));
  });

  group.teardown(async () => {
    await rm(tmpDir, { recursive: true, force: true });
    await rm(storageDir, { recursive: true, force: true });
  });

  test('deletes an uploaded avatar', async ({ assert }) => {
    const file = await createRealImageFile(tmpDir, 'to-delete.jpg');
    const { key, variants } = await manager.upload(file);

    assert.isTrue(await disk.exists(variants.small));
    assert.isTrue(await disk.exists(variants.medium));
    assert.isTrue(await disk.exists(variants.large));

    await manager.delete(key);

    assert.isFalse(await disk.exists(variants.small));
    assert.isFalse(await disk.exists(variants.medium));
    assert.isFalse(await disk.exists(variants.large));
  });
});

test.group('AvatarManager - getUrl', (group) => {
  let tmpDir: string;
  let storageDir: string;
  let disk: Disk;
  let manager: AvatarManager;

  group.setup(async () => {
    tmpDir = await createTmpDir('geturl');
    storageDir = await createTmpDir('storage-geturl');
    disk = createDisk(storageDir);
    manager = new AvatarManager(disk, defineConfig({}));
  });

  group.teardown(async () => {
    await rm(tmpDir, { recursive: true, force: true });
    await rm(storageDir, { recursive: true, force: true });
  });

  test('returns the url for an uploaded avatar', async ({ assert }) => {
    const file = await createRealImageFile(tmpDir, 'url-test.jpg');
    const { key, version } = await manager.upload(file);

    const url = await manager.getUrl(key, version);
    assert.isString(url);
    assert.include(url, key);
    assert.include(url, `v=${version}`);
  });

  test('returns the url for the requested variant size', async ({ assert }) => {
    const file = await createRealImageFile(tmpDir, 'url-size-test.jpg');
    const { key, version, variants } = await manager.upload(file);

    const smallUrl = await manager.getUrl(key, version, 'small');
    assert.include(smallUrl, variants.small);
    assert.include(smallUrl, `v=${version}`);
  });

  test('appends version query param to url', async ({ assert }) => {
    const key = 'avatars/test.jpg';
    const url = await manager.getUrl(key, 123);

    assert.isString(url);
    assert.include(url, 'v=123');
  });
});
