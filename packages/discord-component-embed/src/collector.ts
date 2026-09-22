import { ComponentEmbedError } from './ComponentEmbedError';

export interface Collector {
    map<Item, Result>(items: readonly Item[], convert: (item: Item) => Result): Result[];
}

export const throwFirst: Collector = { map: (items, convert) => items.map(convert) };

export function collectInto(errors: ComponentEmbedError[]): Collector {
    return {
        map: (items, convert) =>
            items.flatMap((item) => {
                try {
                    return [convert(item)];
                } catch (error) {
                    if (!(error instanceof ComponentEmbedError)) throw error;
                    errors.push(error);
                    return [];
                }
            })
    };
}
