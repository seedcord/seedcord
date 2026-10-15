export class ListCursor<Item> {
    constructor(
        public readonly items: readonly Item[],
        public readonly index = 0
    ) {}

    public get current(): Item | undefined {
        return this.items[this.index];
    }

    // the size rows around the cursor, kept near the middle until a list end stops them
    public window(size: number): { readonly start: number; readonly items: readonly Item[] } {
        const centered = this.index - Math.floor(size / 2);
        const lastStart = Math.max(0, this.items.length - size);

        const start = Math.min(Math.max(centered, 0), lastStart);
        return { start, items: this.items.slice(start, start + size) };
    }

    public next(): ListCursor<Item> {
        return this.step(1);
    }

    public previous(): ListCursor<Item> {
        return this.step(-1);
    }

    private step(offset: number): ListCursor<Item> {
        const { length } = this.items;
        if (length === 0) return this;
        return new ListCursor(this.items, (this.index + offset + length) % length);
    }
}
