/**
 * adonisjs-avatar
 *
 * (c) guoyunhe
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type Configure from '@adonisjs/core/commands/configure';

/**
 * Configure the adonisjs-avatar package.
 * This command is run via `node ace configure adonisjs-avatar`.
 *
 * @example
 * ```sh
 * node ace configure adonisjs-avatar
 * ```
 */
export async function configure(command: InstanceType<typeof Configure>) {
  const codemods = await command.createCodemods();

  // Register the avatar provider
  await codemods.updateRcFile((rcFile) => {
    rcFile.addProvider('adonisjs-avatar/avatar_provider');
  });

  // Create the config file if it does not exist
  const configFilePath = join(command.app.appRoot.pathname, 'config', 'avatar.ts');
  if (!existsSync(configFilePath)) {
    await codemods.makeUsingStub(stubsRoot, 'config/avatar.stub', {});
  }
}

/**
 * Path to the stubs directory
 */
export const stubsRoot = new URL('./stubs', import.meta.url).pathname;
