/* eslint-disable no-console -- CLI script */
import { copyFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import {
    buildIndex,
    DocsEngine,
    formatDisplayPackageName,
    isPrerelease,
    serializeProject
} from '@seedcord/docs-engine';
import { ApiDocsGenerator, documentedPackageNames } from '@seedcord/docs-generator';

import { artifactKeys, isArtifactKey, versionDir } from '#src/docs/artifact-keys';
import { deprecatedByPackage, withoutDeprecated } from '#src/docs/deprecated-versions';
import { R2Bucket } from '#src/docs/R2Bucket';
import { buildUnionInputs } from '#src/docs/union-inputs';
import { workspaceOf } from '#src/docs/workspace-of';
import { CliFlags } from '#src/lib/CliFlags';
import { PUBLISHED_FLAGS, readPublished } from '#src/lib/published-packages';

import type { EmittedEntry } from '#src/docs/union-inputs';
import type { PublishedPackage } from '#src/lib/published-packages';
import type { PackageVersionsInput } from '@seedcord/docs-engine';

// Additive publish. Merges freshly-published versions into the remote R2 index without dropping a
// prior version. build-docs-artifacts.ts is the whole-tree local builder.

const INIT_CWD = process.env.INIT_CWD ? path.resolve(process.env.INIT_CWD) : process.cwd();
const GENERATED_ROOT = path.resolve(INIT_CWD, 'generated');
const ARTIFACTS_ROOT = path.join(GENERATED_ROOT, 'artifacts');
const DEFAULT_PROJECT_FOLDER_URL = 'https://github.com/seedcord/seedcord';

// a union-reconstruction bug could otherwise let --prune wipe the whole catalog
const PRUNE_DELETE_CAP = 0.5;

const flags = new CliFlags('pnpm docs:sync [options]', {
    ...PUBLISHED_FLAGS,
    extract: { type: 'boolean', describe: 'Run the API extractor before emitting version dirs' },
    'project-folder-url': { type: 'string', describe: 'GitHub repo base for source links' },
    ref: { type: 'string', describe: 'Git ref the source links point at, normally the release commit sha' },
    prefix: { type: 'string', describe: 'Key prefix inside the bucket' },
    bucket: { type: 'string', describe: 'Bucket name, overriding R2_BUCKET' },
    prune: { type: 'boolean', describe: 'Delete objects the rebuilt index no longer lists' },
    'prune-force': { type: 'boolean', describe: 'Allow a prune that drops more than half the keys' },
    overwrite: { type: 'boolean', describe: 'Re-upload version dirs R2 already holds' },
    'dry-run': { type: 'boolean', describe: 'Print what would be written and send nothing' }
});

interface Options {
    published: PublishedPackage[];
    extract: boolean;
    projectFolderUrl: string;
    ref: string | undefined;
    prefix: string;
    bucket: string | undefined;
    prune: boolean;
    pruneForce: boolean;
    dryRun: boolean;
    /** Re-uploads version dirs that R2 already holds, to repair artifacts a generator bug wrote. */
    overwrite: boolean;
}

async function readOptions(argv: readonly string[]): Promise<Options> {
    const parsed = flags.parse(argv);

    return {
        published: await readPublished(parsed),
        extract: parsed.extract,
        projectFolderUrl: parsed['project-folder-url'] ?? DEFAULT_PROJECT_FOLDER_URL,
        ref: parsed.ref,
        prefix: parsed.prefix ?? '',
        bucket: parsed.bucket,
        prune: parsed.prune,
        pruneForce: parsed['prune-force'],
        overwrite: parsed.overwrite,
        dryRun: parsed['dry-run']
    };
}

async function emitVersionDir(engine: DocsEngine, pkg: PublishedPackage): Promise<EmittedEntry | null> {
    const found = engine.getPackage(pkg.name);
    if (!found) {
        console.log(`⏭️  ${pkg.name}@${pkg.version} has no documentable API; skipping`);
        return null;
    }
    const folder = formatDisplayPackageName(pkg.name);
    const destDir = path.join(ARTIFACTS_ROOT, versionDir(folder, pkg.version));
    const apiSource = path.join(GENERATED_ROOT, `${pkg.name.split('/').pop() ?? pkg.name}.api.json`);
    await mkdir(destDir, { recursive: true });
    await writeFile(path.join(destDir, 'project.json'), `${JSON.stringify(serializeProject(found))}\n`);
    await copyFile(apiSource, path.join(destDir, 'api.json'));
    return {
        folder,
        fullName: pkg.name,
        version: pkg.version,
        channel: isPrerelease(pkg.version) ? 'prerelease' : 'stable',
        entities: found.directory.toneMap(),
        description: found.manifest.description,
        workspace: workspaceOf(found.manifest.sources)
    };
}

async function collectEmitted(opts: Options): Promise<EmittedEntry[]> {
    const documented = await documentedPackageNames();
    const published = opts.published.filter((pkg) => documented.has(pkg.name));

    if (opts.extract) {
        // api-extractor drops an inherited member when its base class's package is absent from the model
        await new ApiDocsGenerator({
            outputDir: GENERATED_ROOT,
            githubBase: opts.projectFolderUrl,
            ...(opts.ref !== undefined && { ref: opts.ref })
        }).run();
    }

    const engine = await DocsEngine.create({ generatedRoot: GENERATED_ROOT });
    const emitted: EmittedEntry[] = [];
    for (const pkg of published) {
        const entry = await emitVersionDir(engine, pkg);
        if (entry) emitted.push(entry);
    }
    return emitted;
}

// docs-publish.yml never passes --prune
async function prune(opts: Options, bucket: R2Bucket, inputs: readonly PackageVersionsInput[]): Promise<void> {
    const desired = artifactKeys(inputs);
    const stored = await bucket.list();
    const actual = stored.filter((key) => isArtifactKey(key));
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
        await bucket.delete(key);
    }
    console.log(`🧹 prune: ${String(orphans.length)} orphan(s) ${opts.dryRun ? 'would be' : ''} deleted`);
}

async function finalize(opts: Options, emitted: readonly EmittedEntry[]): Promise<void> {
    const bucket = R2Bucket.fromEnv(opts.bucket, opts.prefix);

    const remote = await bucket.getIndex();
    const union = buildUnionInputs(remote, emitted);
    const inputs = withoutDeprecated(union, await deprecatedByPackage(union, (message) => console.warn(message)));
    const index = buildIndex(inputs, { updatedAt: new Date().toISOString() });

    // already-uploaded versions are immutable. skip them on a re-run.
    for (const entry of emitted) {
        for (const file of ['project.json', 'api.json'] as const) {
            const key = `${versionDir(entry.folder, entry.version)}/${file}`;
            if (!opts.overwrite && (await bucket.exists(key))) continue;
            if (opts.dryRun) {
                console.log(`PUT ${key}`);
                continue;
            }
            await bucket.put(key, path.join(ARTIFACTS_ROOT, key));
        }
    }

    await mkdir(ARTIFACTS_ROOT, { recursive: true });
    const indexLocal = path.join(ARTIFACTS_ROOT, 'index.json');
    await writeFile(indexLocal, `${JSON.stringify(index, null, 2)}\n`);

    if (opts.dryRun) {
        console.log('PUT index.json');
    } else {
        await bucket.put('index.json', indexLocal);
    }

    if (opts.prune) await prune(opts, bucket, inputs);

    console.log(
        `✅ synced ${String(emitted.length)} version dir(s); index now covers ${String(inputs.length)} package(s)`
    );
}

async function main(): Promise<void> {
    const argv = process.argv.slice(2);
    if (flags.wantsHelp(argv)) {
        console.log(flags.help());
        return;
    }

    const opts = await readOptions(argv);
    const emitted = await collectEmitted(opts);
    await finalize(opts, emitted);
}

main().catch((error: unknown) => {
    console.error('\n❌ sync-docs-to-artifacts.ts encountered an error:\n');
    console.error(error);
    process.exitCode = 1;
});
