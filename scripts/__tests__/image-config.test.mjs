import assert from 'node:assert/strict';
import test from 'node:test';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

test('local profile images are allowed only in development', () => {
  for (const mode of ['development', 'production']) {
    execFileSync(process.execPath, ['--input-type=module', '-e', `
      import assert from 'node:assert/strict';
      import loadConfig from 'next/dist/server/config.js';
      import { hasRemoteMatch } from 'next/dist/shared/lib/match-remote-pattern.js';
      const { images } = await loadConfig.default('phase-production-build', process.cwd());
      const allowed = process.env.NODE_ENV === 'development';
      assert.equal(images.dangerouslyAllowLocalIP, allowed);
      const accepts = (path) => hasRemoteMatch([], images.remotePatterns, new URL(path));
      assert.equal(accepts('http://127.0.0.1:55321/storage/v1/object/public/profile-pictures/avatar.jpg'), allowed);
      assert.equal(accepts('http://127.0.0.1:55321/auth/v1/admin/users'), false);
      assert.equal(accepts('http://127.0.0.1:5001/storage/v1/object/public/profile-pictures/avatar.jpg'), false);
    `], {
      cwd: fileURLToPath(new URL('../../', import.meta.url)),
      env: { ...process.env, NODE_ENV: mode },
      stdio: 'pipe',
    });
  }
});
