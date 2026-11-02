import { resolveCommand } from 'package-manager-detector/commands';
import { getUserAgent } from 'package-manager-detector/detect';

import type { AgentName, ResolvedCommand } from 'package-manager-detector';

// pnpm below 6.30 and bun before mid-2024 set no user agent
const FALLBACK: AgentName = 'npm';

// the templates need the part of a resolved command in front of this placeholder
const PROBE = 'dev';

const LOCKFILE_ONLY_FLAG: Partial<Record<AgentName, string>> = {
    bun: '--lockfile-only',
    npm: '--package-lock-only',
    pnpm: '--lockfile-only',
    yarn: '--mode=update-lockfile'
};

// --mode arrived in yarn 3.0
const FIRST_YARN_WITH_MODE = 3;

function yarnHasMode(): boolean {
    const entry = process.env.npm_config_user_agent?.split(' ').find((part) => part.startsWith('yarn/'));
    return Number.parseInt(entry?.slice('yarn/'.length) ?? '', 10) >= FIRST_YARN_WITH_MODE;
}

export function runningAgent(): AgentName {
    return getUserAgent() ?? FALLBACK;
}

function prefixOf(agent: AgentName, intent: 'run' | 'execute-local', fallback: string): string {
    const resolved = resolveCommand(agent, intent, [PROBE]);
    if (!resolved) return fallback;

    return [resolved.command, ...resolved.args.slice(0, -1)].join(' ');
}

export function runPrefix(agent: AgentName): string {
    return prefixOf(agent, 'run', `${agent} run`);
}

export function execPrefix(agent: AgentName): string {
    return prefixOf(agent, 'execute-local', `${agent} exec`);
}

export function addCommand(agent: AgentName, packages: string[], dev: boolean): ResolvedCommand {
    const args = dev ? ['-D', ...packages] : packages;
    return resolveCommand(agent, 'add', args) ?? { command: agent, args: ['add', ...args] };
}

export function installCommand(agent: AgentName): ResolvedCommand {
    return resolveCommand(agent, 'install', []) ?? { command: agent, args: ['install'] };
}

export function execCommand(agent: AgentName, args: string[]): ResolvedCommand {
    return resolveCommand(agent, 'execute-local', args) ?? { command: agent, args: ['exec', ...args] };
}

export function lockfileOnlyFlag(agent: AgentName): string | null {
    if (agent === 'yarn' && !yarnHasMode()) return null;

    return LOCKFILE_ONLY_FLAG[agent] ?? null;
}
