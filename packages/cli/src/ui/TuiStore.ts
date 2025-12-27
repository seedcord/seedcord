import { EventEmitter } from 'node:events';

import { Sections } from './internal/Sections';

import type { TuiSectionSnapshot } from './internal/Sections';
import type { TuiConfig, TuiSectionOptions } from './types';

export interface TuiSpinnerState {
    readonly frame: string;
    readonly text: string | null;
}

export interface TuiSnapshot {
    readonly sections: readonly TuiSectionSnapshot[];
    readonly statusLine: string | null;
    readonly spinner: TuiSpinnerState | null;
    readonly showStatusLine: boolean;
}

export class TuiStore {
    private sections = new Sections();
    private statusLine: string | null = null;
    private spinner: TuiSpinnerState | null = null;
    private readonly showStatusLine: boolean;

    private readonly emitter = new EventEmitter();
    private snapshotCache: TuiSnapshot;

    public constructor(config: TuiConfig) {
        this.showStatusLine = config.statusLine !== false;
        this.snapshotCache = this.composeSnapshot();
    }

    public createSection(id: string, options?: TuiSectionOptions): void {
        this.sections.create(id, options);
        this.recomputeSnapshot();
        this.notify();
    }

    public setSection(id: string, lines: readonly string[]): void {
        this.sections.set(id, lines);
        this.recomputeSnapshot();
        this.notify();
    }

    public clearSection(id: string): void {
        this.sections.clear(id);
        this.recomputeSnapshot();
        this.notify();
    }

    public removeSection(id: string): void {
        this.sections.remove(id);
        this.recomputeSnapshot();
        this.notify();
    }

    public resetSections(): void {
        this.sections = new Sections();
        this.recomputeSnapshot();
        this.notify();
    }

    public setStatusLine(value: string | null): void {
        this.statusLine = value;
        this.recomputeSnapshot();
        this.notify();
    }

    public setSpinnerState(state: TuiSpinnerState | null): void {
        this.spinner = state;
        this.recomputeSnapshot();
        this.notify();
    }

    public snapshot(): TuiSnapshot {
        return this.snapshotCache;
    }

    public refresh(): void {
        this.recomputeSnapshot();
        this.notify();
    }

    public subscribe(listener: () => void): () => void {
        this.emitter.on('change', listener);
        return () => {
            this.emitter.off('change', listener);
        };
    }

    private notify(): void {
        this.emitter.emit('change');
    }

    private recomputeSnapshot(): void {
        this.snapshotCache = this.composeSnapshot();
    }

    private composeSnapshot(): TuiSnapshot {
        return {
            sections: this.sections.snapshotOrdered(),
            statusLine: this.statusLine,
            spinner: this.spinner,
            showStatusLine: this.showStatusLine
        };
    }
}
