/* eslint-disable no-console -- CLI script */
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import process from 'node:process';

import { CliFlags } from '#src/lib/CliFlags';
import { Workspace } from '#src/lib/Workspace';

const flags = new CliFlags('vp run release:preview [options]', {
    pre: { type: 'boolean', describe: 'Preview the post for the next prerelease' }
});

// node refuses to run pnpm's .cmd shim on windows without a shell
function pnpm(cwd: string, ...args: string[]): void {
    const bin = process.env.npm_execpath ?? 'pnpm';
    const [file, prefix] = /\.[cm]?js$/.test(bin) ? [process.execPath, [bin]] : [bin, []];
    execFileSync(file, [...prefix, ...args], { cwd, stdio: 'inherit' });
}

async function main(): Promise<void> {
    const argv = process.argv.slice(2);
    if (flags.wantsHelp(argv)) {
        console.log(flags.help());
        return;
    }

    const { pre } = flags.parse(argv);
    const { rootDir } = await Workspace.load(import.meta.dirname);
    const tree = path.join(tmpdir(), `seedcord-release-${String(Date.now())}`);

    using cleanup = new DisposableStack();
    execFileSync('git', ['worktree', 'add', '--detach', tree, 'HEAD'], { cwd: rootDir, stdio: 'inherit' });
    cleanup.defer(() => {
        execFileSync('git', ['worktree', 'remove', '--force', tree], { cwd: rootDir, stdio: 'inherit' });
    });

    pnpm(tree, 'install');
    // every prettier config imports this package's dist
    pnpm(tree, 'turbo', 'build', '--filter=@seedcord/eslint-config');
    // changeset pre exit fails outside pre mode
    if (pre !== true && existsSync(path.join(tree, '.changeset', 'pre.json'))) pnpm(tree, 'changeset', 'pre', 'exit');
    pnpm(tree, 'cs:status');
    pnpm(tree, 'cs:version');
    pnpm(tree, 'release:notes', '--out', path.join(rootDir, 'release.md'));
}

await main();
