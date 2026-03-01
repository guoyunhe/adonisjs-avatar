/**
 * adonisjs-avatar
 *
 * (c) guoyunhe
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { configure, run } from '@japa/runner';
import { assert } from '@japa/assert';

configure({
  files: ['tests/**/*.spec.ts'],
  plugins: [assert()],
});

run();
