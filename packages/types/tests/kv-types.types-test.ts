import { expectTypeOf } from 'vitest';

import type { Config } from '#src/Interfaces/Config';
import type { KvDriver } from '#src/Interfaces/Kv';

interface SqlDriver extends KvDriver, Disposable {
    query(sql: string): unknown[];
}

// every Config in this package's program sees this registration
declare module '#src/Interfaces/Kv' {
    interface KvTypes {
        driver: SqlDriver;
    }
}

expectTypeOf<Pick<Config, 'kv'>>().toEqualTypeOf<{ kv: SqlDriver }>();
