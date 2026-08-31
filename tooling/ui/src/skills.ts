export interface Skill {
    /** 1 to 64 chars, lowercase alphanumeric and hyphens, per the Agent Skills naming spec. */
    name: string;
    /** What the skill does and when to use it. The spec caps this at 1024 characters. */
    description: string;
    /** The SKILL.md body, frontmatter included. */
    body: string;
}

// cloudflare's discovery rfc renamed the well-known path at v0.2.0
export const AGENT_SKILLS_BASE = '/.well-known/agent-skills';

const SCHEMA = 'https://schemas.agentskills.io/discovery/0.2.0/schema.json';
const FILE = 'SKILL.md';
const MARKDOWN = 'text/markdown; charset=utf-8';
const HEX = 16;
const BYTE_WIDTH = 2;

export function skillUrl(skill: Skill): string {
    return `${AGENT_SKILLS_BASE}/${skill.name}/${FILE}`;
}

// the rfc requires a client to verify what it downloads against this
export async function skillDigest(body: string): Promise<string> {
    const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(body));
    const hex = Array.from(new Uint8Array(hash), (byte) => byte.toString(HEX).padStart(BYTE_WIDTH, '0')).join('');
    return `sha256:${hex}`;
}

/** The v0.2.0 index. Every entry carries a type and a digest. */
export async function agentSkillsIndex(skills: readonly Skill[]): Promise<unknown> {
    const entries = await Promise.all(
        skills.map(async (skill) => ({
            name: skill.name,
            type: 'skill-md',
            description: skill.description,
            url: skillUrl(skill),
            digest: await skillDigest(skill.body)
        }))
    );

    return { $schema: SCHEMA, skills: entries };
}

/** The v0.1.0 index. A client resolves each filename against the skill's own directory. */
export function skillsIndex(skills: readonly Skill[]): unknown {
    return {
        skills: skills.map((skill) => ({ name: skill.name, description: skill.description, files: [FILE] }))
    };
}

export function skillResponse(skill: Skill): Response {
    return new Response(skill.body, { headers: { 'content-type': MARKDOWN } });
}
