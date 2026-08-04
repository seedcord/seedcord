import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

import { DocsEngine, type DocsEngineOptions } from '@src/DocsEngine';
import { ManifestReader } from '@src/ManifestReader';

import { MOCK_PACKAGE_FULL_NAME, TEMP_DIR } from './constants';

import type { DocManifest, DocNode, DocPackageModel } from '@src/types';

let cachedEngine: Promise<DocsEngine> | null = null;
let cachedManifest: Promise<DocManifest> | null = null;

const ensureGeneratedDocs = (): void => {
    const manifestPath = resolve(TEMP_DIR, 'manifest.json');
    if (!existsSync(manifestPath)) {
        throw new Error(`Expected generated manifest at ${manifestPath}. Did globalSetup run?`);
    }
};

async function loadEngine(options: Partial<DocsEngineOptions> = {}): Promise<DocsEngine> {
    ensureGeneratedDocs();
    const baseOptions: DocsEngineOptions = {
        generatedRoot: TEMP_DIR,
        ...options
    } satisfies DocsEngineOptions;
    return DocsEngine.create(baseOptions);
}

export async function getEngine(): Promise<DocsEngine> {
    cachedEngine ??= loadEngine();
    return cachedEngine;
}

export async function getManifest(): Promise<DocManifest> {
    if (!cachedManifest) {
        ensureGeneratedDocs();
        const reader = new ManifestReader({ rootDir: TEMP_DIR });
        cachedManifest = reader.read();
    }
    return cachedManifest;
}

export async function getMockPackage(): Promise<DocPackageModel> {
    const engine = await getEngine();
    const pkg = engine.getPackage(MOCK_PACKAGE_FULL_NAME);
    if (!pkg) {
        throw new Error(`Mock package ${MOCK_PACKAGE_FULL_NAME} not found in docs engine.`);
    }
    return pkg;
}

export async function getNodeBySlug(slug: string): Promise<DocNode> {
    const engine = await getEngine();
    const node = engine.getNodeBySlug(MOCK_PACKAGE_FULL_NAME, slug);
    if (!node) {
        throw new Error(`Doc node not found for slug ${slug}.`);
    }
    return node;
}
