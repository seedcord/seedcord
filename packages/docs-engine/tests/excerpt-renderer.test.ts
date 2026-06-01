import { ExcerptTokenKind } from '@microsoft/api-extractor-model';
import { describe, expect, it } from 'vitest';

import { tokensToSigParts } from '../src/model/excerpt-renderer';

import type { ExcerptToken } from '@microsoft/api-extractor-model';

// justified: the tests hand-build the minimal `{ kind, text, canonicalReference }` shape the renderer
// reads; constructing real AE ExcerptToken instances would require a full ApiModel.
const refToken = (text: string, canonical: string): ExcerptToken =>
    ({
        kind: ExcerptTokenKind.Reference,
        text,
        canonicalReference: { toString: () => canonical }
    }) as unknown as ExcerptToken;

const contentToken = (text: string): ExcerptToken =>
    ({ kind: ExcerptTokenKind.Content, text }) as unknown as ExcerptToken;

describe('tokensToSigParts', () => {
    it('strips the AE $N disambiguation suffix from the display text but keeps ref.name byte-exact', () => {
        const [part] = tokensToSigParts([refToken('Logger$1', 'winston!winston.Logger:class')]);
        expect(part?.kind).toBe('ref');
        if (part?.kind !== 'ref') throw new Error('expected a ref part');
        // Display drops `$1`; ref.name stays `Logger$1` so it can't collide with a documented
        // internal `Logger` during the resolver's name fallback.
        expect(part.text).toBe('Logger');
        expect(part.ref.name).toBe('Logger$1');
        expect(part.ref.packageName).toBe('winston');
    });

    it('leaves a normal reference identifier untouched', () => {
        const [part] = tokensToSigParts([refToken('GuildMember', 'discord.js!GuildMember:class')]);
        if (part?.kind !== 'ref') throw new Error('expected a ref part');
        expect(part.text).toBe('GuildMember');
        expect(part.ref.name).toBe('GuildMember');
    });

    it('wraps intrinsic keywords in content as refs so they can link to MDN/TS', () => {
        const parts = tokensToSigParts([contentToken('Promise<string>')]);
        const intrinsic = parts.find((part) => part.kind === 'ref' && part.text === 'string');
        expect(intrinsic).toBeDefined();
        const bare = parts.find((part) => part.kind === 'text' && part.text === 'Promise');
        expect(bare).toBeDefined();
    });
});
