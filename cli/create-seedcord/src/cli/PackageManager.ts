import { resolveCommand } from 'package-manager-detector/commands';
import { getUserAgent } from 'package-manager-detector/detect';

import type { AgentName, ResolvedCommand } from 'package-manager-detector';

// pnpm below 6.30 and bun before mid-2024 don't set a user agent
const FALLBACK: AgentName = 'npm';

// the templates use the part of a resolved command in front of this placeholder
const PROBE = 'dev';

const LOCKFILE_ONLY_FLAG: Partial<Record<AgentName, string>> = {
    npm: '--package-lock-only',
    yarn: '--mode=update-lockfile'
};

export class PackageManager {
    public constructor(public readonly name: AgentName) {}

    public static running(): PackageManager {
        return new PackageManager(getUserAgent() ?? FALLBACK);
    }

    public runPrefix(): string {
        return this.prefixOf('run', `${this.name} run`);
    }

    public execPrefix(): string {
        return this.prefixOf('execute-local', `${this.name} exec`);
    }

    public add(packages: string[], dev: boolean): ResolvedCommand {
        const args = dev ? ['-D', ...packages] : packages;
        return resolveCommand(this.name, 'add', args) ?? { command: this.name, args: ['add', ...args] };
    }

    public install(): ResolvedCommand {
        return resolveCommand(this.name, 'install', []) ?? { command: this.name, args: ['install'] };
    }

    public exec(args: string[]): ResolvedCommand {
        return resolveCommand(this.name, 'execute-local', args) ?? { command: this.name, args: ['exec', ...args] };
    }

    public lockfileOnly({ command, args }: ResolvedCommand): ResolvedCommand {
        return { command, args: [...args, LOCKFILE_ONLY_FLAG[this.name] ?? '--lockfile-only'] };
    }

    private prefixOf(intent: 'run' | 'execute-local', fallback: string): string {
        const resolved = resolveCommand(this.name, intent, [PROBE]);
        if (!resolved) return fallback;

        return [resolved.command, ...resolved.args.slice(0, -1)].join(' ');
    }
}
