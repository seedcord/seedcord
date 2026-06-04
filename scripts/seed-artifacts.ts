/* eslint-disable no-console -- CLI script so console is ok */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { cp, mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

// Seeds the seedcord/artifacts repo with the locally-built docs tree (generated/artifacts/), so the
// docs site can be pointed at the real jsDelivr fetch path instead of local file:// fixtures.
// Build the tree first with `pnpm docs:local`. This is the one-shot local seed; CI owns the recurring path.

const REPO = 'seedcord/artifacts';
const INIT_CWD = process.env.INIT_CWD ? path.resolve(process.env.INIT_CWD) : process.cwd();
const ARTIFACTS_ROOT = path.resolve(INIT_CWD, 'generated', 'artifacts');
const DEFAULT_BRANCH = 'dev-pipeline-test';

interface Options {
    branch: string;
    dryRun: boolean;
    purge: boolean;
}

function parseArgs(argv: readonly string[]): Options {
    const branchIndex = argv.indexOf('--branch');
    const branch = branchIndex >= 0 ? argv[branchIndex + 1] : undefined;
    if (branchIndex >= 0 && (branch === undefined || branch.startsWith('--'))) {
        throw new Error('--branch requires a value (e.g. --branch dev-pipeline-test)');
    }
    return {
        branch: branch ?? DEFAULT_BRANCH,
        dryRun: argv.includes('--dry-run'),
        purge: argv.includes('--purge')
    };
}

function redact(text: string, secret: string): string {
    return secret ? text.split(secret).join('***') : text;
}

function git(args: readonly string[], cwd: string, secret = ''): string {
    const result = spawnSync('git', [...args], { cwd, encoding: 'utf8' });
    if (result.error) throw result.error;
    if (result.status !== 0) {
        const output = redact(`${result.stdout}${result.stderr}`, secret);
        throw new Error(`git ${args[0] ?? ''} failed (exit ${String(result.status)}):\n${output}`);
    }
    return result.stdout;
}

function branchExistsOnRemote(branch: string, cwd: string): boolean {
    return spawnSync('git', ['rev-parse', '--verify', '--quiet', `origin/${branch}`], { cwd }).status === 0;
}

async function listFiles(root: string, base: string = root): Promise<string[]> {
    const entries = await readdir(root, { withFileTypes: true });
    const files: string[] = [];
    for (const entry of entries) {
        const full = path.join(root, entry.name);
        if (entry.isDirectory()) {
            files.push(...(await listFiles(full, base)));
        } else {
            files.push(path.relative(base, full).split(path.sep).join('/'));
        }
    }
    return files.sort();
}

async function purgeJsdelivr(paths: readonly string[]): Promise<void> {
    const response = await fetch('https://purge.jsdelivr.net/', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ path: paths })
    });
    if (!response.ok) {
        throw new Error(`jsDelivr purge failed: ${String(response.status)} ${response.statusText}`);
    }
    console.log(`🧹 purged ${String(paths.length)} path(s) from jsDelivr (${String(response.status)})`);
}

async function pushSeed(
    options: Options,
    pat: string,
    files: readonly string[],
    purgePaths: readonly string[]
): Promise<void> {
    const workdir = await mkdtemp(path.join(tmpdir(), 'seedcord-artifacts-'));
    try {
        // Public repo: anonymous clone needs no token. Only the push carries the PAT.
        git(['clone', '--quiet', `https://github.com/${REPO}.git`, workdir], path.dirname(workdir));

        // Reset onto the remote branch if it exists (the push then fast-forwards); else create it from the clone's default HEAD.
        const startPoint = branchExistsOnRemote(options.branch, workdir) ? [`origin/${options.branch}`] : [];
        git(['checkout', '-B', options.branch, ...startPoint], workdir);

        await rm(path.join(workdir, 'packages'), { recursive: true, force: true });
        await rm(path.join(workdir, 'index.json'), { force: true });
        await cp(ARTIFACTS_ROOT, workdir, { recursive: true });

        git(['add', '-A'], workdir);
        if (git(['status', '--porcelain'], workdir).trim() === '') {
            console.log('No changes to seed; artifacts repo already matches the local tree.');
            return;
        }

        // Per-command gpgsign=false so the seed commit doesn't require the dev's signing key.
        git(['-c', 'commit.gpgsign=false', 'commit', '-m', 'chore: seed docs artifacts from local HEAD'], workdir);
        const authedUrl = `https://x-access-token:${pat}@github.com/${REPO}.git`;
        git(['push', authedUrl, `HEAD:refs/heads/${options.branch}`], workdir, pat);
        console.log(`✅ seeded ${String(files.length)} file(s) to ${REPO}@${options.branch}`);

        if (options.purge) await purgeJsdelivr(purgePaths);

        // apps/docs reads SEEDCORD_DOCS_INDEX_URL, not _BRANCH, so hand back the full jsDelivr URL.
        const indexUrl = `https://cdn.jsdelivr.net/gh/${REPO}@${options.branch}/index.json`;
        console.log(`\nTest the live fetch with:\n  SEEDCORD_DOCS_INDEX_URL=${indexUrl} pnpm -C apps/docs dev`);
    } finally {
        await rm(workdir, { recursive: true, force: true });
    }
}

async function main(): Promise<void> {
    const options = parseArgs(process.argv.slice(2));

    if (!existsSync(path.join(ARTIFACTS_ROOT, 'index.json'))) {
        throw new Error(`No artifacts found at ${ARTIFACTS_ROOT}. Run "pnpm docs:local" first.`);
    }

    const files = await listFiles(ARTIFACTS_ROOT);
    const served = files.filter((file) => file === 'index.json' || file.endsWith('/project.json'));
    const purgePaths = served.map((file) => `/gh/${REPO}@${options.branch}/${file}`);

    if (options.dryRun) {
        console.log(`[dry-run] would push ${String(files.length)} file(s) to ${REPO}@${options.branch}:`);
        for (const file of files) console.log(`  ${file}`);
        if (options.purge) {
            console.log(`[dry-run] would purge ${String(purgePaths.length)} jsDelivr path(s):`);
            for (const p of purgePaths) console.log(`  ${p}`);
        }
        return;
    }

    const pat = process.env.ARTIFACTS_PAT?.trim();
    if (!pat) throw new Error('ARTIFACTS_PAT is required (set it in the env, or pass --dry-run to preview).');

    await pushSeed(options, pat, files, purgePaths);
}

main().catch((error: unknown) => {
    console.error('\n❌ seed-artifacts.ts encountered an error:\n');
    console.error(error);
    process.exitCode = 1;
});
