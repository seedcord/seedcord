import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { gitPlanFrom, probeGit } from '@scaffold/git';

import type { GitProbe } from '@scaffold/git';

const PRESENT: GitProbe = {
    installed: true,
    insideRepo: false,
    userName: 'dhruv'
};

describe('gitPlanFrom', () => {
    it('initializes and commits in a plain empty directory', () => {
        const plan = gitPlanFrom(PRESENT, true);

        expect(plan.init).toBe(true);
        expect(plan.developerUsername).toBe('dhruv');
        expect(plan.notice).toBeNull();
    });

    it('skips init inside an existing repo', () => {
        const plan = gitPlanFrom({ ...PRESENT, insideRepo: true }, true);

        expect(plan.init).toBe(false);
        expect(plan.notice).toContain('already');
    });

    it('skips init when the user passed --no-git', () => {
        const plan = gitPlanFrom(PRESENT, false);

        expect(plan.init).toBe(false);
        expect(plan.notice).toBeNull();
    });

    it('keeps the git name even when init is off, since the config reads it', () => {
        const plan = gitPlanFrom(PRESENT, false);

        expect(plan.developerUsername).toBe('dhruv');
    });

    it('names the knock-on when git is absent', () => {
        const plan = gitPlanFrom({ installed: false, insideRepo: false, userName: null }, true);

        expect(plan.init).toBe(false);
        expect(plan.developerUsername).toBe('the developer');
        expect(plan.notice).toContain('the developer');
    });

    it('falls back to the placeholder when git has no name set', () => {
        const plan = gitPlanFrom({ ...PRESENT, userName: null }, true);

        expect(plan.init).toBe(true);
        expect(plan.developerUsername).toBe('the developer');
        expect(plan.notice).toContain('the developer');
    });
});

describe('probeGit against the real git', () => {
    it('finds this repo from inside it', async () => {
        const probe = await probeGit(import.meta.dirname);

        expect(probe.installed).toBe(true);
        expect(probe.insideRepo).toBe(true);
    });

    it('reports a temp directory as outside any repo', async () => {
        const outside = await mkdtemp(join(tmpdir(), 'create-seedcord-git-'));
        const probe = await probeGit(outside);

        expect(probe.installed).toBe(true);
        expect(probe.insideRepo).toBe(false);
    });
});
