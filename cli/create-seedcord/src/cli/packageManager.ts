import { resolveCommand } from 'package-manager-detector/commands';
import { getUserAgent } from 'package-manager-detector/detect';

import type { AgentName, ResolvedCommand } from 'package-manager-detector';

// pnpm below 6.30 and bun before mid-2024 set no user agent
const FALLBACK: AgentName = 'npm';

// resolveCommand answers per script, and the README needs the part in front of one
const PROBE_SCRIPT = 'dev';

export function runningAgent(): AgentName {
    return getUserAgent() ?? FALLBACK;
}

export function runPrefix(agent: AgentName): string {
    const resolved = resolveCommand(agent, 'run', [PROBE_SCRIPT]);
    if (!resolved) return `${agent} run`;

    return [resolved.command, ...resolved.args.slice(0, -1)].join(' ');
}

export function addCommand(agent: AgentName, packages: string[], dev: boolean): ResolvedCommand {
    const args = dev ? ['-D', ...packages] : packages;
    return resolveCommand(agent, 'add', args) ?? { command: agent, args: ['add', ...args] };
}
