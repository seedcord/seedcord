import { resolve } from 'node:path';

const TEST_DIR = resolve(__dirname, '..');
const DOCS_GENERATOR_ROOT = resolve(TEST_DIR, '../../docs-generator');

/** Read-only source of the shared fixture. globalSetup copies it before building anything. */
export const MOCK_SOURCE_DIR = resolve(DOCS_GENERATOR_ROOT, 'tests/mock');

// the copy sits one level under PACKAGES_DIR so discoverWorkspacePackages globs it, and four levels
// under the repo root so the fixture's `extends: ../../../../tsconfig.json` still resolves
export const PACKAGES_DIR = TEST_DIR;
export const MOCK_DIR = resolve(TEST_DIR, 'mock');
export const TEMP_DIR = resolve(TEST_DIR, 'temp');
export const MOCK_PACKAGE_NAME = 'mock-docs';
export const MOCK_PACKAGE_FULL_NAME = '@seedcord/mock-docs';
