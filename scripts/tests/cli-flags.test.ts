import { describe, expect, it } from 'vitest';

import { CliFlags } from '#src/lib/CliFlags';

const flags = new CliFlags('probe [options]', {
    output: { type: 'string', short: 'o', describe: 'Directory to write into' },
    prefix: { type: 'string', multiple: true, describe: 'Prefix to purge, repeat for several' },
    dryRun: { type: 'boolean', describe: 'Print the request and send nothing' }
});

describe('CliFlags', () => {
    it('rejects a flag the spec does not declare', () => {
        expect(() => flags.parse(['--nope'])).toThrow(/--nope/);
    });

    it('reads a string value from the long flag, the short alias, and the equals form', () => {
        expect(flags.parse(['--output', 'generated']).output).toBe('generated');
        expect(flags.parse(['-o', 'generated']).output).toBe('generated');
        expect(flags.parse(['--output=generated']).output).toBe('generated');
    });

    it('reads a boolean flag as false when it is absent', () => {
        expect(flags.parse([]).dryRun).toBe(false);
        expect(flags.parse(['--dryRun']).dryRun).toBe(true);
    });

    it('collects every value of a repeated flag', () => {
        expect(flags.parse(['--prefix', 'docs.seedcord.org', '--prefix', 'cdn.seedcord.org']).prefix).toEqual([
            'docs.seedcord.org',
            'cdn.seedcord.org'
        ]);
        expect(flags.parse([]).prefix).toEqual([]);
    });

    it('rejects a string flag given no value', () => {
        expect(() => flags.parse(['--output'])).toThrow(/--output/);
    });

    it('answers wantsHelp for --help and -h', () => {
        expect(flags.wantsHelp(['--help'])).toBe(true);
        expect(flags.wantsHelp(['-h'])).toBe(true);
        expect(flags.wantsHelp(['--output', 'generated'])).toBe(false);
    });

    it('renders help from the same spec it parses', () => {
        const text = flags.help();

        expect(text).toContain('Usage: probe [options]');
        expect(text).toContain('-o, --output <value>  Directory to write into');
        expect(text).toContain('--dryRun');
        expect(text).toContain('Prefix to purge, repeat for several');
    });
});
