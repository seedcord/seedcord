import { allGuideSections } from '#lib/sections.ts';

export const dynamic = 'force-static';

export function GET(): Response {
    return Response.json(allGuideSections());
}
