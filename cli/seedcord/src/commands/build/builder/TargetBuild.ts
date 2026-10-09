import type { BuildStep } from '#commands/build/BuildRunner';
import type { Steps } from '#core/output/Steps';
import type { Project } from '#core/project/Project';
import type { BundleStats } from './output';

export type NextCommand = [label: string, command: string];

export abstract class TargetBuild implements AsyncDisposable {
    constructor(public readonly project: Project) {}

    // runs inside the read config step, before the bot loads
    public abstract check(): void;

    public abstract bundle(): Promise<BundleStats>;

    public abstract afterBundle(steps: Steps<BuildStep>): Promise<void>;

    public abstract nextCommands(bundle: BundleStats): NextCommand[];

    public async [Symbol.asyncDispose](): Promise<void> {
        await this.project[Symbol.asyncDispose]();
    }
}
