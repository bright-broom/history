import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ESLint } from 'eslint';

const eslint = new ESLint();
const rule = 'architecture/no-runtime-dependencies';
async function rejects(code: string, filename = 'src/services/probe.ts') {
  const [result] = await eslint.lintText(code, { filePath: filename });
  assert.ok(result.messages.some((message) => message.ruleId === rule), code);
}

test('layer boundaries reject aliases, relative paths and normalized paths', async () => {
  for (const source of ['@/infrastructure/cache', '../infrastructure/cache', '../domain/../infrastructure/cache', '@/domain/../server/history', '../app/page', '../components/features']) {
    await rejects(`import '${source}';`);
  }
  await rejects("import '../../infrastructure/cache';", 'src/domain/validation/probe.ts');
});

test('layer boundaries cover exports, dynamic imports, require and type imports', async () => {
  for (const code of [
    "export * from '../infrastructure/cache';",
    "export { AsyncCache } from '../infrastructure/cache';",
    "export const load = () => import('../infrastructure/cache');",
    'export const load = () => import(`../infrastructure/cache`);',
    "export const cache = require('../infrastructure/cache');",
    "import cache = require('../infrastructure/cache'); export { cache };",
    "export type Cache = import('../infrastructure/cache').AsyncCache;",
    "import type { AsyncCache } from '../infrastructure/cache'; export type Cache = AsyncCache;",
  ]) await rejects(code);
});

test('runtime modules remain forbidden and domain dependencies remain allowed', async () => {
  for (const source of ['node:fs/promises', 'fs/promises', 'path', 'next/navigation', 'server-only']) await rejects(`import '${source}';`);
  for (const source of ['@/domain/types', '../domain/types', '@/config/constants', 'zod']) {
    const [result] = await eslint.lintText(`import '${source}';`, { filePath: 'src/services/probe.ts' });
    assert.equal(result.messages.filter((message) => message.ruleId === rule).length, 0, source);
  }
  const [result] = await eslint.lintText("import '../infrastructure/cache';", { filePath: 'src/server/probe.ts' });
  assert.equal(result.messages.filter((message) => message.ruleId === rule).length, 0);
});
