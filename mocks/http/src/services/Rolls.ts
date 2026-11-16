import { KyselyService, RegisterKyselyService } from '@seedcord/plugin-kysely';

@RegisterKyselyService('rolls')
export class Rolls extends KyselyService<'rolls'> {
    public async record(userId: string, sides: number, value: number): Promise<void> {
        await this.db.insertInto(this.table).values({ user_id: userId, sides, value }).execute();
    }

    public async countFor(userId: string): Promise<number> {
        const { count } = await this.db
            .selectFrom(this.table)
            .select((eb) => eb.fn.countAll<number>().as('count'))
            .where('user_id', '=', userId)
            .executeTakeFirstOrThrow();
        return count;
    }
}
