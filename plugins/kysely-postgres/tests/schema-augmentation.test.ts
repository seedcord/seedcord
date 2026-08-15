import { describe, it, expectTypeOf } from 'vitest';

import { RegisterKyselyService } from '#src/decorators/RegisterKyselyService';
import { KyselyService } from '#src/KyselyService';

import type { KyselySchema, KyselyTable } from '#src/types/KyselyDatabase';
import type { Kysely } from 'kysely';

interface UserRow {
    id: string;
    username: string;
}

interface ProductRow {
    id: string;
    title: string;
}

declare module '#src/types/KyselyDatabase' {
    interface KyselyDatabase {
        schema: { users: UserRow; products: ProductRow };
    }
}

class Users extends KyselyService<'users'> {}
class AnyTable extends KyselyService {}

declare module '#src/types/KyselyServices' {
    interface KyselyServices {
        users: Users;
        people: Users;
        // typed to the base, so the services-map constraint accepts any table and only a table check errors
        loose: KyselyService;
    }
}

// the decorator's effective table has to match the class's type argument
@RegisterKyselyService('users')
class MatchesByKey extends KyselyService<'users'> {}

@RegisterKyselyService('people', { table: 'users' })
class MatchesByOverride extends KyselyService<'users'> {}

// @ts-expect-error the override sets users while the type argument is products
@RegisterKyselyService('people', { table: 'users' })
class OverrideDisagrees extends KyselyService<'products'> {}

// @ts-expect-error the key resolves to users while the type argument is products
@RegisterKyselyService('users')
class KeyDisagrees extends KyselyService<'products'> {}

// @ts-expect-error the override sets users while the type argument is products
@RegisterKyselyService('loose', { table: 'users' })
class LooseOverrideDisagrees extends KyselyService<'products'> {}

void MatchesByKey;
void MatchesByOverride;
void OverrideDisagrees;
void KeyDisagrees;
void LooseOverrideDisagrees;

describe('schema augmentation', () => {
    it('resolves the declared schema without a type argument on the plugin', () => {
        expectTypeOf<KyselySchema>().toEqualTypeOf<{ users: UserRow; products: ProductRow }>();
    });

    it('narrows the table union to the declared tables', () => {
        expectTypeOf<KyselyTable>().toEqualTypeOf<'users' | 'products'>();
    });

    it('types a service query builder against the declared schema', () => {
        expectTypeOf<Users['db']>().toEqualTypeOf<Kysely<{ users: UserRow; products: ProductRow }>>();
        expectTypeOf<Users>().toHaveProperty('table').toEqualTypeOf<'users'>();
    });

    it('defaults the table to every declared table when the service declares none', () => {
        expectTypeOf<AnyTable>().toHaveProperty('table').toEqualTypeOf<'users' | 'products'>();
    });
});
