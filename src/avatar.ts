/**
 * adonisjs-avatar
 *
 * (c) guoyunhe
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { column } from '@adonisjs/lucid/orm';

type AvatarDecoratorOptions = Parameters<typeof column>[0];

/**
 * Lucid model decorator for avatar-related columns.
 *
 * Behaves like Lucid `@column()` and can be used to annotate fields such as
 * `avatarId` for improved readability in models.
 */
export function avatar(options?: AvatarDecoratorOptions): PropertyDecorator {
  return column(options);
}
