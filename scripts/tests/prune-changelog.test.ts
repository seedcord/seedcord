import { describe, expect, it } from 'vitest';

import { pruneSupersededPrereleases } from '../release/prune-changelog';

describe('pruneSupersededPrereleases', () => {
    it('drops a -next section once its stable version is present', () => {
        const input = [
            '# @seedcord/core',
            '',
            '## 0.2.0',
            '',
            '### Minor Changes',
            '',
            '- feat: a thing',
            '',
            '## 0.2.0-next.0',
            '',
            '### Minor Changes',
            '',
            '- feat: a thing',
            ''
        ].join('\n');
        const out = pruneSupersededPrereleases(input);
        expect(out).not.toContain('0.2.0-next.0');
        expect(out).toContain('## 0.2.0\n');
    });

    it('keeps a -next section that has no stable counterpart yet', () => {
        const input = ['# @seedcord/core', '', '## 0.3.0-next.0', '', '- a pending change', ''].join('\n');
        expect(pruneSupersededPrereleases(input)).toContain('0.3.0-next.0');
    });

    it('keeps prereleases of a restarted version line whose matching stable is older history below', () => {
        const input = [
            '# @seedcord/gateway',
            '',
            '## 0.1.0-next.1',
            '',
            '- new line pre1',
            '',
            '## 0.1.0-next.0',
            '',
            '- new line pre0',
            '',
            '## 0.1.0',
            '',
            '- ancient stable from before the rename',
            ''
        ].join('\n');
        const out = pruneSupersededPrereleases(input);
        expect(out).toContain('## 0.1.0-next.1');
        expect(out).toContain('## 0.1.0-next.0');
        expect(out).toContain('## 0.1.0\n');
    });

    it('keeps a trailing --- note block when its section is pruned', () => {
        const input = [
            '# @seedcord/gateway',
            '',
            '## 0.1.0',
            '',
            '- stable release',
            '',
            '## 0.1.0-next.0',
            '',
            '- pre',
            '',
            '---',
            '',
            '#### Versions below were published as `seedcord`.',
            '',
            '---',
            '',
            '## 0.16.0-next.4',
            '',
            '- old line entry',
            ''
        ].join('\n');
        const out = pruneSupersededPrereleases(input);
        expect(out).not.toContain('## 0.1.0-next.0');
        expect(out).toContain('#### Versions below were published as `seedcord`.');
        expect(out).toContain('## 0.16.0-next.4');
    });

    it('ends with a single newline when the pruned section was the last in the file', () => {
        const input = [
            '# @seedcord/tsconfig',
            '',
            '## 1.0.1',
            '',
            '- stable',
            '',
            '## 1.0.1-alpha.0',
            '',
            '- superseded',
            ''
        ].join('\n');
        const out = pruneSupersededPrereleases(input);
        expect(out.endsWith('\n')).toBe(true);
        expect(out.endsWith('\n\n')).toBe(false);
    });

    it('drops every -next.N once the stable version exists and is idempotent', () => {
        const input = [
            '# @seedcord/core',
            '',
            '## 0.2.0',
            '',
            '- stable',
            '',
            '## 0.2.0-next.1',
            '',
            '- pre1',
            '',
            '## 0.2.0-next.0',
            '',
            '- pre0',
            '',
            '## 0.1.0',
            '',
            '- older stable',
            ''
        ].join('\n');
        const once = pruneSupersededPrereleases(input);
        expect(once).not.toContain('-next.');
        expect(once).toContain('## 0.2.0\n');
        expect(once).toContain('## 0.1.0\n');
        expect(pruneSupersededPrereleases(once)).toBe(once);
    });
});
