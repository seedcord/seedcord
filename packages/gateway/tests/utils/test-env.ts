import fs from 'node:fs/promises';
import path from 'node:path';

import { it as base } from 'vitest';

import { Seedcord } from '#src/Seedcord';

const RADIX = 36;

export class TestEnvironment {
    private constructor(public readonly rootDir: string) {}

    // inside the package so a written file resolves discord.js from its node_modules
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

    public async createDir(relativePath: string): Promise<string> {
        const dirPath = this.resolvePath(relativePath);
        await fs.mkdir(dirPath, { recursive: true });
        return dirPath;
    }

    public async createFile(relativePath: string, content: string): Promise<string> {
        const filePath = this.resolvePath(relativePath);
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        await fs.writeFile(filePath, content, 'utf8');
        return filePath;
    }

    public async removeFile(relativePath: string): Promise<void> {
        const filePath = this.resolvePath(relativePath);
        await fs.rm(filePath, { force: true });
    }
}

type SeedcordWith = (config: ConstructorParameters<typeof Seedcord>[0]) => Seedcord;

export const it = base.extend<{ testEnv: TestEnvironment; seedcordWith: SeedcordWith }>({
    testEnv: async ({}, use) => {
        await using testEnv = await TestEnvironment.create();
        await use(testEnv);
    },
    seedcordWith: async ({}, use) => {
        await using hosts = new AsyncDisposableStack();
        await use((config) => hosts.use(new Seedcord(config)));
    }
});
