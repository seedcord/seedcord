import { describe, expect, it } from 'vitest';

import { formatHoverType } from '#lib/formatHoverType';

describe('formatting a hover type', () => {
    it('breaks a long class signature across its type parameters', async () => {
        const long = 'class SlashHandler<Route extends keyof SlashOptionRegistry, Cache extends CacheType = "cached">';

        await expect(formatHoverType(long)).resolves.toBe(
            [
                'class SlashHandler<',
                '    Route extends keyof SlashOptionRegistry,',
                '    Cache extends CacheType = "cached"',
                '>'
            ].join('\n')
        );
    });

    it('breaks a function signature across its parameters', async () => {
        const long =
            'function SlashRoute<const Route extends keyof SlashOptionRegistry>(...routes: Route[]): (ctor: AssertSlashRoute<Route>) => void';

        const formatted = await formatHoverType(long);

        expect(formatted.split('\n').length).toBeGreaterThan(1);
        expect(formatted.startsWith('function SlashRoute<')).toBe(true);
        expect(formatted).not.toContain('declare ');
        expect(formatted.endsWith(';')).toBe(false);
    });

    it('keeps the receiver in front of a member type', async () => {
        const property =
            'SlashHandler<"ping">.options: Record<"getBoolean", <Name extends "detailed">(name: Name) => Returned<GatewayLens<"cached">, Options[Name]>>';

        const formatted = await formatHoverType(property);

        expect(formatted.startsWith('SlashHandler<"ping">.options: Record<')).toBe(true);
        expect(formatted.split('\n').length).toBeGreaterThan(1);
        expect(formatted).not.toContain('type T =');
    });

    it.each([
        'const detailed: boolean | null',
        'class Ping',
        'const routes: readonly ["ping", "ban"]',
        'type Transport = "gateway" | "http"'
    ])('leaves %s on one line, since it already fits', async (short) => {
        await expect(formatHoverType(short)).resolves.toBe(short);
    });

    it.each([
        ['<"detailed">(name: "detailed") => boolean | null', 'an instantiated overload'],
        ['type const = readonly ["ping"]', 'the name typescript prints for an as-const'],
        ['some text that is not typescript at all', 'anything unparseable']
    ])('hands back %s untouched', async (text) => {
        await expect(formatHoverType(text)).resolves.toBe(text);
    });
});
