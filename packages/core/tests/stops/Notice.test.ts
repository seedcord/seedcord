import { TextDisplayBuilder } from '@discordjs/builders';
import { describe, expect, it } from 'vitest';

import { Notice } from '#stops/Notice';

import type { RenderContext, ReplyResponse } from '@seedcord/types';

const ctx: RenderContext = { uuid: '00000000-0000-0000-0000-000000000000' };

class TestNotice extends Notice {
    constructor(cause?: unknown) {
        super('test denial', cause === undefined ? undefined : { cause });
    }
    render(c: RenderContext): ReplyResponse {
        return { components: [new TextDisplayBuilder().setContent(c.uuid)] };
    }
}

class ReportingNotice extends Notice {
    constructor() {
        super('reported fault');
        this.report = true;
    }
    render(): ReplyResponse {
        return { components: [] };
    }
}

describe('Notice', () => {
    it('is an Error', () => {
        expect(new TestNotice()).toBeInstanceOf(Error);
    });

    it('defaults report to false', () => {
        expect(new TestNotice().report).toBe(false);
    });

    it('lets a subclass opt into reporting', () => {
        expect(new ReportingNotice().report).toBe(true);
    });

    it('stores an ES2022 cause', () => {
        const cause = new Error('driver blew up');
        expect(new TestNotice(cause).cause).toBe(cause);
    });

    it('names itself after the concrete subclass, not Error', () => {
        expect(new TestNotice().name).toBe('TestNotice');
        expect(new ReportingNotice().name).toBe('ReportingNotice');
    });

    it('builds a fresh response on each render', () => {
        const denial = new TestNotice();
        const first = denial.render(ctx);
        const second = denial.render(ctx);
        expect(first).not.toBe(second);
        expect(first.components[0]).not.toBe(second.components[0]);
    });
});
