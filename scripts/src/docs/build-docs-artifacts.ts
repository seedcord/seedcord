/* eslint-disable no-console -- CLI script */
import { copyFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

import {
    buildIndex,
    DocsEngine,
    findReexportsMissingFromOwner,
    formatDisplayPackageName,
    isPrerelease,
    serializeProject
} from '@seedcord/docs-engine';

import { workspaceOf } from './workspace-of';

import type {
    DocProjectFile,
    IndexJson,
    PackageReexports,
    PackageSourceIndex,
    PackageVersionsInput
} from '@seedcord/docs-engine';

const INIT_CWD = process.env.INIT_CWD ? path.resolve(process.env.INIT_CWD) : process.cwd();
const GENERATED_ROOT = path.resolve(INIT_CWD, 'generated');
const ARTIFACTS_ROOT = path.join(GENERATED_ROOT, 'artifacts');

interface ProjectArtifact {
    folder: string;
    version: string;
    channel: 'stable' | 'prerelease';
    file: DocProjectFile;
    apiSource: string;
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

        // api.json rides along so a render-shape change can re-derive project.json without
        // re-extracting. Nothing reads it at serve time.
        await copyFile(project.apiSource, path.join(path.dirname(dest), 'api.json'));
    }
}

async function readWorkspaces(): Promise<Map<string, string>> {
    const raw = await readFile(path.join(GENERATED_ROOT, 'manifest.json'), 'utf8');
    const manifest = JSON.parse(raw) as { packages?: { name: string; sources?: PackageSourceIndex }[] };
    const workspaces = new Map<string, string>();

    for (const pkg of manifest.packages ?? []) {
        const workspace = workspaceOf(pkg.sources);
        if (workspace) workspaces.set(pkg.name, workspace);
    }

    return workspaces;
}

async function main(): Promise<void> {
    const engine = await DocsEngine.create({ generatedRoot: GENERATED_ROOT });
    const workspaces = await readWorkspaces();

    const inputs: PackageVersionsInput[] = [];
    const projects: ProjectArtifact[] = [];
    const ownership: PackageReexports[] = [];

    for (const fullName of engine.listPackages()) {
        const pkg = engine.getPackage(fullName);
        if (!pkg) continue;

        const { version } = pkg.manifest;
        const folder = formatDisplayPackageName(fullName);
        // The extractor names api.json after the unscoped package name, which diverges from the
        // display folder when a displayName override is set.
        const apiSource = path.join(GENERATED_ROOT, `${fullName.split('/').pop() ?? fullName}.api.json`);
        const file = serializeProject(pkg);
        const workspace = workspaces.get(fullName);

        inputs.push({
            folder,
            fullName,
            versions: [version],
            entities: pkg.directory.toneMap(),
            ...(pkg.manifest.description && { description: pkg.manifest.description }),
            ...(workspace && { workspace })
        });
        projects.push({ folder, version, channel: isPrerelease(version) ? 'prerelease' : 'stable', file, apiSource });

        ownership.push({
            name: fullName,
            reexports: pkg.root.reexports ?? [],
            exportedNames: pkg.root.children.filter((node) => node.isExported).map((node) => node.name)
        });
    }

    const missing = findReexportsMissingFromOwner(ownership);
    if (missing.length > 0) {
        throw new Error(`Re-exported symbols with no public home:\n  ${missing.join('\n  ')}`);
    }

    const index = buildIndex(inputs, { updatedAt: new Date().toISOString() });
    await writeArtifacts(index, projects);

    console.log(
        `Wrote ${String(projects.length)} project.json + api.json + index.json to ${path.relative(INIT_CWD, ARTIFACTS_ROOT)}`
    );
}

main().catch((error: unknown) => {
    console.error('\n❌ build-docs-artifacts.ts encountered an error:\n');
    console.error(error);
    process.exitCode = 1;
});
