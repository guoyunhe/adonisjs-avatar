/**
 * adonisjs-avatar
 *
 * (c) guoyunhe
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

/**
 * Options for configuring the avatar package
 */
export interface AvatarConfig {
  /**
   * The drive disk to use for storing avatars.
   * Defaults to the default drive disk.
   */
  disk?: string;

  /**
   * The folder/directory within the disk to store avatars.
   * Defaults to 'avatars'.
   */
  folder?: string;

  /**
   * Width of the resized avatar in pixels.
   * Defaults to 256.
   */
  width?: number;

  /**
   * Height of the resized avatar in pixels.
   * Defaults to 256.
   */
  height?: number;

  /**
   * Allowed file extensions for avatar uploads.
   * Defaults to ['jpg', 'jpeg', 'png', 'webp', 'gif'].
   */
  allowedExtensions?: string[];

  /**
   * Maximum file size allowed for avatar uploads.
   * Accepts bytes as number or string with unit (e.g., '5mb').
   * Defaults to '5mb'.
   */
  maxSize?: string | number;

  /**
   * Output image format for stored avatars.
   * Defaults to 'avif'.
   */
  format?: 'avif' | 'webp' | 'png' | 'jpeg' | 'jpg' | 'gif';
}

/**
 * Result of a successful avatar upload
 */
export interface AvatarUploadResult {
  /**
   * The key/path of the uploaded file within the disk
   */
  key: string;

  /**
   * Version number for cache invalidation. Save it on the user record and
   * pass it to getUrl/getSignedUrl.
   */
  version: number;

  /**
   * The public URL of the uploaded avatar (if available)
   */
  url?: string;
}
