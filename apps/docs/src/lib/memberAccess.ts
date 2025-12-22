export const MEMBER_ACCESS_LEVELS = ['public', 'protected'] as const;

export type MemberAccessLevel = (typeof MEMBER_ACCESS_LEVELS)[number];

export function formatMemberAccessLabel(value: MemberAccessLevel): string {
    return value.charAt(0).toUpperCase() + value.slice(1);
}

export const rankOfAccess = (value: MemberAccessLevel): number => MEMBER_ACCESS_LEVELS.indexOf(value);
