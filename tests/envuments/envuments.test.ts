import { resolve } from 'node:path';

import { expect } from 'chai';

import { Env } from '../../src/core/utilities/envuments/Env';
import { Envuments } from '../../src/core/utilities/envuments/Envuments';

/**
 * These tests use a dedicated .env.test
 * The test file contains all necessary test variables
 */

// set test .env path before any class evaluation
Envuments.envPaths = resolve(__dirname, '.env.test');

// test class for automatic type detection and non-options based params
class TestTypeDetection {
  // test undefined fallback with non-existent variable
  @Env('NONEXISTENT_TEST_VAR', undefined)
  public static readonly testUndefinedVar: string | undefined;

  // test number type detection from fallback
  // eslint-disable-next-line no-magic-numbers
  @Env('PORT', 6956)
  public static readonly port: number;

  // test boolean type detection from fallback
  @Env('IS_ENABLED', false)
  public static readonly isEnabled: boolean;

  // test string type detection from fallback
  @Env('URI', 'db://localhost:27017/')
  public static readonly uri: string;
}

// test class with explicit converters and env literals
class TestEnv {
  // force string conversion even with number fallback
  @Env('TEST_NUMBER_AS_STRING', { fallback: 42, converter: String })
  public static readonly testNumberAsString: string;

  // force number conversion even with string fallback
  @Env('TEST_STRING_AS_NUMBER', { fallback: '100', converter: Number })
  public static readonly testStringAsNumber: number;

  @Env('TEST_VAR', { fallback: undefined })
  public static readonly testVar: string;

  @Env('VAR_IN_EXTRA_FILE', { fallback: true, converter: Boolean })
  public static readonly varInExtraFile: boolean | undefined;
}

// test class with custom converters
class TestCustomEnv {
  // custom converter for comma separated strings to arrays
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

  // custom converter for feature flags (comma separated to Set)
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

  // custom converter for non existent array (should use fallback)
  @Env('NONEXISTENT_ARRAY', {
    fallback: ['default1', 'default2'],
    converter: (raw, fallback) => {
      if (!raw || raw.trim() === '') return fallback ?? [];
      return raw.split(',').map((s) => s.trim());
    }
  })
  public static readonly nonexistentArray: string[];
}

describe('Envuments', () => {
  describe('env path configuration', () => {
    it('should be .env.test set at the top of the file rather than .env', () => {
      // we expect it to be our test path since we set it at module level
      expect(Envuments.envPaths).to.deep.equal([resolve(__dirname, '.env.test')]);
    });

    it('should allow setting custom .env path', () => {
      Envuments.envPaths = 'custom/.env';
      expect(Envuments.envPaths).to.deep.equal(['custom/.env']);

      // reset to test path
      Envuments.envPaths = [resolve(__dirname, '.env.test'), resolve(__dirname, '.env.extra.test')];
      expect(Envuments.envPaths).to.deep.equal([
        resolve(__dirname, '.env.test'),
        resolve(__dirname, '.env.extra.test')
      ]);
    });
  });

  describe('automatic type detection', () => {
    it('should detect undefined type for non-existent variables', () => {
      expect(typeof TestTypeDetection.testUndefinedVar).to.equal('undefined');
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

  describe('explicit converter overrides', () => {
    it('should use String converter override despite number fallback', () => {
      expect(typeof TestEnv.testNumberAsString).to.equal('string');
      expect(TestEnv.testNumberAsString).to.equal('42');
    });

    it('should use Number converter override despite string fallback', () => {
      expect(typeof TestEnv.testStringAsNumber).to.equal('number');
      expect(TestEnv.testStringAsNumber).to.equal(100);
    });

    it('should load env literals', () => {
      // expecting it to combine VAR_1, VAR_2, VAR_3 into TEST_VAR
      expect(TestEnv.testVar).to.equal('var1var2var3');
    });

    // should work now since we set the extra .env path above
    it('should load variable from extra .env file', () => {
      expect(TestEnv.varInExtraFile).to.equal(true);
    });
  });

  describe('custom converter functions', () => {
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
