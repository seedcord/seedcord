import Keyv from 'keyv';
import { createStorage } from 'unstorage';
import { expectTypeOf } from 'vitest';

import { KeyvDriver } from '#src/kv/KeyvDriver';
import { Kv } from '#src/kv/Kv';
import { UnstorageDriver } from '#src/kv/UnstorageDriver';

import type { Storage } from 'unstorage';

const keyv = new Kv(new KeyvDriver(new Keyv<string>()));
expectTypeOf(keyv.driver.keyv).toEqualTypeOf<Keyv<string>>();
expectTypeOf(keyv.scope('app').driver.keyv).toEqualTypeOf<Keyv<string>>();

const unstorage = new Kv(new UnstorageDriver(createStorage()));
expectTypeOf(unstorage.driver.storage).toEqualTypeOf<Storage>();
expectTypeOf(unstorage.scope('app').driver.storage).toEqualTypeOf<Storage>();
