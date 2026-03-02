import { test } from '@japa/runner';
import { globSync } from 'node:fs';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { configure } from '../configure.js';

type ConfigureCommand = Parameters<typeof configure>[0];

async function createTmpDir(prefix: string): Promise<string> {
  const dir = join(tmpdir(), `adonisjs-avatar-configure-test-${prefix}-${Date.now()}`);
  await mkdir(dir, { recursive: true });
  return dir;
}

test.group('configure', (group) => {
  const roots: string[] = [];

  group.teardown(async () => {
    await Promise.all(roots.map((root) => rm(root, { recursive: true, force: true })));
  });

  test('creates config, migration, and avatar model stubs when missing', async ({ assert }) => {
    const appRoot = await createTmpDir('missing');
    roots.push(appRoot);

    const providers: string[] = [];
    const createdStubs: string[] = [];
    let migrationFileName: string | undefined;
    let modelEntityName: string | undefined;

    const command: ConfigureCommand = {
      app: {
        appRoot: { pathname: appRoot },
        generators: {
          createEntity(name: string) {
            return { name, path: '', fileName: name };
          },
        },
      },
      async createCodemods() {
        return {
          updateRcFile(callback: (rcFile: { addProvider: (provider: string) => void }) => void) {
            callback({
              addProvider(provider: string) {
                providers.push(provider);
              },
            });
          },
          async makeUsingStub(
            _stubsRoot: string,
            stubPath: string,
            args?: { migration?: { fileName?: string }; entity?: { name?: string } },
          ) {
            createdStubs.push(stubPath);
            if (stubPath === 'make/migration/avatars.stub') {
              migrationFileName = args?.migration?.fileName;
            }
            if (stubPath === 'make/model/avatar.stub') {
              modelEntityName = args?.entity?.name;
            }
          },
        };
      },
    };

    await configure(command);

    assert.deepEqual(providers, ['adonisjs-avatar/avatar_provider']);
    assert.deepEqual(createdStubs.sort(), [
      'config/avatar.ts',
      'make/migration/avatars.stub',
      'make/model/avatar.stub',
    ]);
    assert.match(migrationFileName!, /^\d+_create_avatars_table\.ts$/);
    assert.equal(modelEntityName, 'avatar');
  });

  test('does not create avatar model stub when model already exists', async ({ assert }) => {
    const appRoot = await createTmpDir('existing-avatar-model');
    roots.push(appRoot);

    await mkdir(join(appRoot, 'app', 'models'), { recursive: true });
    await writeFile(
      join(appRoot, 'app', 'models', 'avatar.ts'),
      'export default class Avatar {}\n',
    );

    const createdStubs: string[] = [];

    const command: ConfigureCommand = {
      app: {
        appRoot: { pathname: appRoot },
        generators: {
          createEntity(name: string) {
            return { name, path: '', fileName: name };
          },
        },
      },
      async createCodemods() {
        return {
          updateRcFile() {},
          async makeUsingStub(_stubsRoot: string, stubPath: string) {
            createdStubs.push(stubPath);
          },
        };
      },
    };

    await configure(command);

    assert.notInclude(createdStubs, 'make/model/avatar.stub');
  });

  test('does not create avatars migration when one already exists', async ({ assert }) => {
    const appRoot = await createTmpDir('existing-avatar-migration');
    roots.push(appRoot);

    await mkdir(join(appRoot, 'database', 'migrations'), { recursive: true });
    await writeFile(
      join(appRoot, 'database', 'migrations', '1740878300000_create_avatars_table.ts'),
      'export default class Migration {}\n',
    );

    const createdStubs: string[] = [];

    const command: ConfigureCommand = {
      app: {
        appRoot: { pathname: appRoot },
        generators: {
          createEntity(name: string) {
            return { name, path: '', fileName: name };
          },
        },
      },
      async createCodemods() {
        return {
          updateRcFile() {},
          async makeUsingStub(_stubsRoot: string, stubPath: string) {
            createdStubs.push(stubPath);
          },
        };
      },
    };

    await configure(command);

    assert.notInclude(createdStubs, 'make/migration/avatars.stub');
    assert.lengthOf(
      globSync(join(appRoot, 'database', 'migrations', '*_create_avatars_table.ts')),
      1,
    );
  });
});
