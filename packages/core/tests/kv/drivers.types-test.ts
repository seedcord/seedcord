import Keyv from 'keyv';
import { createStorage } from 'unstorage';
import { expectTypeOf } from 'vitest';

import { KeyvDriver } from '#src/kv/KeyvDriver';
import { UnstorageDriver } from '#src/kv/UnstorageDriver';

import type { Storage } from 'unstorage';

expectTypeOf(new KeyvDriver(new Keyv<string>()).keyv).toEqualTypeOf<Keyv<string>>();
expectTypeOf(new UnstorageDriver(createStorage()).storage).toEqualTypeOf<Storage>();
