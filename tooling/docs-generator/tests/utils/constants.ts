import { resolve } from 'node:path';

const TEST_DIR = __dirname;
export const PACKAGES_DIR = resolve(TEST_DIR, '..');
export const TEMP_DIR = resolve(TEST_DIR, 'temp');
export const MOCK_PACKAGE_NAME = 'mock-docs';
