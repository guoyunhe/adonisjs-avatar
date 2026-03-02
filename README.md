# adonisjs-avatar

AdonisJS package for basic avatar uploading with optional image resizing.

## Features

- Upload avatar images from multipart form data
- Resize and crop images to a square using [sharp](https://sharp.pixelplumbing.com/) (optional)
- Store avatars using any [AdonisJS Drive](https://docs.adonisjs.com/guides/drive) disk (local, S3, GCS, etc.)
- Validate file type and size
- Delete old avatars

## Installation

```bash
npm install adonisjs-avatar
```

### Install optional image processing dependency

```bash
npm install sharp
```

### Configure

```bash
node ace configure adonisjs-avatar
```

This will:

- Register the `AvatarProvider` in your `adonisrc.ts`
- Create a `config/avatar.ts` configuration file
- Create a migration `database/migrations/create_avatars_table.ts`

Then run migrations:

```bash
node ace migration:run
```

Then, for each model that can have an avatar, add an `avatar_id` column in your own app migration.

```ts
// database/migrations/add_avatar_id_to_users.ts
import { BaseSchema } from '@adonisjs/lucid/schema';

export default class extends BaseSchema {
  protected tableName = 'users';

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table
        .integer('avatar_id')
        .unsigned()
        .references('id')
        .inTable('avatars')
        .onDelete('SET NULL')
        .nullable();
    });
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('avatar_id');
    });
  }
}
```

Define an `Avatar` model and relate it from models that have `avatar_id`.

```ts
// app/models/avatar.ts
import { BaseModel, column } from '@adonisjs/lucid/orm';

export default class Avatar extends BaseModel {
  @column({ isPrimary: true })
  declare id: number;

  @column()
  declare key: string;

  @column()
  declare version: number;
}
```

```ts
// app/models/user.ts
import { BaseModel, belongsTo, column, computed } from '@adonisjs/lucid/orm';
import type { BelongsTo } from '@adonisjs/lucid/types/relations';
import Avatar from '#models/avatar';

export default class User extends BaseModel {
  @column()
  declare avatarId: number | null;

  @belongsTo(() => Avatar)
  declare avatarRecord: BelongsTo<typeof Avatar>;

  @computed()
  get avatar(): string | null {
    if (!this.avatarId || !this.$preloaded.avatarRecord) {
      return null;
    }

    return `/avatar/${this.id}?v=${this.$preloaded.avatarRecord.version}`;
  }
}
```

## Configuration

```ts
// config/avatar.ts
import { defineConfig } from 'adonisjs-avatar';

export default defineConfig({
  // The drive disk to use (defaults to the default drive disk)
  disk: 'local',

  // Folder within the disk to store avatars (default: 'avatars')
  folder: 'avatars',

  // Resize dimensions in pixels (default: 256x256)
  // Requires the 'sharp' package to be installed
  width: 256,
  height: 256,

  // Allowed file extensions (default: ['jpg', 'jpeg', 'png', 'webp', 'gif'])
  allowedExtensions: ['jpg', 'jpeg', 'png', 'webp', 'gif'],

  // Maximum upload size (default: '5mb')
  maxSize: '5mb',
});
```

## Usage

### Using the service

```ts
// app/controllers/users_controller.ts
import avatar from 'adonisjs-avatar/services/main';
import type { HttpContext } from '@adonisjs/core/http';
import Avatar from '#models/avatar';

export default class UsersController {
  async updateAvatar({ request, auth, response }: HttpContext) {
    const file = request.file('avatar');
    if (!file) {
      return response.badRequest({ error: 'No avatar file provided' });
    }

    await auth.user!.load('avatarRecord');

    // Delete old avatar file if one exists
    if (auth.user!.avatarRecord) {
      await avatar.delete(auth.user!.avatarRecord.key);
    }

    try {
      const result = await avatar.upload(file);

      const avatarRecord = await Avatar.create({
        key: result.key,
        version: result.version,
      });

      auth.user!.avatarId = avatarRecord.id;
      await auth.user!.save();

      return response.ok({ avatar: `/avatar/${auth.user!.id}?v=${avatarRecord.version}` });
    } catch (error) {
      return response.badRequest({ error: error.message });
    }
  }

  async showAvatar({ auth, response }: HttpContext) {
    await auth.user!.load('avatarRecord');
    if (!auth.user!.avatarRecord) {
      return response.notFound();
    }

    const url = await avatar.getUrl(auth.user!.avatarRecord.key, auth.user!.avatarRecord.version);
    return response.ok({ url });
  }
}
```

### Using dependency injection

```ts
// app/controllers/users_controller.ts
import { inject } from '@adonisjs/core';
import { AvatarManager } from 'adonisjs-avatar';
import type { HttpContext } from '@adonisjs/core/http';
import Avatar from '#models/avatar';

@inject()
export default class UsersController {
  constructor(private avatarManager: AvatarManager) {}

  async updateAvatar({ request, auth, response }: HttpContext) {
    const file = request.file('avatar');
    if (!file) {
      return response.badRequest({ error: 'No avatar file provided' });
    }

    const result = await this.avatarManager.upload(file);
    const avatarRecord = await Avatar.create({ key: result.key, version: result.version });

    auth.user!.avatarId = avatarRecord.id;
    await auth.user!.save();

    return response.ok({ avatar: `/avatar/${auth.user!.id}?v=${avatarRecord.version}` });
  }
}
```

## API Reference

### `AvatarManager`

#### `upload(file: MultipartFile): Promise<AvatarUploadResult>`

Validates, optionally resizes, and stores the uploaded avatar file.

Returns `{ key: string, version: number, url?: string }` where `key` is the storage key, `version` is the cache version, and `url` is the public URL (if available for the disk).

#### `delete(key: string): Promise<void>`

Deletes the avatar at the given storage key.

#### `getUrl(key: string, avatarVersion?: number): Promise<string>`

Returns the public URL for the avatar at the given storage key.

When `avatarVersion` is provided, the URL gets `?v=<avatarVersion>` (or `&v=...`), so browsers fetch the updated avatar after each upload.

#### `getSignedUrl(key: string, options?: { expiresIn?: string | number }, avatarVersion?: number): Promise<string>`

Returns a signed (temporary) URL for the avatar at the given storage key.

## License

MIT
