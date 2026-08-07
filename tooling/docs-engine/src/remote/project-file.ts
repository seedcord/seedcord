import { buildPackageFromModel } from '@builders/package-builder';
import { ProjectFetchError } from '@remote/errors';

import type { DocManifestPackage, DocNode, DocPackageModel } from '@src/types';

/**
 * The published, pre-adapted form of one package version: the adapted `DocNode` tree plus minimal
 * identity. Indexes, search, and the directory are derived on load, so they are not stored here.
 */
export interface DocProjectFile {
    schemaVersion: 1;
    package: { name: string; version: string };
    root: DocNode;
    // absent on project files published before this schema captured the readme
    readme?: string;
    // same, but for the changelog url
    changelogUrl?: string;
}

export function serializeProject(model: DocPackageModel): DocProjectFile {
    return {
        schemaVersion: 1,
        package: { name: model.manifest.name, version: model.manifest.version },
        root: model.root,
        ...(model.manifest.readme && { readme: model.manifest.readme }),
        ...(model.manifest.changelogUrl && { changelogUrl: model.manifest.changelogUrl })
    };
}

export function deserializeProject(file: DocProjectFile): DocPackageModel {
    return buildPackageFromModel(manifestShell(file.package, file.readme, file.changelogUrl), file.root);
}

export function validateProjectFile(value: unknown): DocProjectFile {
    if (typeof value !== 'object' || value === null) {
        throw new ProjectFetchError(null, 'project.json must be an object');
    }
    const root = value as Record<string, unknown>;
    if (root.schemaVersion !== 1) {
        throw new ProjectFetchError(null, `project.json: unsupported schemaVersion ${String(root.schemaVersion)}`);
    }
    if (typeof root.package !== 'object' || root.package === null) {
        throw new ProjectFetchError(null, 'project.json.package must be an object');
    }
    const pkg = root.package as Record<string, unknown>;
    if (typeof pkg.name !== 'string' || typeof pkg.version !== 'string') {
        throw new ProjectFetchError(null, 'project.json.package.name and .version must be strings');
    }
    if (typeof root.root !== 'object' || root.root === null) {
        throw new ProjectFetchError(null, 'project.json.root must be an object');
    }

    // serializeProject already produced this tree at publish time, so deep validation here would be redundant cost on every fetch.
    return {
        schemaVersion: 1,
        package: { name: pkg.name, version: pkg.version },
        root: root.root as DocNode,
        ...(typeof root.readme === 'string' && { readme: root.readme }),
        ...(typeof root.changelogUrl === 'string' && { changelogUrl: root.changelogUrl })
    };
}

// project.json carries only name and version. The rest of DocManifestPackage describes the extraction
// run (entry points, warnings, errors), which the render path never reads.
function manifestShell(pkg: DocProjectFile['package'], readme?: string, changelogUrl?: string): DocManifestPackage {
    return {
        name: pkg.name,
        version: pkg.version,
        entryPoints: [],
        output: null,
        warnings: [],
        errors: [],
        warningCount: 0,
        errorCount: 0,
        succeeded: true,
        ...(readme && { readme }),
        ...(changelogUrl && { changelogUrl })
    };
}
