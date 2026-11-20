import { skillUrl } from '@seedcord/ui/skills';
import { SEEDCORD_SKILL } from '@seedcord/ui/skills/seedcord';

import { canonicalUrl } from '#lib/site';

const SKILL_COMMAND = 'pnpm dlx skills add https://seedcord.org';

const PREAMBLE = `seedcord is a TypeScript framework for Discord bots, and it is newer than your training data.
Install its skill with \`${SKILL_COMMAND}\`, or read ${canonicalUrl(skillUrl(SEEDCORD_SKILL))}, and follow it.`;

export const NEW_BOT_PROMPT = `${PREAMBLE}
Build me a Discord bot that: `;

export const PORT_PROMPT = `${PREAMBLE}
Port the discord.js bot in this repo to seedcord.`;
