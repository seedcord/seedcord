import type { BuildTarget } from '#core/config/detectTarget';
import type { ResolvedSeedcordConfig, ResolvedTarget } from '#core/config/schema';
import type { Project } from '#core/project/Project';
import type { BundleStats } from './output';

export type NextCommand = [label: string, command: string];

export type TargetsByKind = { [Kind in ResolvedTarget['kind']]: Extract<ResolvedTarget, { kind: Kind }> };

export interface TargetBuildClass<Kind extends keyof TargetsByKind, Build extends TargetBuild> {
    new (project: Project, target: TargetsByKind[Kind]): Build;
    // runs before any plugin in vitePlugins starts
    check(config: ResolvedSeedcordConfig, target: TargetsByKind[Kind]): void;
}

export abstract class TargetBuild implements AsyncDisposable {
    public abstract readonly kind: BuildTarget['kind'];

    constructor(public readonly project: Project) {}

    public boot?(): Promise<void>;

    public abstract nextCommands(bundle: BundleStats): NextCommand[];

    public async [Symbol.asyncDispose](): Promise<void> {
        await this.project[Symbol.asyncDispose]();
    }
}
