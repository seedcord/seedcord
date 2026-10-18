import { resolveCommand } from 'package-manager-detector/commands';
import { getUserAgent } from 'package-manager-detector/detect';

import type { AgentName, ResolvedCommand } from 'package-manager-detector';

// pnpm below 6.30 and bun before mid-2024 set no user agent
const FALLBACK: AgentName = 'npm';

// the templates need the part of a resolved command in front of this placeholder
const PROBE = 'dev';

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

export function execCommand(agent: AgentName, args: string[]): ResolvedCommand {
    return resolveCommand(agent, 'execute-local', args) ?? { command: agent, args: ['exec', ...args] };
}
