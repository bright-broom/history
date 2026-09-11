import { execFileSync } from 'node:child_process';
import { classifyChanges } from './change-policy.mjs';

// Vercel: exit 0 skips a build; exit 1 proceeds. Compare against the last successful deployment.
// Missing history must build, including first deployments and shallow-clone gaps.
try {
  const base = process.env.VERCEL_GIT_PREVIOUS_SHA;
  const head = process.env.VERCEL_GIT_COMMIT_SHA;
  if (!/^[a-f0-9]{40}$/.test(base ?? '') || !/^[a-f0-9]{40}$/.test(head ?? '')) throw new Error('No previous deployment SHA');
  const files = execFileSync('git', ['diff', '--name-only', '--no-renames', '-z', `${base}..${head}`, '--'], { encoding: 'utf8' }).split('\0').filter(Boolean);
  const skip = !classifyChanges(files).build;
  console.log(skip ? 'Skipping deployment: no application changes since last deployment.' : 'Building application changes.');
  process.exitCode = skip ? 0 : 1;
} catch (error) {
  console.log(`Building conservatively: ${error.message}`);
  process.exitCode = 1;
}
