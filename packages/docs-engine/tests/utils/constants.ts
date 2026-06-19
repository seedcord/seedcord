import { resolve } from 'node:path';

const TEST_DIR = resolve(__dirname, '..');
const DOCS_GENERATOR_ROOT = resolve(TEST_DIR, '../../docs-generator');
export const PACKAGES_DIR = resolve(DOCS_GENERATOR_ROOT, 'tests');
export const TEMP_DIR = resolve(TEST_DIR, 'temp');
export const MOCK_PACKAGE_NAME = 'mock-docs';
export const MOCK_PACKAGE_FULL_NAME = '@seedcord/mock-docs';
