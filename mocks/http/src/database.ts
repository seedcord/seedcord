import type { Generated } from 'kysely';

interface RollsTable {
    id: Generated<number>;
    user_id: string;
    sides: number;
    value: number;
}

interface MockDatabase {
    rolls: RollsTable;
}

declare module '@seedcord/plugin-kysely' {
    interface KyselyDatabase {
        schema: MockDatabase;
    }
}
