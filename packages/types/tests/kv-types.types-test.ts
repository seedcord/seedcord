import { expectTypeOf } from 'vite-plus/test';

import type { Config } from '#src/Interfaces/Config';
import type { KvDriver } from '#src/Interfaces/Kv';

interface SqlDriver extends KvDriver, Disposable {
    query(sql: string): unknown[];
}

// this registration applies to every Config in this package's program
declare module '#src/Interfaces/Kv' {
    interface KvTypes {
        driver: SqlDriver;
    }
}

expectTypeOf<Pick<Config, 'kv'>>().toEqualTypeOf<{ kv: SqlDriver }>();
