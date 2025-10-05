import { stat } from 'node:fs/promises';

// quick existence check so we don't blow up on missing files
export async function pathExists(filePath: string): Promise<boolean> {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

// tidy up relative paths so they behave on every os
export function normalizeRelativePath(segment: string): string {
  return segment.replace(/^[.][/\\]+/, '').replace(/\\/g, '/');
}

// typedoc loves colored output but json manifests do not
export function stripAnsi(input: string): string {
  return input.replace(/\u001B\[[0-9;]*m/g, '');
}
