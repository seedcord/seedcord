import { skillsIndex } from '@seedcord/ui/skills';
import { SEEDCORD_SKILL } from '@seedcord/ui/skills/seedcord';

export const dynamic = 'force-static';

export function GET(): Response {
    return Response.json(skillsIndex([SEEDCORD_SKILL]));
}
