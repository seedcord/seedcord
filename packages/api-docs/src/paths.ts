import path from 'node:path';
import { fileURLToPath } from 'node:url';

// helpers can use this to make noice relative paths
const currentFile = fileURLToPath(import.meta.url);
const srcDir = path.dirname(currentFile);

export const PACKAGE_ROOT = path.resolve(srcDir, '..');
export const REPO_ROOT = path.resolve(PACKAGE_ROOT, '..', '..');
export const PACKAGES_DIR = path.join(REPO_ROOT, 'packages');

export const OUTPUT_DIR = path.join(PACKAGE_ROOT, 'generated');
export const MANIFEST_PATH = path.join(OUTPUT_DIR, 'manifest.json');

// make paths relative to the repo root so they look nice in the manifest and console and on github
export function toRepoRelative(filePath: string): string {
  return path.relative(REPO_ROOT, filePath).split(path.sep).join('/');
}

// same idea as the one above but relative to this package
export function toPackageRelative(filePath: string): string {
  return path.relative(PACKAGE_ROOT, filePath).split(path.sep).join('/');
}

// every package writes to generated/<package>.json
export function getOutputPathForPackage(unscopedName: string): string {
  return path.join(OUTPUT_DIR, `${unscopedName}.json`);
}
