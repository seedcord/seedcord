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

    it('drops every -next.N for a graduated version and is idempotent', () => {
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
