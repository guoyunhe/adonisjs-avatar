/**
 * adonisjs-avatar
 *
 * (c) guoyunhe
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import type { MultipartFile } from '@adonisjs/bodyparser';
import type { Disk } from '@adonisjs/drive';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import type { AvatarConfig, AvatarUploadResult } from './types.js';

/**
 * Parses a size string like '5mb' into bytes.
 */
function parseSize(size: string | number): number {
  if (typeof size === 'number') return size;

  const units: Record<string, number> = {
    b: 1,
    kb: 1024,
    mb: 1024 * 1024,
    gb: 1024 * 1024 * 1024,
  };

  const match = size.toLowerCase().match(/^(\d+(?:\.\d+)?)\s*(b|kb|mb|gb)?$/);
  if (!match) return 5 * 1024 * 1024;

  const value = parseFloat(match[1]);
  const unit = match[2] ?? 'b';
  return Math.floor(value * (units[unit] ?? 1));
}

/**
 * Manages avatar uploads, resizing, and deletion using AdonisJS Drive.
 *
 * @example
 * ```ts
 * import { AvatarManager } from 'adonisjs-avatar'
 *
 * const manager = new AvatarManager(disk, {
 *   folder: 'avatars',
 *   width: 256,
 *   height: 256,
 *   format: 'avif',
 *   allowedExtensions: ['jpg', 'jpeg', 'png', 'webp'],
 *   maxSize: '5mb',
 * })
 *
 * // Upload an avatar
 * const result = await manager.upload(file)
 * console.log(result.key)  // 'avatars/cuid.avif'
 * console.log(result.url)  // 'https://...' or undefined
 *
 * // Delete an avatar
 * await manager.delete('avatars/cuid.avif')
 * ```
 */
export class AvatarManager {
  #disk: Disk;
  #config: Required<Omit<AvatarConfig, 'disk'>>;

  constructor(disk: Disk, config: AvatarConfig) {
    this.#disk = disk;
    this.#config = {
      folder: config.folder ?? 'avatars',
      width: config.width ?? 256,
      height: config.height ?? 256,
      format: config.format ?? 'avif',
      allowedExtensions: config.allowedExtensions ?? ['jpg', 'jpeg', 'png', 'webp', 'gif'],
      maxSize: config.maxSize ?? '5mb',
    };
  }

  /**
   * Uploads an avatar file to the configured drive disk.
   * The image is resized to the configured dimensions if sharp is installed.
   *
   * @param file - The multipart file from the request
   * @returns The upload result containing the file key and optional URL
   *
   * @example
   * ```ts
   * const file = request.file('avatar')
   * if (!file) return response.badRequest('No avatar file provided')
   *
   * try {
   *   const result = await avatarManager.upload(file)
   *   user.avatar = result.key
   *   await user.save()
   * } catch (error) {
   *   return response.badRequest(error.message)
   * }
   * ```
   */
  async upload(file: MultipartFile): Promise<AvatarUploadResult> {
    this.#validate(file);

    const sourceExt = file.extname?.toLowerCase() ?? 'jpg';
    const outputExt = this.#normalizeFormat(this.#config.format);
    const key = `${this.#config.folder}/${randomUUID()}.${outputExt}`;
    const version = Date.now();

    const buffer = await this.#process(file.tmpPath!, outputExt, sourceExt);
    await this.#disk.put(key, buffer);

    let url: string | undefined;
    try {
      url = this.#appendVersion(await this.#disk.getUrl(key), version);
    } catch {
      // URL generation may not be supported for all disk types
    }

    file.markAsMoved(key, key);

    return { key, version, url };
  }

  /**
   * Deletes an avatar from the drive disk.
   *
   * @param key - The file key/path returned from a previous upload
   *
   * @example
   * ```ts
   * // Delete old avatar before uploading a new one
   * if (user.avatar) {
   *   await avatarManager.delete(user.avatar)
   * }
   * ```
   */
  async delete(key: string): Promise<void> {
    await this.#disk.delete(key);
  }

  /**
   * Returns the public URL for an avatar key.
   *
   * @param key - The file key/path returned from a previous upload
   * @returns The public URL of the avatar
   *
   * @example
   * ```ts
   * const url = await avatarManager.getUrl(user.avatar)
   * ```
   */
  async getUrl(key: string, avatarVersion?: number): Promise<string> {
    const url = await this.#disk.getUrl(key);
    return this.#appendVersion(url, avatarVersion);
  }

  /**
   * Returns a signed/temporary URL for an avatar key.
   *
   * @param key - The file key/path returned from a previous upload
   * @param options - Options for the signed URL (e.g., expiration)
   * @returns The signed URL of the avatar
   *
   * @example
   * ```ts
   * const url = await avatarManager.getSignedUrl(user.avatar, { expiresIn: '1h' })
   * ```
   */
  async getSignedUrl(
    key: string,
    options?: { expiresIn?: string | number },
    avatarVersion?: number,
  ): Promise<string> {
    const url = await this.#disk.getSignedUrl(key, options);
    return this.#appendVersion(url, avatarVersion);
  }

  /**
   * Validates the uploaded file against the configured restrictions.
   * Throws an error if validation fails.
   */
  #validate(file: MultipartFile): void {
    if (!file.tmpPath) {
      throw new Error('Avatar file has no temporary path. Ensure the file was uploaded correctly.');
    }

    const ext = file.extname?.toLowerCase();
    if (ext && !this.#config.allowedExtensions.includes(ext)) {
      throw new Error(
        `Avatar file extension ".${ext}" is not allowed. Allowed extensions: ${this.#config.allowedExtensions.join(', ')}`,
      );
    }

    const maxBytes = parseSize(this.#config.maxSize);
    if (file.size > maxBytes) {
      throw new Error(
        `Avatar file size (${file.size} bytes) exceeds the maximum allowed size of ${this.#config.maxSize}`,
      );
    }
  }

  /**
   * Processes the avatar image using sharp if available.
   * Returns a Buffer with the resized image, or reads the original file if sharp is unavailable.
   */
  async #process(tmpPath: string, outputFormat: string, sourceExt: string): Promise<Buffer> {
    let sharp: typeof import('sharp') | undefined;
    try {
      sharp = (await import('sharp')).default;
    } catch {
      // sharp is not installed - skip image processing
    }

    if (sharp) {
      return sharp(tmpPath)
        .resize(this.#config.width, this.#config.height, {
          fit: 'cover',
          position: 'centre',
        })
        .toFormat(outputFormat as Parameters<ReturnType<typeof import('sharp')>['toFormat']>[0])
        .toBuffer();
    }

    if (this.#normalizeFormat(sourceExt) !== outputFormat) {
      throw new Error('Avatar format conversion requires the "sharp" package to be installed.');
    }

    return readFile(tmpPath);
  }

  #normalizeFormat(format: string): string {
    return format === 'jpg' ? 'jpeg' : format;
  }

  #appendVersion(url: string, avatarVersion?: number): string {
    if (avatarVersion === undefined) {
      return url;
    }

    const [base, hash = ''] = url.split('#', 2);
    const separator = base.includes('?') ? '&' : '?';
    const withVersion = `${base}${separator}v=${encodeURIComponent(String(avatarVersion))}`;

    return hash ? `${withVersion}#${hash}` : withVersion;
  }
}
