import { TaskState } from './TaskState';

import type { CronJob } from './CronJob';
import type { TaskClass } from './decorators/RegisterTask';
import type { Logger } from '@seedcord/logger';

export interface LoadedTask {
    readonly key: string;
    readonly Task: TaskClass;
    readonly file: string;
    readonly logger: Logger;
    readonly protect: boolean;
    readonly state: TaskState;
}

// everything the plugin holds for one task key. A save unregisters the key and registers it again,
// and the slot keeps the run in flight and the pause() state through that
export class TaskSlot {
    public readonly state = new TaskState();
    public loaded: LoadedTask | undefined;
    public cron: CronJob | undefined;
    private pausedByCall: boolean | undefined;

    public get paused(): boolean {
        return this.pausedByCall ?? this.cron?.settings.pausedByDecorator ?? false;
    }

    public pause(): void {
        this.pausedByCall = true;
    }

    public resume(): void {
        this.pausedByCall = false;
    }
}

export type CronSlot = TaskSlot & { readonly loaded: LoadedTask; readonly cron: CronJob };

const isCronSlot = (slot: TaskSlot): slot is CronSlot => slot.loaded !== undefined && slot.cron !== undefined;

export class TaskRegistry {
    private readonly slots = new Map<string, TaskSlot>();

    public slot(key: string): TaskSlot {
        let slot = this.slots.get(key);
        if (!slot) {
            slot = new TaskSlot();
            this.slots.set(key, slot);
        }
        return slot;
    }

    public loaded(key: string): LoadedTask | undefined {
        return this.slots.get(key)?.loaded;
    }

    public cronSlot(key: string): CronSlot | undefined {
        const slot = this.slots.get(key);
        return slot && isCronSlot(slot) ? slot : undefined;
    }

    public cronSlots(): CronSlot[] {
        return [...this.slots.values()].filter(isCronSlot);
    }

    public get size(): number {
        return [...this.slots.values()].filter((slot) => slot.loaded !== undefined).length;
    }
}
