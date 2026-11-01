import { addCommand, lockfileOnly } from '#cli/packageManager';
import { releaseTag } from '#cli/version';

import type { AgentName, ResolvedCommand } from 'package-manager-detector';

const DEV_PACKAGES = [
    '@seedcord/eslint-config',
    '@seedcord/tsconfig',
    '@types/node',
    'eslint',
    'jiti',
    'prettier',
    'typescript@~6.0',
    'vite@^8.3.4'
];

const EDGE_DEV_PACKAGES = ['cf@1.0.0-beta.26', '@cloudflare/vite-plugin@2.0.0-beta.v.8'];
const SHARED_PACKAGES = ['@discordjs/builders', 'discord-api-types', 'envapt'];

function tagged(name: string, tag: 'next' | null): string {
    return tag === null ? name : `${name}@${tag}`;
}

function runtimePackages(isGateway: boolean, tag: 'next' | null): string[] {
    const transport = isGateway ? [tagged('@seedcord/gateway', tag), 'discord.js'] : [tagged('@seedcord/http', tag)];
    return [...transport, ...SHARED_PACKAGES];
}

function devPackages(isEdge: boolean, tag: 'next' | null): string[] {
    const packages = [tagged('seedcord', tag), ...DEV_PACKAGES];
    return isEdge ? [...packages, ...EDGE_DEV_PACKAGES] : packages;
}

// cf goes in the first add, since bun runs the project's postinstall after every one
export function dependencyCommands(
    agent: AgentName,
    isGateway: boolean,
    isEdge: boolean,
    tag: 'next' | null = releaseTag()
): readonly ResolvedCommand[] {
    return [
        addCommand(agent, devPackages(isEdge, tag), true),
        addCommand(agent, runtimePackages(isGateway, tag), false)
    ];
}

export function lockfileDependencyCommands(
    agent: AgentName,
    isGateway: boolean,
    isEdge: boolean,
    tag: 'next' | null = releaseTag()
): readonly ResolvedCommand[] | null {
    const commands: ResolvedCommand[] = [];

    for (const command of dependencyCommands(agent, isGateway, isEdge, tag)) {
        const lockfile = lockfileOnly(agent, command);
        if (lockfile === null) return null;

        commands.push(lockfile);
    }

    return commands;
}
