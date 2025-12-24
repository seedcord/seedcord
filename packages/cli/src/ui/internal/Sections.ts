import type { TuiSectionOptions } from '../types';

export interface TuiSectionSnapshot {
    readonly id: string;
    readonly lines: readonly string[];
}

interface StoredSection {
    readonly id: string;
    readonly order: number;
    lines: string[];
    readonly createdAt: number;
}

export class Sections {
    private readonly sections = new Map<string, StoredSection>();
    private createdCounter = 0;

    public create(id: string, options?: TuiSectionOptions): void {
        if (this.sections.has(id)) return;

        const order = options?.order ?? 0;
        this.sections.set(id, { id, order, lines: [], createdAt: this.createdCounter++ });
    }

    public set(id: string, lines: readonly string[]): void {
        const existing = this.sections.get(id);
        if (!existing) {
            this.create(id);
            const created = this.sections.get(id);
            if (!created) return;
            created.lines = [...lines];
            return;
        }

        existing.lines = [...lines];
    }

    public clear(id: string): void {
        const existing = this.sections.get(id);
        if (existing) existing.lines = [];
    }

    public remove(id: string): void {
        this.sections.delete(id);
    }

    public snapshotOrdered(): TuiSectionSnapshot[] {
        const values = [...this.sections.values()];
        values.sort((a, b) => {
            if (a.order !== b.order) return a.order - b.order;
            return a.createdAt - b.createdAt;
        });

        return values.map((s) => ({ id: s.id, lines: [...s.lines] }));
    }
}
