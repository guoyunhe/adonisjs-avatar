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
   * Size of the small avatar variant in pixels.
   * Defaults to 64.
   */
  smallSize?: number;

  /**
   * Size of the medium avatar variant in pixels.
   * Defaults to 256.
   */
  mediumSize?: number;

  /**
   * Size of the large avatar variant in pixels.
   * Defaults to 1024.
   */
  largeSize?: number;

  /**
   * Deprecated alias for mediumSize.
   */
  width?: number;

  /**
   * Deprecated and ignored. Avatars are always square.
   */
  height?: number;

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
   * Storage keys for all generated avatar variants.
   */
  variants: {
    small: string;
    medium: string;
    large: string;
  };

  /**
   * The public URL of the uploaded avatar (if available)
   */
  url?: string;
}
