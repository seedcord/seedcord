import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

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

    it('gives up on a binary that never answers', async () => {
        const directory = await mkdtemp(join(tmpdir(), 'create-seedcord-probe-'));
        const hangs = join(directory, 'hangs');
        await writeFile(hangs, '#!/bin/sh\nsleep 30\n', { mode: 0o755 });

        try {
            await expect(probeCloudflared(hangs, 200)).resolves.toBe(false);
        } finally {
            await rm(directory, { recursive: true, force: true });
        }
    });
});
