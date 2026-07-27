import fs from 'node:fs/promises';
import path from 'node:path';

export class TestEnvironment {
    public readonly rootDir: string;

    constructor(prefix = 'seedcord-test-') {
        const RADIX = 36;
        this.rootDir = path.join(process.cwd(), 'tests', 'temp', prefix + Math.random().toString(RADIX).slice(2));
    }

    public async setup(): Promise<void> {
        await fs.mkdir(this.rootDir, { recursive: true });
    }

    public async teardown(): Promise<void> {
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
