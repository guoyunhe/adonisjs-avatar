/**
 * adonisjs-avatar
 *
 * (c) guoyunhe
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import type { AvatarConfig } from './types.js';

/**
 * Define configuration for the avatar package.
 *
 * @example
 * ```ts
 * // config/avatar.ts
 * import { defineConfig } from 'adonisjs-avatar'
 *
 * export default defineConfig({
 *   disk: 'local',
 *   folder: 'avatars',
 *   smallSize: 64,
 *   mediumSize: 256,
 *   largeSize: 1024,
 *   format: 'avif',
 *   allowedExtensions: ['jpg', 'jpeg', 'png', 'webp'],
 *   maxSize: '5mb',
 * })
 * ```
 */
export function defineConfig(config: AvatarConfig): AvatarConfig {
  return {
    disk: config.disk,
    folder: config.folder ?? 'avatars',
    smallSize: config.smallSize ?? 64,
    mediumSize: config.mediumSize ?? config.width ?? 256,
    largeSize: config.largeSize ?? 1024,
    width: config.width,
    height: config.height,
    format: config.format ?? 'avif',
    allowedExtensions: config.allowedExtensions ?? ['jpg', 'jpeg', 'png', 'webp', 'gif'],
    maxSize: config.maxSize ?? '5mb',
  };
}
