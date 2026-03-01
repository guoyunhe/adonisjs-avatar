/**
 * adonisjs-avatar
 *
 * (c) guoyunhe
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import app from '@adonisjs/core/services/app';
import type { AvatarManager } from '../src/avatar_manager.js';

type AvatarService = Pick<AvatarManager, 'upload' | 'delete' | 'getUrl' | 'getSignedUrl'>;

/**
 * A lazily resolved instance of AvatarManager from the IoC container.
 *
 * @example
 * ```ts
 * import avatar from 'adonisjs-avatar/services/main'
 *
 * // Upload an avatar
 * const result = await avatar.upload(file)
 *
 * // Delete an avatar
 * await avatar.delete('avatars/cuid.jpg')
 *
 * // Get the public URL
 * const url = await avatar.getUrl('avatars/cuid.jpg')
 * ```
 */
let avatarManager: AvatarManager;

function getAvatarManager(): AvatarManager {
  if (!avatarManager) {
    throw new Error(
      'AvatarManager has not been initialized. Make sure the AvatarProvider is registered.',
    );
  }

  return avatarManager;
}

const avatar: AvatarService = {
  upload(file) {
    return getAvatarManager().upload(file);
  },
  delete(key) {
    return getAvatarManager().delete(key);
  },
  getUrl(key) {
    return getAvatarManager().getUrl(key);
  },
  getSignedUrl(key, options) {
    return getAvatarManager().getSignedUrl(key, options);
  },
};

app.ready(async () => {
  avatarManager = await app.container.make('avatar.manager');
});

export default avatar;
