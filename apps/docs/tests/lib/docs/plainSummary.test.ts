import { describe, expect, it } from 'vitest';

import { plainSummary } from '@lib/docs/plainSummary';

describe('plainSummary', () => {
    it('replaces a markdown link with its label', () => {
        expect(plainSummary('see [the handler](/packages/x/1.0.0/classes/handler) now')).toBe('see the handler now');
    });

    it('drops inline-code backticks', () => {
        expect(plainSummary('pass `ApplicationCommandType.User` here')).toBe('pass ApplicationCommandType.User here');
    });

    it('cleans a summary with a backticked link plus code spans', () => {
        const raw =
            'Routes commands to a [`ContextMenuHandler`](/packages/seedcord/0.14.0/classes/context-menu-handler). Pass `ApplicationCommandType.User`.';
        expect(plainSummary(raw)).toBe('Routes commands to a ContextMenuHandler. Pass ApplicationCommandType.User.');
    });

    it('collapses newlines and runs of whitespace', () => {
        expect(plainSummary('first line.\n\nsecond   line.')).toBe('first line. second line.');
    });

    it('leaves prose brackets and non-link parens alone', () => {
        expect(plainSummary('call `arr[0](idx)` to read, returns []')).toBe('call arr[0](idx) to read, returns []');
    });
});
