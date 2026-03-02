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
 *   width: 256,
 *   height: 256,
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
    width: config.width ?? 256,
    height: config.height ?? 256,
    format: config.format ?? 'avif',
    allowedExtensions: config.allowedExtensions ?? ['jpg', 'jpeg', 'png', 'webp', 'gif'],
    maxSize: config.maxSize ?? '5mb',
  };
}
