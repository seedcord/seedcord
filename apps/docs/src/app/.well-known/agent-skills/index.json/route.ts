import { agentSkillsIndex } from '@seedcord/ui/skills';
import { SEEDCORD_SKILL } from '@seedcord/ui/skills/seedcord';

export const dynamic = 'force-static';

export async function GET(): Promise<Response> {
    return Response.json(await agentSkillsIndex([SEEDCORD_SKILL]));
}
