export class ListCursor<Item> {
    constructor(
        private readonly items: readonly Item[],
        public readonly index = 0
    ) {}

    public get current(): Item | undefined {
        return this.items[this.index];
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
