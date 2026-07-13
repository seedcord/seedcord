import { ContainerBuilder, FileBuilder, SectionBuilder, TextDisplayBuilder } from '@discordjs/builders';
import { SeedcordErrorCode, isSeedcordError } from '@seedcord/errors';
import { describe, expect, it } from 'vitest';

import { translateSerializationError } from '@reply/translateSerialization';

import { stripAnsi } from './helpers';

const ROUTE = 'slash:ban';

// captures a real shapeshift error from a djs builder, the same throw production hits
function captureThrow(build: () => unknown): unknown {
    try {
        build();
    } catch (error) {
        return error;
    }
    throw new Error('expected the builder to throw');
}

function messageOf(thrown: unknown, componentClass: string, index: number): string {
    const error = translateSerializationError(thrown, componentClass, index, ROUTE);
    expect(isSeedcordError(error, undefined, SeedcordErrorCode.ReplyComponentSerialization)).toBe(true);
    return stripAnsi(error.message);
}

describe('translateSerializationError', () => {
    it('names the component, index, and route', () => {
        const thrown = captureThrow(() => new TextDisplayBuilder().toJSON());
        const message = messageOf(thrown, 'TextDisplayBuilder', 0);
        expect(message).toContain('TextDisplayBuilder');
        expect(message).toContain('components[0]');
        expect(message).toContain(ROUTE);
    });

    it('renders a missing required string as need-versus-got', () => {
        const thrown = captureThrow(() => new TextDisplayBuilder().toJSON());
        const message = messageOf(thrown, 'TextDisplayBuilder', 0);
        expect(message).toContain('need a string, got nothing');
    });

    it('renders a length overflow with the bound and the received size', () => {
        const thrown = captureThrow(() => new TextDisplayBuilder().setContent('x'.repeat(5000)));
        const message = messageOf(thrown, 'TextDisplayBuilder', 2);
        expect(message).toContain('components[2]');
        expect(message).toContain('need at most 4000 characters, got 5000');
    });

    it('renders an empty string against a minimum length', () => {
        const thrown = captureThrow(() => new TextDisplayBuilder().setContent(''));
        const message = messageOf(thrown, 'TextDisplayBuilder', 0);
        expect(message).toContain('need at least 1 character, got an empty string');
    });

    it('picks the concrete bound out of a union failure', () => {
        const thrown = captureThrow(() => new ContainerBuilder().setAccentColor(0xff_ff_ff + 1));
        const message = messageOf(thrown, 'ContainerBuilder', 0);
        expect(message).toContain('need at most 16777215, got 16777216');
    });

    it('names the accepted classes when an instance check fails', () => {
        const thrown = captureThrow(() =>
            new SectionBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent('hi')).toJSON()
        );
        const message = messageOf(thrown, 'SectionBuilder', 1);
        expect(message).toContain('need a ButtonBuilder or ThumbnailBuilder, got nothing');
    });

    it('prefixes the failing property path from a keyed aggregate', () => {
        const thrown = captureThrow(() => new FileBuilder().setURL('https://example.com/x.pdf'));
        const message = messageOf(thrown, 'FileBuilder', 0);
        expect(message).toContain('url: Invalid protocol for file URL');
        expect(message).toContain('got "https://example.com/x.pdf"');
    });

    it('passes a non-shapeshift throw through with a single closing period', () => {
        const plain = new RangeError('Non-premium buttons must have a label and/or an emoji.');
        const message = messageOf(plain, 'ButtonBuilder', 0);
        expect(message).toContain('ButtonBuilder');
        expect(message).toContain('Non-premium buttons must have a label');
        expect(message).not.toContain('..');
    });

    it('keeps the original throw as the cause', () => {
        const plain = new Error('boom');
        const error = translateSerializationError(plain, 'FileBuilder', 0, ROUTE);
        expect(error.cause).toBe(plain);
    });

    it('stops at the depth cap on a synthetic deep tree', () => {
        let tree: Record<string, unknown> = { message: 'leaf' };
        for (let index = 0; index < 12; index++) tree = { errors: [['k', tree]] };
        const message = messageOf(tree, 'DeepComponent', 0);
        expect(message).toContain('DeepComponent');
    });

    it('falls back on a scalar errors element', () => {
        const message = messageOf({ errors: ['scalar'], message: 'outer' }, 'OddComponent', 0);
        expect(message).toContain('OddComponent');
    });
});
