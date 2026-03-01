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

export default class UsersController {
  async updateAvatar({ request, auth, response }: HttpContext) {
    const file = request.file('avatar');
    if (!file) {
      return response.badRequest({ error: 'No avatar file provided' });
    }

    // Delete old avatar if one exists
    if (auth.user!.avatar) {
      await avatar.delete(auth.user!.avatar);
    }

    // Upload new avatar
    try {
      const result = await avatar.upload(file);
      auth.user!.avatar = result.key;
      await auth.user!.save();

      return response.ok({ url: result.url });
    } catch (error) {
      return response.badRequest({ error: error.message });
    }
  }

  async showAvatar({ auth, response }: HttpContext) {
    if (!auth.user!.avatar) {
      return response.notFound();
    }

    const url = await avatar.getUrl(auth.user!.avatar);
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

@inject()
export default class UsersController {
  constructor(private avatarManager: AvatarManager) {}

  async updateAvatar({ request, auth, response }: HttpContext) {
    const file = request.file('avatar');
    if (!file) {
      return response.badRequest({ error: 'No avatar file provided' });
    }

    const result = await this.avatarManager.upload(file);
    auth.user!.avatar = result.key;
    await auth.user!.save();

    return response.ok({ url: result.url });
  }
}
```

## API Reference

### `AvatarManager`

#### `upload(file: MultipartFile): Promise<AvatarUploadResult>`

Validates, optionally resizes, and stores the uploaded avatar file.

Returns `{ key: string, url?: string }` where `key` is the storage key and `url` is the public URL (if available for the disk).

#### `delete(key: string): Promise<void>`

Deletes the avatar at the given storage key.

#### `getUrl(key: string): Promise<string>`

Returns the public URL for the avatar at the given storage key.

#### `getSignedUrl(key: string, options?: { expiresIn?: string | number }): Promise<string>`

Returns a signed (temporary) URL for the avatar at the given storage key.

## License

MIT
