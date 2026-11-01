export const DEV_PACKAGES = [
    '@seedcord/eslint-config',
    '@seedcord/tsconfig',
    '@types/node',
    'eslint',
    'jiti',
    'prettier',
    'seedcord',
    'typescript@~6.0',
    'vite@^8.3.4'
];

const EDGE_DEV_PACKAGES = ['cf@1.0.0-beta.26', '@cloudflare/vite-plugin@2.0.0-beta.v.8'];
const SHARED_PACKAGES = ['@discordjs/builders', 'discord-api-types', 'envapt'];

export interface DependencyManifest {
    dependencies: Record<string, string>;
    devDependencies: Record<string, string>;
}

function packageParts(spec: string): [name: string, version: string] {
    const at = spec.startsWith('@') ? spec.indexOf('@', 1) : spec.indexOf('@');
    return at === -1 ? [spec, 'latest'] : [spec.slice(0, at), spec.slice(at + 1)];
}

function manifestEntries(packages: string[]): Record<string, string> {
    return Object.fromEntries(packages.map(packageParts));
}

export function runtimePackages(isGateway: boolean): string[] {
    const transport = isGateway ? ['@seedcord/gateway', 'discord.js'] : ['@seedcord/http'];
    return [...transport, ...SHARED_PACKAGES];
}

export function devPackages(isEdge: boolean): string[] {
    return isEdge ? [...DEV_PACKAGES, ...EDGE_DEV_PACKAGES] : DEV_PACKAGES;
}

export function dependencyManifest(isGateway: boolean, isEdge: boolean): DependencyManifest {
    return {
        dependencies: manifestEntries(runtimePackages(isGateway)),
        devDependencies: manifestEntries(devPackages(isEdge))
    };
}
