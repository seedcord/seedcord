import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const run = promisify(execFile);

export async function releaseTags(cwd: string, ...options: string[]): Promise<string[]> {
    const { stdout } = await run('git', ['tag', '--list', 'release-*', ...options], { cwd });
    return stdout.split('\n').filter((tag) => tag !== '');
}
