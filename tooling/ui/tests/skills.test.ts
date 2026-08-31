import { describe, expect, it } from 'vitest';

import { agentSkillsIndex, skillDigest, skillResponse, skillsIndex, skillUrl } from '../src/skills';
import { SEEDCORD_SKILL } from '../src/skills/seedcord';

import type { Skill } from '../src/skills';

const SHA256_HEX = /^sha256:[0-9a-f]{64}$/;

interface AgentIndex {
    $schema: string;
    skills: { name: string; type: string; description: string; url: string; digest: string }[];
}

describe('the v0.2.0 index', () => {
    it('names the schema a client matches against', async () => {
        const index = (await agentSkillsIndex([SEEDCORD_SKILL])) as AgentIndex;

        expect(index.$schema).toBe('https://schemas.agentskills.io/discovery/0.2.0/schema.json');
    });

    it('marks a single file skill', async () => {
        const index = (await agentSkillsIndex([SEEDCORD_SKILL])) as AgentIndex;

        expect(index.skills[0]?.type).toBe('skill-md');
    });

    it('points at the artifact under the v0.2.0 path', async () => {
        const index = (await agentSkillsIndex([SEEDCORD_SKILL])) as AgentIndex;

        expect(index.skills[0]?.url).toBe('/.well-known/agent-skills/seedcord/SKILL.md');
    });

    // a client rejects the download when this does not match the bytes it fetched
    it('digests the exact bytes the artifact route sends', async () => {
        const index = (await agentSkillsIndex([SEEDCORD_SKILL])) as AgentIndex;
        const served = await skillResponse(SEEDCORD_SKILL).text();

        expect(index.skills[0]?.digest).toBe(await skillDigest(served));
        expect(index.skills[0]?.digest).toMatch(SHA256_HEX);
    });
});

describe('the v0.1.0 index', () => {
    it('lists the filename a client resolves against the skill directory', () => {
        const index = skillsIndex([SEEDCORD_SKILL]) as { skills: { files: string[] }[] };

        expect(index.skills[0]?.files).toEqual(['SKILL.md']);
    });

    it('carries no schema, which is what marks it v0.1.0', () => {
        expect(skillsIndex([SEEDCORD_SKILL])).not.toHaveProperty('$schema');
    });
});

describe('the seedcord skill', () => {
    it('takes a name the agent skills spec accepts', () => {
        const { name } = SEEDCORD_SKILL;

        expect(name).toMatch(/^[a-z0-9-]+$/);
        expect(name.length).toBeGreaterThan(0);
        expect(name.length).toBeLessThanOrEqual(64);
        expect(name.startsWith('-')).toBe(false);
        expect(name.endsWith('-')).toBe(false);
        expect(name).not.toContain('--');
    });

    it('stays inside the description cap the spec sets', () => {
        expect(SEEDCORD_SKILL.description.length).toBeLessThanOrEqual(1024);
    });

    it('opens on frontmatter naming the same skill', () => {
        expect(SEEDCORD_SKILL.body.startsWith('---\nname: seedcord\n')).toBe(true);
    });

    it('serves as markdown', () => {
        expect(skillResponse(SEEDCORD_SKILL).headers.get('content-type')).toBe('text/markdown; charset=utf-8');
    });
});

describe('where a skill answers', () => {
    const other: Skill = { name: 'probe', description: 'x', body: 'y' };

    it('resolves under the v0.2.0 base', () => {
        expect(skillUrl(other)).toBe('/.well-known/agent-skills/probe/SKILL.md');
    });
});
