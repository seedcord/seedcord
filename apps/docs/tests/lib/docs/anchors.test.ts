import { describe, expect, it } from 'vitest';

import { memberFragment, paramFragment, typeParamFragment, withOverload } from '../../../src/lib/docs/anchors';

describe('docs anchors', () => {
    it('collapses a constructor to the bare word (its slug already ends in /constructor)', () => {
        expect(memberFragment({ slug: 'autocomplete-handler/constructor' })).toBe('constructor');
    });

    it('uses the bare local name for methods, properties, accessors, and enum members', () => {
        expect(memberFragment({ slug: 'autocomplete-handler/handle-press' })).toBe('handle-press');
        expect(memberFragment({ slug: 'autocomplete-handler/is-ready' })).toBe('is-ready');
        expect(memberFragment({ slug: 'autocomplete-handler/display-name' })).toBe('display-name');
        expect(memberFragment({ slug: 'connection-state/active' })).toBe('active');
    });

    it('strips the parent slug, keeping only the trailing segment', () => {
        expect(memberFragment({ slug: 'a/b/c/deep-member' })).toBe('deep-member');
    });

    it('prefixes type params and params, kebab-casing the name', () => {
        expect(typeParamFragment('T')).toBe('type-param-t');
        // slugify splits lower-to-upper only, so leading caps stay joined (matches the engine Slugger).
        expect(typeParamFragment('TKey')).toBe('type-param-tkey');
        expect(paramFragment('options')).toBe('param-options');
        expect(paramFragment('myOption')).toBe('param-my-option');
    });

    it('appends the overload suffix only for multi-signature members', () => {
        expect(withOverload('handle-press', 0, 1)).toBe('handle-press');
        expect(withOverload('handle-press', 1, 3)).toBe('handle-press-overload-2');
        expect(withOverload('overload', 0, 1)).toBe('overload');
        expect(withOverload('param-options', 0, 2)).toBe('param-options-overload-1');
    });

    it('handles an overloaded constructor: row stays #constructor, panels get -overload-N', () => {
        const base = memberFragment({ slug: 'autocomplete-handler/constructor' });
        expect(base).toBe('constructor');
        // buildSignatureDetails composes the panel anchors this way.
        expect(withOverload(base, 0, 2)).toBe('constructor-overload-1');
        expect(withOverload(base, 1, 2)).toBe('constructor-overload-2');
    });
});
