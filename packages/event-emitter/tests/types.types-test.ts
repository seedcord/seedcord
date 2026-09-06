import { expectTypeOf } from 'vitest';

import { TypedEventEmitter } from '#src/TypedEventEmitter';

interface Events {
    ping: [n: number];
    pong: [];
}

const ee = new TypedEventEmitter<Events>();

ee.on('ping', (n) => expectTypeOf(n).toEqualTypeOf<number>());
expectTypeOf(ee.waitFor('ping')).resolves.toEqualTypeOf<[n: number]>();

ee.emit('ping', 1);
ee.emit('pong');

// @ts-expect-error unknown event
ee.emit('nope');
// @ts-expect-error wrong payload type
ee.emit('ping', 'x');
// @ts-expect-error missing payload
ee.emit('ping');
// @ts-expect-error extra payload
ee.emit('pong', 1);
