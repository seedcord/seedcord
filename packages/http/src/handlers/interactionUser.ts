import type { ValidInteractionTypes } from './interactionTypes';
import type { APIUser } from 'discord-api-types/v10';

export function interactionUser(payload: ValidInteractionTypes): APIUser {
    // justified: discord sends member.user or user on every interaction
    return (payload.member?.user ?? payload.user) as APIUser;
}
