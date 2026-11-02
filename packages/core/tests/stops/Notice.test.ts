import { TextDisplayBuilder } from '@discordjs/builders';
import { describe, expect, it } from 'vitest';

import { Notice } from '#stops/Notice';

import type { RenderContext, ReplyResponse } from '@seedcord/types';

class TestNotice extends Notice {
    constructor(cause?: unknown) {
        super('test denial', cause === undefined ? undefined : { cause });
    }
    override render(c: RenderContext): ReplyResponse {
        return { components: [new TextDisplayBuilder().setContent(c.uuid)] };
    }
}

class ReportingNotice extends Notice {
    constructor() {
        super('reported fault');
        this.report = true;
    }
    override render(): ReplyResponse {
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

    it('stores an ES2022 cause', () => {
        const cause = new Error('driver blew up');
        expect(new TestNotice(cause).cause).toBe(cause);
    });

    it('takes its name from the concrete subclass', () => {
        expect(new TestNotice().name).toBe('TestNotice');
        expect(new ReportingNotice().name).toBe('ReportingNotice');
    });
});
