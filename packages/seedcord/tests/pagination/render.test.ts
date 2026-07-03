import { ButtonBuilder, TextDisplayBuilder } from '@discordjs/builders';
import { BuilderComponent } from '@seedcord/core';
import { pageCursor } from '@seedcord/kit/internal';
import { ButtonStyle, ComponentType } from 'discord.js';
import { describe, expect, it } from 'vitest';

import { renderPage } from '@pagination/render';

import type { PageView } from '@seedcord/kit';
import type { ReplyResponse } from '@seedcord/types';
import type { APIComponentInContainer, APIContainerComponent } from 'discord.js';

const cursor = pageCursor('roles');

function arrayView<Item>(items: Item[], page: number, totalPages: number): PageView<Item> {
    return { items, page, perPage: 2, totalPages, hasPrev: page > 0, hasNext: page < totalPages - 1 };
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
function rowButtonCount(container: APIContainerComponent): number {
    const row = container.components.find((part) => part.type === ComponentType.ActionRow);
    return row?.type === ComponentType.ActionRow ? row.components.length : 0;
}
function sectionCount(container: APIContainerComponent): number {
    return container.components.filter((part) => part.type === ComponentType.Section).length;
}

class ItemSection extends BuilderComponent<'section'> {
    constructor(text: string) {
        super('section');
        this.instance
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(text))
            .setButtonAccessory(
                new ButtonBuilder().setCustomId(`go:${text}`).setLabel('Go').setStyle(ButtonStyle.Secondary)
            );
    }
}

describe('renderPage default container', () => {
    it('lists string items as one text block and appends the five-control row', () => {
        const reply = renderPage(arrayView(['a', 'b'], 0, 3), cursor, { renderItem: (item) => item });
        const container = containerOf(reply);
        expect(textLines(container)).toEqual(['a\nb']);
        expect(rowButtonCount(container)).toBe(5);
    });

    it('stringifies items when no renderItem is given', () => {
        const container = containerOf(renderPage(arrayView([1, 2], 0, 1), cursor, {}));
        expect(textLines(container)).toEqual(['1\n2']);
    });

    it('renders a section per item when renderItem returns one', () => {
        const reply = renderPage(arrayView(['x', 'y'], 0, 1), cursor, { renderItem: (item) => new ItemSection(item) });
        const container = containerOf(reply);
        expect(sectionCount(container)).toBe(2);
        expect(rowButtonCount(container)).toBe(5);
    });

    it('passes the absolute index across pages to renderItem', () => {
        const container = containerOf(
            renderPage(arrayView(['c', 'd'], 1, 3), cursor, { renderItem: (item, index) => `${index}:${item}` })
        );
        expect(textLines(container)).toEqual(['2:c\n3:d']);
    });

    it('omits the last control for an unknown-total source', () => {
        const view: PageView<string> = { items: ['a'], page: 0, perPage: 2, hasPrev: false, hasNext: true };
        expect(rowButtonCount(containerOf(renderPage(view, cursor, { renderItem: (item) => item })))).toBe(3);
    });
});

describe('renderPage render override', () => {
    it('returns the user component array verbatim', () => {
        const reply = renderPage(arrayView(['a'], 0, 1), cursor, {
            render: (_view, controls) => [new TextDisplayBuilder().setContent('custom'), controls.row('prev', 'next')]
        });
        const first = reply.components[0]?.toJSON();
        expect(first?.type).toBe(ComponentType.TextDisplay);
        expect(reply.components).toHaveLength(2);
    });

    it('wraps a returned string in a text display', () => {
        const reply = renderPage(arrayView(['a'], 0, 1), cursor, { render: () => 'just text' });
        const first = reply.components[0]?.toJSON();
        expect(first?.type).toBe(ComponentType.TextDisplay);
        expect(first && 'content' in first ? first.content : '').toBe('just text');
    });

    it('passes a returned ReplyResponse through unchanged', () => {
        const passthrough: ReplyResponse = { components: [new TextDisplayBuilder().setContent('done')] };
        expect(renderPage(arrayView(['a'], 0, 1), cursor, { render: () => passthrough })).toBe(passthrough);
    });
});
