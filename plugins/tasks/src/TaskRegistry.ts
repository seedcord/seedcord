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

export interface CronEntry {
    readonly job: CronJob;
    readonly pattern: string;
    readonly timezone: string | undefined;
    readonly startsPaused: boolean;
}

// holds the run in flight and the pause state for one key. A save registers the key again and reuses this slot
export class TaskSlot {
    public readonly state = new TaskState();
    private current: LoadedTask | undefined;
    private entry: CronEntry | undefined;
    private pausedByCall: boolean | undefined;

    public get loaded(): LoadedTask | undefined {
        return this.current;
    }

    public get cron(): CronEntry | undefined {
        return this.entry;
    }

    public get paused(): boolean {
        return this.pausedByCall ?? this.entry?.startsPaused ?? false;
    }

    public load(loaded: LoadedTask, cron: CronEntry | undefined): void {
        this.current = loaded;
        this.entry = cron;
    }

    public unload(): void {
        this.entry?.job.stop();
        this.entry = undefined;
        this.current = undefined;
    }

    public pause(): void {
        this.pausedByCall = true;
    }

    public resume(): void {
        this.pausedByCall = false;
    }

    public sync(started: boolean): void {
        if (started && !this.paused) this.entry?.job.start();
        else this.entry?.job.stop();
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
        return this.slots.values().filter(isCronSlot).toArray();
    }

    public get size(): number {
        return this.slots
            .values()
            .filter((slot) => slot.loaded !== undefined)
            .toArray().length;
    }
}
