import { existsSync } from 'node:fs';

import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
import { BotLayout } from '@seedcord/utils/internal';

import { ServerBuild } from './ServerBuild';
import { serverCommands } from './serverCommands';
import { runStartFile } from './serverEntry';

import type { ResolvedSeedcordConfig, ResolvedServerTarget } from '#core/config/schema';
import type { BundleStats } from './output';
import type { NextCommand } from './TargetBuild';

type StartTarget = ResolvedServerTarget & { start: string };

export function startsItself(target: ResolvedServerTarget): target is StartTarget {
    return target.start !== undefined;
}

export class StartBuild extends ServerBuild<StartTarget> {
    public static override check(config: ResolvedSeedcordConfig, target: StartTarget): void {
        if (!existsSync(target.start)) {
            throw new SeedcordError(SeedcordErrorCode.CliFileNotFound, [target.start, 'build.start']);
        }
        super.check(config, target);
    }

    public nextCommands(bundle: BundleStats): NextCommand[] {
        return serverCommands(this.project.config.configFile, bundle.entry);
    }

    public bundle(): Promise<BundleStats> {
        return this.bundleJs(runStartFile(BotLayout.keyUnder(this.project.configDir, this.target.start)));
    }
}
