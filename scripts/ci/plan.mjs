import { appendFileSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { classifyChanges } from './change-policy.mjs';

const event = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'));
let plan;
if (process.env.GITHUB_EVENT_NAME === 'schedule') {
  plan = { verify: false, build: false, dependencies: false, security: true };
} else {
  try {
    if (process.env.GITHUB_EVENT_NAME === 'workflow_dispatch') throw new Error('Explicit full verification');
    const base = event.pull_request?.base.sha ?? event.before;
    const head = event.pull_request?.head.sha ?? event.after;
    if (!/^[a-f0-9]{40}$/.test(base ?? '') || /^0+$/.test(base) || !/^[a-f0-9]{40}$/.test(head ?? '')) {
      throw new Error('No reliable comparison available');
    }
    const range = event.pull_request ? `${base}...${head}` : `${base}..${head}`;
    const files = execFileSync('git', ['diff', '--name-only', '--no-renames', '-z', range, '--'], { encoding: 'utf8' }).split('\0').filter(Boolean);
    plan = classifyChanges(files);
  } catch (error) {
    console.log(`Running all checks: ${error.message}`);
    plan = { verify: true, build: true, dependencies: true, security: true };
  }
}
for (const [key, value] of Object.entries(plan)) appendFileSync(process.env.GITHUB_OUTPUT, `${key}=${value}\n`);
appendFileSync(process.env.GITHUB_STEP_SUMMARY, `## Execution plan\n\n${Object.entries(plan).map(([key, value]) => `- ${key}: ${value ? 'run' : 'skip'}`).join('\n')}\n`);
