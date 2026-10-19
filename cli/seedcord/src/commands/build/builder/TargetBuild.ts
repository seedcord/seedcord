import type { BuildTarget } from '#core/config/detectTarget';
import type { Project } from '#core/project/Project';
import type { BundleStats } from './output';

export type NextCommand = [label: string, command: string];

export abstract class TargetBuild implements AsyncDisposable {
    public abstract readonly kind: BuildTarget['kind'];

    constructor(public readonly project: Project) {}

    public writeTypes?(): Promise<void>;

    public boot?(): Promise<void>;

    public abstract nextCommands(bundle: BundleStats): NextCommand[];

    public async [Symbol.asyncDispose](): Promise<void> {
        await this.project[Symbol.asyncDispose]();
    }
}
