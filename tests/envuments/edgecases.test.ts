/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unused-expressions */
/* eslint-disable no-unused-expressions */
import { resolve } from 'node:path';

import { expect } from 'chai';

import { Env } from '../../src/core/utilities/envuments/Env';
import { Envuments } from '../../src/core/utilities/envuments/Envuments';

describe('Edge Cases', () => {
  before(() => (Envuments.envPaths = resolve(__dirname, '.env.edgecases')));

  describe('Number conversion edge cases', () => {
    class NumberEdgeCases {
      @Env('ZERO_VALUE', { converter: Number })
      static readonly zeroFallback: number;

      @Env('NEGATIVE_ZERO', { converter: Number })
      static readonly negativeZero: number;

      @Env('INFINITY_VALUE', { converter: Number })
      static readonly infinityFallback: number;

      @Env('NEGATIVE_INFINITY', { converter: Number })
      static readonly negativeInfinityFallback: number;
    }

    it('should handle zero correctly (not return fallback)', () => {
      expect(NumberEdgeCases.zeroFallback).to.equal(0);
    });

    it('should handle negative zero correctly', () => {
      expect(NumberEdgeCases.negativeZero).to.equal(0);
    });

    it('should handle infinity fallback', () => {
      expect(NumberEdgeCases.infinityFallback).to.equal(Infinity);
    });

    it('should handle negative infinity fallback', () => {
      expect(NumberEdgeCases.negativeInfinityFallback).to.equal(-Infinity);
    });
  });

  describe('Boolean conversion edge cases', () => {
    class BooleanEdgeCases {
      @Env('UPPERCASE_TRUE', false)
      static readonly uppercaseTrue: boolean;

      @Env('MIXED_CASE_FALSE', true)
      static readonly mixedCaseFalse: boolean;

      @Env('NUMERIC_BOOL', false)
      static readonly numericBool: boolean;
    }

    it('should handle uppercase boolean values', () => {
      expect(BooleanEdgeCases.uppercaseTrue).to.equal(true);
    });

    it('should handle mixed case boolean values', () => {
      expect(BooleanEdgeCases.mixedCaseFalse).to.equal(false);
    });

    it('should handle numeric boolean values', () => {
      expect(BooleanEdgeCases.numericBool).to.equal(true);
    });
  });

  describe('Template resolution edge cases', () => {
    class TemplateEdgeCases {
      @Env('NONEXISTENT_TEMPLATE')
      static readonly nonexistentTemplate: string;

      @Env('EMPTY_TEMPLATE')
      static readonly emptyTemplate: string;

      @Env('CIRCULAR_TEMPLATE')
      static readonly circularTemplate: string;

      @Env('CIRCULAR_A')
      static readonly circularA: string;

      @Env('CIRCULAR_B')
      static readonly circularB: string;

      @Env('MULTI_TYPE_TEMPLATE')
      static readonly multiTypeTemplate: string;
    }

    it('should handle nonexistent template variables', () => {
      expect(TemplateEdgeCases.nonexistentTemplate).to.equal('${DOES_NOT_EXIST}');
    });

    it('should preserve template syntax for empty variables', () => {
      expect(TemplateEdgeCases.emptyTemplate).to.equal('${EMPTY_VAR}');
    });

    it('should handle circular template variables', () => {
      expect(TemplateEdgeCases.circularTemplate).to.equal('${CIRCULAR_TEMPLATE}');
    });

    it('should handle circular references between variables', () => {
      expect(TemplateEdgeCases.circularA).to.equal('${CIRCULAR_B}');
      expect(TemplateEdgeCases.circularB).to.equal('${CIRCULAR_A}');
    });

    it('should resolve multi-type template variables correctly', () => {
      expect(TemplateEdgeCases.multiTypeTemplate).to.equal('stringVar123true');
      expect(typeof TemplateEdgeCases.multiTypeTemplate).to.equal('string');
    });
  });

  describe('Type coercion edge cases', () => {
    class TypeCoercionEdgeCases {
      @Env('STRING_TO_NUMBER', 'not a number', Number)
      static readonly stringToNumber: number;

      @Env('OBJECT_FALLBACK', {
        fallback: { key: 'default' },
        converter: (raw, fallback) => {
          if (typeof raw !== 'string' || !fallback) return fallback;
          return JSON.parse(raw);
        }
      })
      static readonly objectFallback: object;
    }

    it('should handle invalid number conversions', () => {
      const result = TypeCoercionEdgeCases.stringToNumber;
      expect(typeof result).to.equal('number');
      expect(Number.isNaN(result)).to.be.true;
    });

    it('should handle object fallback', () => {
      const result = TypeCoercionEdgeCases.objectFallback;
      expect(result).to.deep.equal({ key: 'default' });
    });
  });

  describe('Extreme values', () => {
    class ExtremeValues {
      @Env('UNICODE_VALUE', 'ascii')
      static readonly unicodeValue: string;

      @Env('VERY_LONG_STRING', 'short')
      static readonly veryLongString: string;
    }

    it('should handle very long environment values', () => {
      const longValue = 'x'.repeat(5000);
      expect(ExtremeValues.veryLongString).to.equal(longValue);
    });

    it('should handle unicode characters', () => {
      expect(ExtremeValues.unicodeValue).to.equal('🚀 Hello 世界 🌍');
    });
  });
});
