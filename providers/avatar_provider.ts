/**
 * adonisjs-avatar
 *
 * (c) guoyunhe
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import type { ApplicationService } from '@adonisjs/core/types'
import { Disk, DriveManager } from 'flydrive'
import { AvatarManager } from '../src/avatar_manager.js'
import type { AvatarConfig } from '../src/types.js'

/**
 * Extend the AdonisJS IoC container bindings
 */
declare module '@adonisjs/core/types' {
  interface ContainerBindings {
    'avatar.manager': AvatarManager
  }
}

/**
 * Avatar Provider registers the AvatarManager service in the AdonisJS IoC container.
 *
 * @example
 * Automatically registered when the package is configured.
 * Access the manager via dependency injection or the IoC container:
 *
 * ```ts
 * // app/controllers/users_controller.ts
 * import { inject } from '@adonisjs/core'
 * import type { AvatarManager } from 'adonisjs-avatar'
 *
 * @inject()
 * export default class UsersController {
 *   constructor(private avatarManager: AvatarManager) {}
 *
 *   async updateAvatar({ request, auth, response }) {
 *     const file = request.file('avatar')
 *     if (!file) return response.badRequest('No file provided')
 *
 *     const result = await this.avatarManager.upload(file)
 *     auth.user!.avatar = result.key
 *     await auth.user!.save()
 *
 *     return response.ok({ url: result.url })
 *   }
 * }
 * ```
 */
export default class AvatarProvider {
  constructor(protected app: ApplicationService) {}

  /**
   * Registers the AvatarManager singleton in the IoC container.
   */
  register() {
    this.app.container.singleton('avatar.manager', async (resolver) => {
      const config: AvatarConfig = this.app.config.get('avatar', {})
      let disk: Disk

      if (config.disk) {
        const driveManager = (await resolver.make('drive.manager')) as DriveManager<
          Record<string, any>
        >
        disk = driveManager.use(config.disk)
      } else {
        disk = await resolver.make(Disk)
      }

      return new AvatarManager(disk, config)
    })
  }
}
