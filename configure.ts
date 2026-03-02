/**
 * adonisjs-avatar
 *
 * (c) guoyunhe
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import type Configure from '@adonisjs/core/commands/configure';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

interface RcFileLike {
  addProvider: (provider: string) => void;
}

interface CodemodsLike {
  updateRcFile: (callback: (rcFile: RcFileLike) => void) => Promise<void> | void;
  makeUsingStub: (
    stubsRoot: string,
    stubPath: string,
    args: Record<string, unknown>,
  ) => Promise<void>;
}

export interface ConfigureCommandLike {
  app: {
    appRoot: {
      pathname: string;
    };
    generators: {
      createEntity: (name: string) => unknown;
    };
  };
  createCodemods: () => Promise<CodemodsLike>;
}

/**
 * Configure the adonisjs-avatar package.
 * This command is run via `node ace configure adonisjs-avatar`.
 *
 * @example
 * ```sh
 * node ace configure adonisjs-avatar
 * ```
 */
export async function configure(command: ConfigureCommandLike | InstanceType<typeof Configure>) {
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

  await codemods.makeUsingStub(stubsRoot, 'make/migration/avatars.stub', {
    migration: {
      folder: 'database/migrations',
      fileName: `${Date.now()}_create_avatars_table.ts`,
    },
  });

  await codemods.makeUsingStub(stubsRoot, 'make/model/avatar.stub', {
    entity: command.app.generators.createEntity('avatar'),
  });
}

/**
 * Path to the stubs directory
 */
export const stubsRoot = new URL('./stubs', import.meta.url).pathname;
