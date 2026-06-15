import { Colors, EmbedBuilder } from 'discord.js';
import { beforeEach, describe, expect, it } from 'vitest';

import { BuilderComponent } from '@components/Component';
import { setBotColor } from '@src/botColorHolder';
import { Notice } from '@stops/Notice';

import type { RenderContext, ReplyResponse } from '@seedcord/types';

const ctx: RenderContext = { uuid: '00000000-0000-0000-0000-000000000000' };

class TestNotice extends Notice {
    constructor(cause?: unknown) {
        super('test denial', cause === undefined ? undefined : { cause });
    }
    render(c: RenderContext): ReplyResponse {
        return { kind: 'embed', embeds: [new EmbedBuilder().setDescription(c.uuid)] };
    }
}

class ReportingNotice extends Notice {
    constructor() {
        super('reported fault');
        this.report = true;
    }
    render(): ReplyResponse {
        return { kind: 'embed', embeds: [] };
    }
}

class TestEmbed extends BuilderComponent<'embed'> {
    constructor() {
        super('embed');
    }
}

class TestContainer extends BuilderComponent<'container'> {
    constructor() {
        super('container');
    }
}

class PresetContainer extends BuilderComponent<'container'> {
    constructor() {
        super('container');
        this.instance.setAccentColor(0xef4860);
    }
}

describe('BuilderComponent bot color', () => {
    beforeEach(() => {
        setBotColor(undefined);
    });

    it('resolves a numeric ColorResolvable into a container accent', () => {
        setBotColor(0xfe565a);
        expect(new TestContainer().component.data.accent_color).toBe(0xfe565a);
    });

    it('resolves a named ColorResolvable into a container accent', () => {
        setBotColor('Red');
        expect(new TestContainer().component.data.accent_color).toBe(Colors.Red);
    });

    it('applies the bot color to an embed', () => {
        setBotColor('#123456');
        expect(new TestEmbed().component.data.color).toBe(0x123456);
    });

    it('leaves the container accent unset when no bot color is configured', () => {
        expect(new TestContainer().component.data.accent_color).toBeUndefined();
    });

    it('does not overwrite a color the subclass set in its own constructor', () => {
        setBotColor(0xfe565a);
        expect(new PresetContainer().component.data.accent_color).toBe(0xef4860);
    });
});

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
        if (first.kind === 'embed' && second.kind === 'embed') {
            expect(first.embeds[0]).not.toBe(second.embeds[0]);
        }
    });
});
