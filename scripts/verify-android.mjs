import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import assert from 'node:assert/strict';
const native = 'android/app/src/main/assets';
const config = JSON.parse(readFileSync(join(native, 'capacitor.config.json'), 'utf8'));
assert.equal(config.appId, 'com.dylankral.wrxblecontroller');
assert.equal(config.webDir, 'dist');
assert.ok(!config.server?.url, 'Remote asset server must not be configured');
let count = 0;
function verify(dir = '') {
  for (const entry of readdirSync(join('dist', dir), { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) verify(path);
    else {
      assert.ok(readFileSync(join('dist', path)).equals(readFileSync(join(native, 'public', path))), 'Stale native asset: ' + path);
      count++;
    }
  }
}
verify();
const html = readFileSync('dist/index.html', 'utf8');
assert.ok(!html.includes('/wrx-ble-controller/'));
for (const match of html.matchAll(/(?:src|href)="([^"]+)"/g)) assert.ok(match[1].startsWith('./'), 'Non-local asset: ' + match[1]);
console.log('Verified ' + count + ' bundled files, relative asset paths and local Capacitor configuration.');
