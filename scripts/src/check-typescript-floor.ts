import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import { lowestTypescript } from '#src/lib/typescript-floor';
import { Workspace } from '#src/lib/Workspace';

if (process.env.CI !== 'true') {
    throw new Error('check:typescript-floor adds typescript to package.json files, so it runs in CI only.');
}

const workspace = await Workspace.load(import.meta.dirname);
const root = workspace.rootDir;
const workspaceYaml = readFileSync(path.join(root, 'pnpm-workspace.yaml'), 'utf8');

function pnpm(...args: string[]): void {
    execFileSync('pnpm', args, { cwd: root, stdio: 'inherit' });
}

const typesFloor = lowestTypescript(workspaceYaml, 'consumerTypes');
for (const mock of ['gateway', 'http']) {
    const tsc = ['tsc', '--noEmit', '--skipLibCheck', 'false', '-p', `mocks/${mock}/tsconfig.json`];
    const { status, stdout, stderr } = spawnSync('pnpm', ['dlx', `--package=typescript@${typesFloor}`, ...tsc], {
        cwd: root,
        encoding: 'utf8'
    });
    const errors = stdout.split('\n').filter((line) => line.includes('error TS'));
    if (status !== 0 && errors.length === 0) throw new Error(`tsc did not run for mocks/${mock}:\n${stderr}`);

    // @sapphire/shapeshift, a discord.js dependency, fails a full lib check in its own types
    const ours = errors.filter((line) => !line.includes('node_modules'));
    if (ours.length > 0) {
        throw new Error(`mocks/${mock} fails on TypeScript ${typesFloor}:\n${ours.join('\n')}`);
    }
}

const lintFloor = lowestTypescript(workspaceYaml, 'consumerLint');
const LINT_PACKAGES = ['eslint-plugin-discordjs', 'eslint-plugin', 'eslint-config'];
// the plugins read TypeFlags through eslint-utils' own typescript
for (const pkg of ['eslint-utils', ...LINT_PACKAGES]) {
    pnpm('-C', `tooling/${pkg}`, 'add', '-D', `typescript@${lintFloor}`);
}
for (const pkg of LINT_PACKAGES) {
    pnpm('-C', `tooling/${pkg}`, 'test');
}
