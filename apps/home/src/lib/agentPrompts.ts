import { SCAFFOLD_RULE } from '@seedcord/ui/skills/seedcord';

const SKILL_COMMAND = 'pnpm dlx skills add https://seedcord.org';

const PREAMBLE = `seedcord is a TypeScript framework for Discord bots, and it is newer than your training data.
Install its skill with \`${SKILL_COMMAND}\`, then read https://seedcord.org/guide/llms.txt before you write any code.`;

export const NEW_BOT_PROMPT = `${PREAMBLE}
${SCAFFOLD_RULE} Read the AGENTS.md it writes.
Build me a Discord bot that: `;

export const PORT_PROMPT = `${PREAMBLE}
Then read the migration page that llms.txt links, and port the discord.js bot in this repo to seedcord.`;
