import { SeedcordRangeError, SeedcordTypeError } from '@seedcord/errors/internal';
import { PAGE_MAX, pageCursor } from '@seedcord/kit/internal';
import { ButtonStyle, ComponentType } from 'discord.js';
import { describe, expect, it } from 'vitest';

import { Controls } from '@pagination/controls';

import type { ActionRowBuilder, ButtonBuilder } from '@discordjs/builders';
import type { PageView } from '@seedcord/kit';
import type { APIButtonComponentWithCustomId } from 'discord.js';

const cursor = pageCursor('bans');

function arrayView(page: number, totalPages: number): PageView<number> {
    return { items: [], page, perPage: 10, totalPages, hasPrev: page > 0, hasNext: page < totalPages - 1 };
}

// ButtonBuilder.data/.toJSON() is a union, narrow to the custom-id variant to read custom_id and label.
function jsonOf(button: ButtonBuilder): APIButtonComponentWithCustomId {
    const json = button.toJSON();
    if (!('custom_id' in json)) throw new Error('control button has no custom_id');
    return json;
}
function pageOf(button: ButtonBuilder): number {
    return cursor.decode(jsonOf(button).custom_id).page;
}
function labelOf(button: ButtonBuilder): string | undefined {
    return jsonOf(button).label;
}
function customIds(row: ActionRowBuilder<ButtonBuilder>): string[] {
    return row.toJSON().components.map((component) => ('custom_id' in component ? component.custom_id : ''));
}

describe('controls.button', () => {
    it('encodes the target page on each nav button', () => {
        const controls = new Controls(cursor, arrayView(1, 3));
        expect(pageOf(controls.button('first'))).toBe(0);
        expect(pageOf(controls.button('prev'))).toBe(0);
        expect(pageOf(controls.button('next'))).toBe(2);
        expect(pageOf(controls.button('last'))).toBe(2);
    });

    it('disables prev/first on the first page and next/last on the last', () => {
        const first = new Controls(cursor, arrayView(0, 3));
        expect(first.button('first').data.disabled).toBe(true);
        expect(first.button('prev').data.disabled).toBe(true);
        expect(first.button('next').data.disabled).toBe(false);

        const last = new Controls(cursor, arrayView(2, 3));
        expect(last.button('next').data.disabled).toBe(true);
        expect(last.button('last').data.disabled).toBe(true);
    });

    it('the indicator is a disabled button reading the 1-based page of total', () => {
        const indicator = new Controls(cursor, arrayView(1, 3)).button('indicator');
        expect(indicator.data.disabled).toBe(true);
        expect(labelOf(indicator)).toBe('Page 2 of 3');
    });

    it('the indicator omits the total for an unknown-total view', () => {
        const view: PageView<number> = { items: [], page: 4, perPage: 10, hasPrev: true, hasNext: true };
        expect(labelOf(new Controls(cursor, view).button('indicator'))).toBe('Page 5');
    });

    it('disables last for an unknown-total source', () => {
        const view: PageView<number> = { items: [], page: 0, perPage: 10, hasPrev: false, hasNext: true };
        expect(new Controls(cursor, view).button('last').data.disabled).toBe(true);
    });

    it('clamps the encode target to the cursor bound so an enormous list does not throw', () => {
        const controls = new Controls(cursor, arrayView(PAGE_MAX, PAGE_MAX + 2));
        expect(() => controls.button('last')).not.toThrow();
        expect(() => controls.button('next')).not.toThrow();
    });

    it('disables next and last when the target page would exceed the cursor bound', () => {
        const controls = new Controls(cursor, arrayView(PAGE_MAX, PAGE_MAX + 2));
        expect(controls.button('next').data.disabled).toBe(true);
        expect(controls.button('last').data.disabled).toBe(true);
    });

    it('drops the default label for an icon-only button (emoji, no label)', () => {
        const button = new Controls(cursor, arrayView(1, 3)).button('prev', { emoji: { name: '⬅️' } });
        expect(labelOf(button)).toBeUndefined();
        expect(jsonOf(button).emoji).toBeDefined();
    });

    it('keeps the default label when no emoji is given', () => {
        expect(labelOf(new Controls(cursor, arrayView(1, 3)).button('prev'))).toBe('Prev');
    });

    it('keeps the indicator text even with an emoji', () => {
        const indicator = new Controls(cursor, arrayView(1, 3)).button('indicator', { emoji: { name: '📄' } });
        expect(labelOf(indicator)).toBe('Page 2 of 3');
    });

    it('mints a fresh builder on each call so nothing persists to mutate', () => {
        const controls = new Controls(cursor, arrayView(1, 3));
        expect(controls.button('next')).not.toBe(controls.button('next'));
    });

    it('applies cosmetics but forces the indicator disabled', () => {
        const controls = new Controls(cursor, arrayView(1, 3));
        const next = controls.button('next', { label: 'Forward', style: ButtonStyle.Primary });
        expect(labelOf(next)).toBe('Forward');
        expect(next.data.style).toBe(ButtonStyle.Primary);

        const indicator = controls.button('indicator', { label: 'custom', style: ButtonStyle.Primary });
        expect(labelOf(indicator)).toBe('custom');
        expect(indicator.data.disabled).toBe(true);
    });
});

describe('controls.row', () => {
    it('assembles an action row of the chosen keys in order', () => {
        const row = new Controls(cursor, arrayView(1, 3)).row('prev', 'indicator', 'next');
        const json = row.toJSON();
        expect(json.type).toBe(ComponentType.ActionRow);
        expect(json.components).toHaveLength(3);
    });

    it('rejects more than five buttons in a row', () => {
        const controls = new Controls(cursor, arrayView(1, 3));
        expect(() => controls.row('first', 'prev', 'indicator', 'next', 'last', 'first')).toThrow(SeedcordRangeError);
    });

    it('rejects an empty row', () => {
        expect(() => new Controls(cursor, arrayView(1, 3)).row()).toThrow(SeedcordRangeError);
    });

    it('rejects a row with a duplicate control', () => {
        expect(() => new Controls(cursor, arrayView(1, 3)).row('prev', 'prev')).toThrow(SeedcordTypeError);
    });
});

describe('controls.row custom_id uniqueness', () => {
    it('keeps every control distinct at the lower bound, where first/prev/indicator all target page 0', () => {
        const ids = customIds(new Controls(cursor, arrayView(0, 3)).row('first', 'prev', 'indicator', 'next', 'last'));
        expect(new Set(ids).size).toBe(ids.length);
    });

    it('keeps first and prev distinct on page 1, where both target page 0', () => {
        const ids = customIds(new Controls(cursor, arrayView(1, 3)).row('first', 'prev', 'indicator', 'next', 'last'));
        expect(new Set(ids).size).toBe(ids.length);
    });

    it('keeps an unknown-total row distinct at page 0, where prev clamps onto the indicator', () => {
        const view: PageView<number> = { items: [], page: 0, perPage: 10, hasPrev: false, hasNext: true };
        const ids = customIds(new Controls(cursor, view).row('prev', 'indicator', 'next'));
        expect(new Set(ids).size).toBe(ids.length);
    });
});
