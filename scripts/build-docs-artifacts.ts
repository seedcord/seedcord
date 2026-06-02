/* eslint-disable no-console -- developer-facing CLI script; console is its output channel */
import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

import {
    buildIndex,
    DocsEngine,
    formatDisplayPackageName,
    isPrerelease,
    serializeProject
} from '@seedcord/docs-engine';

import type { DocProjectFile, IndexJson, PackageVersionsInput } from '@seedcord/docs-engine';

// Builds the index.json + per-version project.json the VersionedDocsEngine reads, from generated/.
// `--fixtures` adds synthetic versions per package so the version dropdown is testable locally.

const INIT_CWD = process.env.INIT_CWD ? path.resolve(process.env.INIT_CWD) : process.cwd();
const GENERATED_ROOT = path.resolve(INIT_CWD, 'generated');
const ARTIFACTS_ROOT = path.join(GENERATED_ROOT, 'artifacts');

const USE_FIXTURES = process.argv.includes('--fixtures');

interface SyntheticVersion {
    version: string;
    channel: 'stable' | 'prerelease';
}

// From a real version, derive up to two prior minor line heads + a next-minor prerelease.
function syntheticVersions(real: string): SyntheticVersion[] {
    const match = /^(\d+)\.(\d+)\.(\d+)/.exec(real);
    if (!match) {
        return [{ version: real, channel: 'stable' }];
    }

    const [major, minor, patch] = [Number(match[1]), Number(match[2]), Number(match[3])];
    const versions: SyntheticVersion[] = [{ version: real, channel: 'stable' }];

    for (const back of [1, 2]) {
        if (minor - back >= 0) {
            versions.push({ version: `${major}.${minor - back}.${Math.max(patch - back, 0)}`, channel: 'stable' });
        }
    }

    versions.push({ version: `${major}.${minor + 1}.0-next.1`, channel: 'prerelease' });
    return versions;
}

interface ProjectArtifact {
    folder: string;
    version: string;
    channel: 'stable' | 'prerelease';
    file: DocProjectFile;
}

async function writeArtifacts(index: IndexJson, projects: readonly ProjectArtifact[]): Promise<void> {
    await rm(ARTIFACTS_ROOT, { recursive: true, force: true });
    await mkdir(ARTIFACTS_ROOT, { recursive: true });
    await writeFile(path.join(ARTIFACTS_ROOT, 'index.json'), `${JSON.stringify(index, null, 2)}\n`);

    for (const project of projects) {
        const relative = index.pathTemplates[project.channel]
            .replace('{name}', project.folder)
            .replace('{version}', project.version);
        const dest = path.join(ARTIFACTS_ROOT, relative);
        await mkdir(path.dirname(dest), { recursive: true });
        await writeFile(dest, `${JSON.stringify(project.file)}\n`);
    }
}

async function main(): Promise<void> {
    const engine = await DocsEngine.create({ generatedRoot: GENERATED_ROOT });

    const inputs: PackageVersionsInput[] = [];
    const projects: ProjectArtifact[] = [];

    for (const fullName of engine.listPackages()) {
        const pkg = engine.getPackage(fullName);
        if (!pkg) continue;

        const real = pkg.manifest.version;
        const folder = formatDisplayPackageName(fullName);
        const file = serializeProject(pkg);
        const versions = USE_FIXTURES
            ? syntheticVersions(real)
            : [{ version: real, channel: isPrerelease(real) ? 'prerelease' : 'stable' } satisfies SyntheticVersion];

        inputs.push({ folder, fullName, versions: versions.map((entry) => entry.version) });
        for (const { version, channel } of versions) {
            projects.push({ folder, version, channel, file });
        }
    }

    const index = buildIndex(inputs, { updatedAt: new Date().toISOString() });
    await writeArtifacts(index, projects);

    console.log(
        `Wrote ${String(projects.length)} project.json + index.json to ${path.relative(INIT_CWD, ARTIFACTS_ROOT)}${
            USE_FIXTURES ? ' (with synthetic fixture versions)' : ''
        }`
    );
}

main().catch((error: unknown) => {
    console.error('\n❌ build-docs-artifacts.ts encountered an error:\n');
    console.error(error);
    process.exitCode = 1;
});
