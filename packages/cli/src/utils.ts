import { spawn } from 'node:child_process';
import { copyFile, mkdir, readdir, stat, writeFile } from 'node:fs/promises';
import { resolve } from 'path';

import { Chalk } from 'chalk';

import type { SpawnSyncOptions } from 'node:child_process';

export const colors = new Chalk();

export function formatDir(path: string): string {
    return path.trim().replace(/\/+$/g, '');
}

export async function spawnProcess(command: string, args: string[], options: SpawnSyncOptions): Promise<void> {
    return new Promise((resolve, reject) => {
        const commandProcess = spawn(command, args, options);
        commandProcess.on('error', (err) => reject(err));
        commandProcess.on('close', (code) => {
            if (code === 0) resolve();
            else reject(new Error(`${command} exited with ${code} code, output: ${commandProcess.stdout?.read()}`));
        });
    });
}

export async function copyDir(src: string, to: string): Promise<void> {
    await mkdir(to, { recursive: true });
    for (const file of await readdir(src)) {
        await copy(resolve(src, file), resolve(to, file));
    }
}

export async function copy(src: string, to: string): Promise<void> {
    const isDir = (await stat(src)).isDirectory();
    if (isDir) {
        await copyDir(src, to);
    } else {
        await copyFile(src, to);
    }
}

export async function createFile(location: string, content: string): Promise<void> {
    await writeFile(location, content);
}
