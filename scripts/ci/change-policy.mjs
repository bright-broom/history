/** Unknown paths fail open: run checks/builds rather than silently missing new application files. */
export function classifyChanges(files) {
  let verify = false;
  let build = false;
  let dependencies = false;
  let security = false;
  for (const file of files) {
    if (/^(README\.md|LICENSE(?:\.md)?|AGENTS\.md)$/.test(file) || file.startsWith('docs/') ||
        file === '.github/copilot-instructions.md' || file === '.github/pull_request_template.md') continue;
    verify = true;
    if (['package.json', 'package-lock.json'].includes(file)) dependencies = true;
    if (/\.[cm]?[jt]sx?$/.test(file) || file.startsWith('.github/workflows/') || dependencies) security = true;
    const toolingOnly = /^(tests|scripts|tooling|\.github)\//.test(file) ||
      ['eslint.config.mjs', '.coderabbit.yaml'].includes(file);
    // Deployment policy changes themselves must produce a new deployment.
    if (!toolingOnly || file.startsWith('scripts/ci/')) build = true;
  }
  return { verify, build, dependencies, security };
}
