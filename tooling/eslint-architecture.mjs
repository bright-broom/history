import { builtinModules } from 'node:module';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const sourceRoot = fileURLToPath(new URL('../src/', import.meta.url));
const forbiddenLayers = new Set(['infrastructure', 'server', 'app', 'components']);
const builtins = new Set(builtinModules.map((name) => name.replace(/^node:/, '')));

/** Resolve the project's @/ alias and relative paths before checking layer boundaries. */
function isForbidden(specifier, filename) {
  if (specifier.startsWith('node:') || builtins.has(specifier) ||
      specifier === 'server-only' || specifier === 'next' || specifier.startsWith('next/')) return true;

  const target = specifier.startsWith('@/')
    ? resolve(sourceRoot, specifier.slice(2))
    : specifier.startsWith('.') || isAbsolute(specifier)
      ? resolve(dirname(filename), specifier)
      : null;
  if (!target) return false;
  return forbiddenLayers.has(relative(sourceRoot, target).split(sep)[0]);
}

const architecturePlugin = {
  rules: {
    'no-runtime-dependencies': {
      meta: {
        type: 'problem',
        schema: [],
        messages: { forbidden: 'Domain and services must depend on domain ports, not runtime adapters ({{specifier}}).' },
      },
      create(context) {
        function check(node) {
          if (!node) return;
          const specifier = typeof node.value === 'string' ? node.value
            : node.type === 'TemplateLiteral' && node.expressions.length === 0
              ? node.quasis[0].value.cooked : null;
          if (specifier && isForbidden(specifier, context.filename)) {
            context.report({ node, messageId: 'forbidden', data: { specifier } });
          }
        }
        return {
          ImportDeclaration: (node) => check(node.source),
          ExportNamedDeclaration: (node) => check(node.source),
          ExportAllDeclaration: (node) => check(node.source),
          ImportExpression: (node) => check(node.source),
          TSImportType: (node) => check(node.source),
          TSExternalModuleReference: (node) => check(node.expression),
          CallExpression(node) {
            if (node.callee.type === 'Identifier' && node.callee.name === 'require') check(node.arguments[0]);
          },
        };
      },
    },
  },
};

export default architecturePlugin;
