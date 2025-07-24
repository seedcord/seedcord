/* eslint-disable no-magic-numbers */
/* eslint-disable @typescript-eslint/no-unused-expressions */
/* eslint-disable no-unused-expressions */
import { resolve } from 'node:path';

import { expect } from 'chai';

import { Env } from '../../src/core/utilities/envuments/Env';
import { Envuments } from '../../src/core/utilities/envuments/Envuments';

describe('Envuments', () => {
  before(() => (Envuments.envPaths = resolve(__dirname, '.env.test')));

  describe('env path configuration', () => {
    it('should be .env.test set at the top of the file rather than .env', () => {
      // we expect it to be our test path since we set it at module level
      expect(Envuments.envPaths).to.deep.equal([resolve(__dirname, '.env.test')]);
    });

    it('should allow setting custom .env path', () => {
      Envuments.envPaths = 'custom/.env';
      expect(Envuments.envPaths).to.deep.equal(['custom/.env']);
    });

    // reset to test path
    it('should set to list of .env files', () => {
      Envuments.envPaths = [resolve(__dirname, '.env.test'), resolve(__dirname, '.env.extra')];
      expect(Envuments.envPaths).to.deep.equal([resolve(__dirname, '.env.test'), resolve(__dirname, '.env.extra')]);
    });
  });

  describe('automatic type detection', () => {
    class TestTypeDetection {
      @Env('NONEXISTENT_TEST_VAR', undefined)
      public static readonly testUndefinedVar: string | undefined;

      @Env('NONEXISTENT_VAR_WITHOUT_FALLBACK', { converter: String })
      public static readonly nonexistentVarWithoutFallback: string | null;

      @Env('NONEXISTENT_VAR_NO_OPTIONS')
      public static readonly nonexistentVarNoOptions: string | null;

      @Env('PORT', 6956)
      public static readonly port: number;

      @Env('IS_ENABLED', false)
      public static readonly isEnabled: boolean;

      @Env('URI', 'db://localhost:27017/')
      public static readonly uri: string;
    }

    it('should detect undefined type for non-existent variables', () => {
      expect(TestTypeDetection.testUndefinedVar).to.be.undefined;
    });

    it('should return null for non-existent variable without fallback but with converter', () => {
      expect(TestTypeDetection.nonexistentVarWithoutFallback).to.be.null;
    });

    it('should return null for non-existent variable without fallback or converter', () => {
      expect(TestTypeDetection.nonexistentVarNoOptions).to.be.null;
    });

    it('should detect number type from fallback', () => {
      const expectedPort = 6956;
      expect(typeof TestTypeDetection.port).to.equal('number');
      expect(TestTypeDetection.port).to.equal(expectedPort);
    });

    it('should detect boolean type from fallback', () => {
      expect(typeof TestTypeDetection.isEnabled).to.equal('boolean');
      expect(TestTypeDetection.isEnabled).to.equal(false);
    });

    it('should detect string type from fallback', () => {
      expect(typeof TestTypeDetection.uri).to.equal('string');
      expect(TestTypeDetection.uri).to.equal('mongodb://localhost:27017/');
    });
  });

  describe('explicit overrides and other tests', () => {
    class TestEnv extends Envuments {
      @Env('TEST_NUMBER_AS_STRING', { fallback: 42, converter: String })
      public static readonly testNumberAsString: string;

      @Env('TEST_STRING_AS_NUMBER', { fallback: '100', converter: Number })
      public static readonly testStringAsNumber: number;

      @Env('TEST_VAR', { fallback: undefined })
      public static readonly testVar: string;

      @Env('VAR_IN_EXTRA_FILE', { converter: Boolean })
      public static readonly varInExtraFile: boolean | undefined;

      @Env('NONEXISTENT_VAR_WITH_FALLBACK_STRING', { fallback: 'default-value' })
      public static readonly nonexistentVarWithFallbackString: string;

      @Env('NONEXISTENT_VAR_WITH_FALLBACK_NUMBER', { fallback: 12345 })
      public static readonly nonexistentVarWithFallbackNumber: number;

      @Env('NONEXISTENT_VAR_WITH_FALLBACK_BOOLEAN', { fallback: true })
      public static readonly nonexistentVarWithFallbackBoolean: boolean;
    }

    it('should use String converter override despite number fallback', () => {
      expect(typeof TestEnv.testNumberAsString).to.equal('string');
      expect(TestEnv.testNumberAsString).to.equal('42');
    });

    it('should use Number converter override despite string fallback', () => {
      expect(typeof TestEnv.testStringAsNumber).to.equal('number');
      expect(TestEnv.testStringAsNumber).to.equal(100);
    });

    it('should resolve template variables in environment values', () => {
      // expecting it to combine VAR_1, VAR_2, VAR_3 into TEST_VAR
      expect(TestEnv.testVar).to.equal('var1var2var3');
    });

    // should work now since we set the extra .env path above
    it('should load variable from .env.extra file', () => {
      expect(TestEnv.varInExtraFile).to.be.true;
    });

    it('should return fallback for non-existent variable with non-undefined fallback', () => {
      expect(TestEnv.nonexistentVarWithFallbackString).to.equal('default-value');
    });

    it('should return fallback for non-existent variable with non-undefined number fallback', () => {
      expect(TestEnv.nonexistentVarWithFallbackNumber).to.equal(12345);
    });

    it('should return fallback for non-existent variable with non-undefined boolean fallback', () => {
      expect(TestEnv.nonexistentVarWithFallbackBoolean).to.equal(true);
    });

    // isStaging is present because we extended the Envuments class
    it('should be true for isStaging environment set in .env.extra', () => {
      expect(TestEnv.isStaging).to.be.true;
    });
  });

  describe('custom converter functions', () => {
    class TestCustomEnv {
      @Env('ALLOWED_CHANNELS', {
        fallback: ['default-channel'],
        converter: (raw, fallback) => {
          if (!raw || raw.trim() === '') return fallback ?? [];
          return raw
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean);
        }
      })
      public static readonly allowedChannels: string[];

      @Env('FEATURE_FLAGS', {
        fallback: new Set(['basic']),
        converter: (raw, fallback) => {
          if (!raw || raw.trim() === '') return fallback ?? new Set();
          const flags = raw
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean);
          return new Set(flags);
        }
      })
      public static readonly featureFlags: Set<string>;

      @Env('NONEXISTENT_ARRAY', {
        fallback: ['default1', 'default2'],
        converter: (raw, fallback) => {
          if (!raw || raw.trim() === '') return fallback ?? [];
          return raw.split(',').map((s) => s.trim());
        }
      })
      public static readonly nonexistentArray: string[];
    }

    it('should parse comma-separated string to array', () => {
      expect(TestCustomEnv.allowedChannels).to.be.an('array');
      const expectedChannels = ['123456789', '987654321', '555666777'];
      expect(TestCustomEnv.allowedChannels).to.deep.equal(expectedChannels);
    });

    it('should parse comma-separated string to Set', () => {
      expect(TestCustomEnv.featureFlags).to.be.instanceof(Set);
      const expectedFlags = new Set(['auth', 'logging', 'caching', 'webhooks']);
      expect(TestCustomEnv.featureFlags).to.deep.equal(expectedFlags);
    });

    it('should use fallback for non-existent variable with custom converter', () => {
      expect(TestCustomEnv.nonexistentArray).to.be.an('array');
      const expectedFallback = ['default1', 'default2'];
      expect(TestCustomEnv.nonexistentArray).to.deep.equal(expectedFallback);
    });
  });
});
