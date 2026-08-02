import { ComponentType } from 'discord-api-types/v10';
import { describe, expect, it } from 'vitest';

import { PaginatorBase } from '@pagination/PaginatorBase';
import { ArraySource } from '@pagination/sources';

import type { PaginatorConfig } from '@pagination/PaginatorBase';
import type { ReplyResponse } from '@seedcord/types';
import type { APIComponentInContainer, APIContainerComponent } from 'discord-api-types/v10';

interface TestCtx {
    readonly tag: string;
}
const ctx: TestCtx = { tag: 'ctx' };

class TestPaginator<Item> extends PaginatorBase<Item, 'test', TestCtx> {
    constructor(config: PaginatorConfig<Item, 'test', TestCtx>) {
        super(config);
    }
}

function containerOf(reply: ReplyResponse): APIContainerComponent {
    const json = reply.components[0]?.toJSON();
    if (json?.type !== ComponentType.Container) throw new Error('expected a container');
    return json;
}
function textLines(container: APIContainerComponent): string[] {
    return container.components.reduce<string[]>((acc, part: APIComponentInContainer) => {
        if (part.type === ComponentType.TextDisplay) acc.push(part.content);
        return acc;
    }, []);
}

const letters = ['a', 'b', 'c', 'd', 'e'];

function pager(): TestPaginator<string> {
    return new TestPaginator({
        prefix: 'test',
        source: new ArraySource<string, TestCtx>(() => letters, { perPage: 2 }),
        renderItem: (letter) => letter
    });
}

describe('PaginatorBase', () => {
    it('builds the cursor off the configured prefix', () => {
        expect(pager().cursor.prefix).toBe('test');
    });

    it('renders the requested page through the source', async () => {
        const reply = await pager().page(ctx, 1);
        expect(textLines(containerOf(reply))).toEqual(['c\nd']);
    });

    it('forwards the context to the source loader', async () => {
        const seen: TestCtx[] = [];
        const paged = new TestPaginator<string>({
            prefix: 'test',
            source: new ArraySource<string, TestCtx>((received) => {
                seen.push(received);
                return letters;
            }),
            renderItem: (letter) => letter
        });

        await paged.page(ctx, 0);

        expect(seen[0]).toBe(ctx);
    });

    it('stamps the nav buttons with the cursor prefix', async () => {
        const reply = await pager().page(ctx, 1);
        const row = containerOf(reply).components.find((part) => part.type === ComponentType.ActionRow);
        if (row?.type !== ComponentType.ActionRow) throw new Error('expected an action row');

        const ids = row.components.reduce<string[]>((acc, button) => {
            if ('custom_id' in button && button.custom_id) acc.push(button.custom_id);
            return acc;
        }, []);
        expect(ids.length).toBeGreaterThan(0);
        expect(ids.every((id) => pager().cursor.decode(id).page >= 0)).toBe(true);
    });
});
