import { describe, expect, it } from 'vitest';

import { installHint, missingNotice, probeCloudflared } from '@scaffold/cloudflared';

describe('installHint', () => {
    it('gives the package manager each platform ships with', () => {
        expect(installHint('darwin')).toBe('brew install cloudflared');
        expect(installHint('win32')).toContain('winget install');
    });

    it('sends everyone else to the download page', () => {
        expect(installHint('linux')).toContain('https://');
    });
});

describe('missingNotice', () => {
    it('names the command that needs it', () => {
        expect(missingNotice('darwin')).toContain('seedcord dev');
    });

    it('carries the platform install line', () => {
        expect(missingNotice('darwin')).toContain('brew install cloudflared');
        expect(missingNotice('linux')).toContain('https://');
    });
});

describe('probeCloudflared', () => {
    it('reports false for a binary that does not exist', async () => {
        await expect(probeCloudflared('cloudflared-that-is-not-installed')).resolves.toBe(false);
    });

    it('reports true for one that does', async () => {
        await expect(probeCloudflared('node')).resolves.toBe(true);
    });
});
