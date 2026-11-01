import type { ValidInteractionTypes } from './interactionTypes';
import type { APIUser } from 'discord-api-types/v10';

export function interactionUser(payload: ValidInteractionTypes): APIUser {
    // justified: discord sends member.user in a guild and user in a dm
    return (payload.member?.user ?? payload.user) as APIUser;
}
