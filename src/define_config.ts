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
 *   sizes: {
 *     small: 64,
 *     medium: 256,
 *     large: 1024,
 *   },
 *   format: 'avif',
 * })
 * ```
 */
export function defineConfig(config: AvatarConfig): AvatarConfig {
  const small = config.sizes?.small ?? config.smallSize ?? 64;
  const medium = config.sizes?.medium ?? config.mediumSize ?? config.width ?? 256;
  const large = config.sizes?.large ?? config.largeSize ?? 1024;

  return {
    disk: config.disk,
    folder: config.folder ?? 'avatars',
    sizes: {
      small,
      medium,
      large,
    },
    smallSize: small,
    mediumSize: medium,
    largeSize: large,
    width: config.width,
    height: config.height,
    format: config.format ?? 'avif',
  };
}
