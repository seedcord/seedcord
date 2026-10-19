import { AUTHOR_URL } from '@seedcord/ui';

export interface Author {
    name: string;
    site?: string;
}

// keyed by GitHub handle
export const AUTHORS = {
    materwelonDhruv: { name: 'Dhruv', site: AUTHOR_URL }
} as const satisfies Record<string, Author>;

export type AuthorHandle = keyof typeof AUTHORS;
