/**
 * adonisjs-avatar
 *
 * (c) guoyunhe
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import type Configure from '@adonisjs/core/commands/configure';
import { existsSync, globSync } from 'node:fs';
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
    await codemods.makeUsingStub(stubsRoot, 'config/avatar.ts', {});
  }

  const migrationFileGlob = join(
    command.app.appRoot.pathname,
    'database',
    'migrations',
    '*_create_avatars_table.ts',
  );

  if (globSync(migrationFileGlob).length === 0) {
    await codemods.makeUsingStub(stubsRoot, 'make/migration/avatars.stub', {
      migration: {
        folder: 'database/migrations',
        fileName: `${Date.now()}_create_avatars_table.ts`,
      },
    });
  }

  const avatarModelPath = join(command.app.appRoot.pathname, 'app', 'models', 'avatar.ts');
  if (!existsSync(avatarModelPath)) {
    await codemods.makeUsingStub(stubsRoot, 'app/models/avatar.ts', {});
  }
}

/**
 * Path to the stubs directory
 */
export const stubsRoot = new URL('./stubs', import.meta.url).pathname;
