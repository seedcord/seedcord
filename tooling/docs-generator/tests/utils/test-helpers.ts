import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export interface ApiItemJson {
    kind: string;
    name: string;
    releaseTag?: string;
    isStatic?: boolean;
    members?: ApiItemJson[];
}

export interface ApiPackageJson {
    metadata?: { toolPackage?: string; toolVersion?: string };
    kind: string;
    name: string;
    members: ApiItemJson[];
}

/** Read the generated API Extractor doc model (`<name>.api.json`). */
export function readApiPackage(tempDir: string, packageName: string): ApiPackageJson {
    const filePath = resolve(tempDir, `${packageName}.api.json`);
    if (!existsSync(filePath)) {
        throw new Error(`Generated API doc model not found: ${filePath}`);
    }
    return JSON.parse(readFileSync(filePath, 'utf8')) as ApiPackageJson;
}

/** Raw text of the generated doc model, for substring presence checks. */
export function readApiPackageRaw(tempDir: string, packageName: string): string {
    return readFileSync(resolve(tempDir, `${packageName}.api.json`), 'utf8');
}

/** Top-level (entry-point) members of a package's doc model. */
export function entryPointMembers(pkg: ApiPackageJson): ApiItemJson[] {
    return pkg.members[0]?.members ?? [];
}

/** Find a member by name within a container. */
export function findMember(container: ApiItemJson | ApiPackageJson, name: string): ApiItemJson | undefined {
    const members = 'members' in container ? (container.members ?? []) : [];
    return members.find((member) => member.name === name);
}
