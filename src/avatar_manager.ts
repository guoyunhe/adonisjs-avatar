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
import type { AvatarConfig, AvatarUploadResult } from './types.js';

type AvatarVariantSize = 'small' | 'medium' | 'large';

const VARIANT_SIZES: AvatarVariantSize[] = ['small', 'medium', 'large'];

/**
 * Manages avatar uploads, resizing, and deletion using AdonisJS Drive.
 *
 * @example
 * ```ts
 * import { AvatarManager } from 'adonisjs-avatar'
 *
 * const manager = new AvatarManager(disk, {
 *   folder: 'avatars',
 *   smallSize: 64,
 *   mediumSize: 256,
 *   largeSize: 1024,
 *   format: 'avif',
 * })
 *
 * // Upload an avatar
 * const result = await manager.upload(file)
 * console.log(result.key)  // 'avatars/cuid_medium.avif'
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
      smallSize: config.smallSize ?? 64,
      mediumSize: config.mediumSize ?? config.width ?? 256,
      largeSize: config.largeSize ?? 1024,
      width: config.width ?? 256,
      height: config.height ?? 256,
      format: config.format ?? 'avif',
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

    const outputExt = this.#normalizeFormat(this.#config.format);
    const baseKey = `${this.#config.folder}/${randomUUID()}`;
    const variants = this.#createVariantKeys(baseKey, outputExt);
    const key = variants.medium;
    const version = Date.now();

    const buffers = await this.#process(file.tmpPath!, outputExt);
    for (const variantSize of VARIANT_SIZES) {
      await this.#disk.put(variants[variantSize], buffers[variantSize]);
    }

    let url: string | undefined;
    try {
      url = this.#appendVersion(await this.#disk.getUrl(key), version);
    } catch {
      // URL generation may not be supported for all disk types
    }

    file.markAsMoved(key, key);

    return { key, version, variants, url };
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
    const variants = this.#variantsFromAnyKey(key);

    for (const variantSize of VARIANT_SIZES) {
      try {
        await this.#disk.delete(variants[variantSize]);
      } catch {
        // ignore missing variant files
      }
    }

    if (!Object.values(variants).includes(key)) {
      await this.#disk.delete(key);
    }
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
  async getUrl(
    key: string,
    avatarVersion?: number,
    variantSize: AvatarVariantSize = 'medium',
  ): Promise<string> {
    const variantKey = this.#variantKeyFromAnyKey(key, variantSize);
    const url = await this.#disk.getUrl(variantKey);
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
    variantSize: AvatarVariantSize = 'medium',
  ): Promise<string> {
    const variantKey = this.#variantKeyFromAnyKey(key, variantSize);
    const url = await this.#disk.getSignedUrl(variantKey, options);
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

    const contentTypeHeader =
      file.headers?.['content-type'] ?? file.headers?.['Content-Type'] ?? undefined;
    const isImageContentType =
      typeof contentTypeHeader === 'string' && contentTypeHeader.toLowerCase().startsWith('image/');

    if (file.type && file.type !== 'image') {
      throw new Error('Avatar file must be an image.');
    }

    if (!file.type && !isImageContentType) {
      throw new Error('Avatar file must be an image.');
    }
  }

  /**
   * Processes the avatar image using sharp if available.
   * Returns a Buffer with the resized image, or reads the original file if sharp is unavailable.
   */
  async #process(
    tmpPath: string,
    outputFormat: string,
  ): Promise<Record<AvatarVariantSize, Buffer>> {
    let sharp: typeof import('sharp') | undefined;
    try {
      sharp = (await import('sharp')).default;
    } catch {
      // sharp is not installed - skip image processing
    }

    if (!sharp) {
      throw new Error('Avatar resizing requires the "sharp" package to be installed.');
    }

    const format = outputFormat as Parameters<ReturnType<typeof import('sharp')>['toFormat']>[0];
    const small = await sharp(tmpPath)
      .resize(this.#config.smallSize, this.#config.smallSize, {
        fit: 'cover',
        position: 'centre',
      })
      .toFormat(format)
      .toBuffer();

    const medium = await sharp(tmpPath)
      .resize(this.#config.mediumSize, this.#config.mediumSize, {
        fit: 'cover',
        position: 'centre',
      })
      .toFormat(format)
      .toBuffer();

    const large = await sharp(tmpPath)
      .resize(this.#config.largeSize, this.#config.largeSize, {
        fit: 'cover',
        position: 'centre',
      })
      .toFormat(format)
      .toBuffer();

    return { small, medium, large };
  }

  #createVariantKeys(baseKey: string, outputExt: string): Record<AvatarVariantSize, string> {
    return {
      small: `${baseKey}_small.${outputExt}`,
      medium: `${baseKey}_medium.${outputExt}`,
      large: `${baseKey}_large.${outputExt}`,
    };
  }

  #variantsFromAnyKey(key: string): Record<AvatarVariantSize, string> {
    const match = key.match(/^(.*?)(?:_(small|medium|large))\.([^./]+)$/);
    if (match) {
      const baseKey = match[1];
      const ext = match[3];
      return this.#createVariantKeys(baseKey, ext);
    }

    const legacyMatch = key.match(/^(.*)\.([^./]+)$/);
    if (legacyMatch) {
      const baseKey = legacyMatch[1];
      const ext = legacyMatch[2];

      return {
        small: `${baseKey}_small.${ext}`,
        medium: key,
        large: `${baseKey}_large.${ext}`,
      };
    }

    return {
      small: `${key}_small`,
      medium: key,
      large: `${key}_large`,
    };
  }

  #variantKeyFromAnyKey(key: string, variantSize: AvatarVariantSize): string {
    return this.#variantsFromAnyKey(key)[variantSize];
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
