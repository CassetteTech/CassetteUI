import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ticketReference = /\bC[A]S-\d+\b/u;
const scannedExtensions = new Set([
  '.ts', '.tsx', '.mts', '.cts', '.js', '.jsx', '.mjs', '.cjs', '.css', '.json', '.yml', '.yaml', '.sh', '.py',
]);
const skippedDirectories = new Set([
  'node_modules', '.git', '.next', '.unit-test-dist', '.analytics-test-dist', 'test-results', 'playwright-report',
]);
const repositoryRoot = process.cwd();
const appliedSqlMigrations = path.join(repositoryRoot, 'supabase', 'migrations');

function sourceFiles(directory: string): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      return skippedDirectories.has(entry.name) || entryPath === appliedSqlMigrations ? [] : sourceFiles(entryPath);
    }
    return scannedExtensions.has(path.extname(entry.name)) ? [entryPath] : [];
  });
}

void test('source files do not name Linear issues', () => {
  const offenders = sourceFiles(repositoryRoot).flatMap((file) =>
    fs.readFileSync(file, 'utf8').split('\n').flatMap((line, index) =>
      ticketReference.test(line) ? [`${path.relative(repositoryRoot, file)}:${index + 1}`] : [],
    ),
  );

  assert.deepEqual(offenders, []);
});
