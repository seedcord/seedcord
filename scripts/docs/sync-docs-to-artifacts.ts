/* eslint-disable no-console -- CLI script so console is ok */
import { spawn } from 'node:child_process';
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import {
    buildIndex,
    DocsEngine,
    formatDisplayPackageName,
    isPrerelease,
    serializeProject
} from '@seedcord/docs-engine';

import {
    cacheControlFor,
    createR2Client,
    deleteFromR2,
    fetchRemoteIndex,
    listRemoteKeys,
    objectExists,
    putToR2,
    r2ConfigFromEnv
} from './artifacts-repo';
import { buildUnionInputs } from './union-inputs';

import type { RemoteRef } from './artifacts-repo';
import type { EmittedEntry } from './union-inputs';
import type { PackageVersionsInput } from '@seedcord/docs-engine';

// Forward-only docs publish. For each freshly-published package it optionally extracts the docs pinned to
// the release tag, serializes the version dir, and additively merges the new versions into the remote R2
// catalog without dropping a prior version. It runs in one process with no cross-process handoff.
// build-docs-artifacts.ts stays the whole-tree local builder. This script extends the existing remote index.

const INIT_CWD = process.env.INIT_CWD ? path.resolve(process.env.INIT_CWD) : process.cwd();
const GENERATED_ROOT = path.resolve(INIT_CWD, 'generated');
const ARTIFACTS_ROOT = path.join(GENERATED_ROOT, 'artifacts');
const DEFAULT_PROJECT_FOLDER_URL = 'https://github.com/seedcord/seedcord';

// Caps how much --prune can delete, guarding against a union-reconstruction bug wiping the catalog.
const PRUNE_DELETE_CAP = 0.5;

interface PublishedPackage {
    name: string;
    version: string;
}

interface Options {
    published: PublishedPackage[];
    extract: boolean;
    projectFolderUrl: string;
    prefix: string;
    bucket: string | undefined;
    prune: boolean;
    pruneForce: boolean;
    dryRun: boolean;
}

function flagValue(argv: readonly string[], flag: string): string | undefined {
    const index = argv.indexOf(flag);
    if (index < 0) return undefined;
    const value = argv[index + 1];
    if (value === undefined || value.startsWith('--')) {
        throw new Error(`${flag} requires a value`);
    }
    return value;
}

function parsePublished(raw: string): PublishedPackage[] {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
        throw new Error('--published must be a JSON array of { name, version }');
    }
    return parsed.map((entry) => {
        if (typeof entry !== 'object' || entry === null) {
            throw new Error('each published entry must be an object');
        }
        const { name, version } = entry as { name?: unknown; version?: unknown };
        if (typeof name !== 'string' || typeof version !== 'string') {
            throw new Error('each published entry needs a string name + version');
        }
        return { name, version };
    });
}

async function parseArgs(argv: readonly string[]): Promise<Options> {
    const publishedFile = flagValue(argv, '--published-file');
    const raw = publishedFile ? await readFile(publishedFile, 'utf8') : flagValue(argv, '--published');
    if (!raw) {
        throw new Error('--published <json> or --published-file <path> is required');
    }
    return {
        published: parsePublished(raw),
        extract: argv.includes('--extract'),
        projectFolderUrl: flagValue(argv, '--project-folder-url') ?? DEFAULT_PROJECT_FOLDER_URL,
        prefix: flagValue(argv, '--prefix') ?? '',
        bucket: flagValue(argv, '--bucket'),
        prune: argv.includes('--prune'),
        pruneForce: argv.includes('--prune-force'),
        dryRun: argv.includes('--dry-run')
    };
}

function run(command: string, args: readonly string[]): Promise<void> {
    return new Promise((resolve, reject) => {
        const child = spawn(command, [...args], { stdio: 'inherit', cwd: INIT_CWD });
        child.on('error', reject);
        child.on('close', (code) => {
            if (code === 0) resolve();
            else reject(new Error(`${command} ${args.join(' ')} exited with code ${String(code)}`));
        });
    });
}

// Source links are pinned to the immutable <name>@<version> tag so they never drift.
async function extractPackage(pkg: PublishedPackage, projectFolderUrl: string): Promise<void> {
    await run('pnpm', [
        'tsx',
        'scripts/docs/extract-docs.ts',
        '-o',
        './generated',
        '-p',
        './packages',
        '--package',
        pkg.name,
        '--ref',
        `${pkg.name}@${pkg.version}`,
        '--project-folder-url',
        projectFolderUrl
    ]);
}

// Returns null for a published package with no documentable API (a pure-config package like
// @seedcord/tsconfig): it publishes to npm but extraction yields no manifest entry, so it has nothing
// to render and is skipped rather than failing the whole sync.
async function emitVersionDir(engine: DocsEngine, pkg: PublishedPackage): Promise<EmittedEntry | null> {
    const found = engine.getPackage(pkg.name);
    if (!found) {
        console.log(`⏭️  ${pkg.name}@${pkg.version} has no documentable API; skipping`);
        return null;
    }
    const folder = formatDisplayPackageName(pkg.name);
    const channel: EmittedEntry['channel'] = isPrerelease(pkg.version) ? 'prerelease' : 'stable';
    const relDir = channel === 'stable' ? 'releases' : 'prerelease';
    const destDir = path.join(ARTIFACTS_ROOT, 'packages', folder, relDir, pkg.version);
    const apiSource = path.join(GENERATED_ROOT, `${pkg.name.split('/').pop() ?? pkg.name}.api.json`);
    await mkdir(destDir, { recursive: true });
    await writeFile(path.join(destDir, 'project.json'), `${JSON.stringify(serializeProject(found))}\n`);
    await copyFile(apiSource, path.join(destDir, 'api.json'));
    return { folder, fullName: pkg.name, version: pkg.version, channel, entities: found.directory.toneMap() };
}

async function collectEmitted(opts: Options): Promise<EmittedEntry[]> {
    const emitted: EmittedEntry[] = [];
    if (opts.extract) {
        // Each extract overwrites generated/manifest.json, so re-create the engine after every one.
        for (const pkg of opts.published) {
            await extractPackage(pkg, opts.projectFolderUrl);
            const engine = await DocsEngine.create({ generatedRoot: GENERATED_ROOT });
            const entry = await emitVersionDir(engine, pkg);
            if (entry) emitted.push(entry);
        }
    } else {
        // generated/ already holds every published package (local / rehearsal path).
        const engine = await DocsEngine.create({ generatedRoot: GENERATED_ROOT });
        for (const pkg of opts.published) {
            const entry = await emitVersionDir(engine, pkg);
            if (entry) emitted.push(entry);
        }
    }
    return emitted;
}

// Only reachable via --prune. The publish path never calls this, preserving the additive invariant.
async function prune(opts: Options, ref: RemoteRef, inputs: readonly PackageVersionsInput[]): Promise<void> {
    const desired = new Set<string>([`${opts.prefix}index.json`]);
    for (const input of inputs) {
        for (const version of input.versions) {
            const relDir = isPrerelease(version) ? 'prerelease' : 'releases';
            const base = `${opts.prefix}packages/${input.folder}/${relDir}/${version}`;
            desired.add(`${base}/project.json`);
            desired.add(`${base}/api.json`);
        }
    }

    const isArtifactKey = (key: string): boolean =>
        key === `${opts.prefix}index.json` || key.endsWith('/project.json') || key.endsWith('/api.json');
    const actual = (await listRemoteKeys(ref)).filter(isArtifactKey);
    const orphans = actual.filter((key) => !desired.has(key));

    if (actual.length > 0 && orphans.length > actual.length * PRUNE_DELETE_CAP && !opts.pruneForce) {
        throw new Error(
            `--prune would delete ${String(orphans.length)}/${String(actual.length)} keys (> ${String(PRUNE_DELETE_CAP * 100)}%); refusing without --prune-force`
        );
    }

    for (const key of orphans) {
        if (opts.dryRun) {
            console.log(`DELETE ${key}`);
            continue;
        }
        await deleteFromR2({ client: ref.client, bucket: ref.bucket, key });
    }
    console.log(`🧹 prune: ${String(orphans.length)} orphan(s) ${opts.dryRun ? 'would be' : ''} deleted`);
}

async function finalize(opts: Options, emitted: readonly EmittedEntry[]): Promise<void> {
    const config = r2ConfigFromEnv(opts.bucket);
    const ref: RemoteRef = { client: createR2Client(config), bucket: config.bucket, prefix: opts.prefix };

    const remote = await fetchRemoteIndex(ref);
    const inputs = buildUnionInputs(remote, emitted);
    const index = buildIndex(inputs, { updatedAt: new Date().toISOString() });

    // Versioned objects are immutable, so a re-run skips any already present.
    for (const e of emitted) {
        const relDir = e.channel === 'stable' ? 'releases' : 'prerelease';
        for (const file of ['project.json', 'api.json'] as const) {
            const rel = `packages/${e.folder}/${relDir}/${e.version}/${file}`;
            const key = `${opts.prefix}${rel}`;
            if (await objectExists({ client: ref.client, bucket: ref.bucket, key })) continue;
            if (opts.dryRun) {
                console.log(`PUT ${key}`);
                continue;
            }
            // cacheControlFor must see the un-prefixed rel, else a --prefix makes index.json immutable.
            await putToR2({
                client: ref.client,
                bucket: ref.bucket,
                key,
                filePath: path.join(ARTIFACTS_ROOT, rel),
                cacheControl: cacheControlFor(rel)
            });
        }
    }

    // index.json is the only mutable object (no-cache), so re-put it every run.
    await mkdir(ARTIFACTS_ROOT, { recursive: true });
    const indexLocal = path.join(ARTIFACTS_ROOT, 'index.json');
    await writeFile(indexLocal, `${JSON.stringify(index, null, 2)}\n`);
    const indexKey = `${opts.prefix}index.json`;
    if (opts.dryRun) {
        console.log(`PUT ${indexKey}`);
    } else {
        await putToR2({
            client: ref.client,
            bucket: ref.bucket,
            key: indexKey,
            filePath: indexLocal,
            cacheControl: cacheControlFor('index.json')
        });
    }

    if (opts.prune) await prune(opts, ref, inputs);

    console.log(
        `✅ synced ${String(emitted.length)} version dir(s); index now covers ${String(inputs.length)} package(s)`
    );
}

async function main(): Promise<void> {
    const opts = await parseArgs(process.argv.slice(2));
    const emitted = await collectEmitted(opts);
    await finalize(opts, emitted);
}

main().catch((error: unknown) => {
    console.error('\n❌ sync-docs-to-artifacts.ts encountered an error:\n');
    console.error(error);
    process.exitCode = 1;
});
