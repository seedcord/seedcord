import fs from 'node:fs/promises';
import path from 'node:path';

import { it as base } from 'vite-plus/test';

import type { CoreBase } from '@seedcord/core';

const RADIX = 36;

// the plugins never read core in their tests. this only satisfies the constructor
export const core = {} as CoreBase;

// a temporary folder for one test, removed when the test disposes it
export class TestEnvironment {
    private constructor(public readonly rootDir: string) {}

    // under the plugin's own folder because a written file has to resolve the plugin's node_modules
    public static async create(): Promise<TestEnvironment> {
        const rootDir = path.join(process.cwd(), 'tests', 'temp', Math.random().toString(RADIX).slice(2));
        await fs.mkdir(rootDir, { recursive: true });
        return new TestEnvironment(rootDir);
    }

    public async [Symbol.asyncDispose](): Promise<void> {
        await fs.rm(this.rootDir, { recursive: true, force: true });
    }

    public resolvePath(relativePath: string): string {
        return path.resolve(this.rootDir, relativePath);
    }

    public async createFile(relativePath: string, content: string): Promise<string> {
        const filePath = this.resolvePath(relativePath);
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        await fs.writeFile(filePath, content, 'utf8');
        return filePath;
    }

    public async removeFile(relativePath: string): Promise<void> {
        await fs.rm(this.resolvePath(relativePath), { force: true });
    }
}

// each test gets a fresh folder with an empty services/ in it
export const it = base.extend<{ testEnv: TestEnvironment }>({
    testEnv: async ({}, use) => {
        await using testEnv = await TestEnvironment.create();
        await testEnv.createFile('services/.keep', '');
        await use(testEnv);
    }
});
