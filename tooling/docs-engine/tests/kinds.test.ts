import { describe, expect, it } from 'vitest';

import { DocKind } from '@model/kinds';
import { kindKey, kindLabel, kindName } from '@src/kinds';

describe('kinds helpers', () => {
    it('returns the frozen kind_<snake> label', () => {
        expect(kindLabel(DocKind.Interface)).toBe('kind_interface');
        expect(kindLabel(DocKind.TypeAlias)).toBe('kind_type_alias');
    });

    it('strips the kind_ prefix for keys and camel-cases the result for names', () => {
        expect(kindKey(DocKind.TypeAlias)).toBe('type_alias');
        expect(kindName(DocKind.TypeAlias)).toBe('typeAlias');
        expect(kindKey(DocKind.Enum)).toBe('enum');
        expect(kindName(DocKind.Enum)).toBe('enum');
    });

    it('falls back to #<kind> for unknown numeric kinds', () => {
        const unknown = 999_999;
        expect(kindLabel(unknown)).toBe('#999999');
        expect(kindKey(unknown)).toBe('#999999');
        expect(kindName(unknown)).toBe('#999999');
    });
});
