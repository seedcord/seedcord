import { TaskState } from './TaskState';

import type { TaskClass } from './decorators/RegisterTask';
import type { Logger } from '@seedcord/logger';
import type { Cron } from 'croner';

export interface LoadedTask {
    readonly key: string;
    readonly Task: TaskClass;
    readonly file: string;
    readonly logger: Logger;
    readonly protect: boolean;
    readonly state: TaskState;
}

export interface CronEntry {
    readonly job: Cron;
    readonly pattern: string;
    readonly timezone: string | undefined;
    // the decorator's paused option, which applies until pause() or resume() runs
    readonly paused: boolean;
}

// everything the plugin holds for one task key. A save unregisters the key and registers it again,
// so the slot keeps a run in flight and what pause() or resume() did
export class TaskSlot {
    public readonly state = new TaskState();
    public loaded: LoadedTask | undefined;
    public cron: CronEntry | undefined;
    public pausedByCall: boolean | undefined;

    public get paused(): boolean {
        return this.pausedByCall ?? this.cron?.paused ?? false;
    }
}

export type CronSlot = TaskSlot & { readonly loaded: LoadedTask; readonly cron: CronEntry };

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
