import Module from 'node:module';
import path from 'node:path';

process.env.NEXT_PUBLIC_API_URL_LOCAL = 'https://api.cassette.test';

type ResolveFilename = (request: string, ...rest: never[]) => string;

const compiledRoot = path.resolve(__dirname, '../..');
// shortcut: wraps Node's internal CommonJS resolver; use module.registerHooks once the supported Node floor has it.
const resolveFilename: ResolveFilename = Object.getOwnPropertyDescriptor(Module, '_resolveFilename')?.value;
Object.defineProperty(Module, '_resolveFilename', {
  value: (request: string, ...rest: never[]) =>
    resolveFilename.call(Module, request.startsWith('@/') ? path.join(compiledRoot, request.slice(2)) : request, ...rest),
});
