// compile-only. tc fails on any unused @ts-expect-error below.
import { expectTypeOf } from 'vitest';

import { Plugin } from '#src/plugin/Plugin';

import type { CoreBase } from '#interfaces/CoreBase';
import type { Pluggable } from '#node/Pluggable';

class Box<TValue extends string> extends Plugin {
    public value?: TValue;

    constructor(host: CoreBase, _size?: number) {
        super(host);
    }

    public init(): Promise<void> {
        return Promise.resolve();
    }
}

class Cache<TValue> extends Plugin {
    public value?: TValue;

    public init(): Promise<void> {
        return Promise.resolve();
    }
}

class Defaulted<TValue extends string = 'x'> extends Plugin {
    public value?: TValue;

    public init(): Promise<void> {
        return Promise.resolve();
    }
}

class HttpBox<TValue extends string> extends Plugin<{ transport: 'http' }> {
    public value?: TValue;

    public init(): Promise<void> {
        return Promise.resolve();
    }
}

class ServerBox<TValue extends string> extends Plugin<{ runtime: 'server' }> {
    public value?: TValue;

    public init(): Promise<void> {
        return Promise.resolve();
    }
}

class EdgeBox<TValue extends string> extends Plugin<{ runtime: 'edge' }> {
    public value?: TValue;

    public init(): Promise<void> {
        return Promise.resolve();
    }
}

interface NarrowCore extends CoreBase {
    extra: true;
}

class NarrowBox<TValue extends string> extends Plugin {
    public value?: TValue;

    constructor(host: NarrowCore) {
        super(host);
    }

    public init(): Promise<void> {
        return Promise.resolve();
    }
}

declare const gateway: Pluggable<'gateway', 'server'>;
declare const http: Pluggable<'http', 'server'>;
declare const edge: Pluggable<'http', 'edge'>;

function acceptsGenerics(): void {
    expectTypeOf(gateway.attach('box', Box)).toHaveProperty('box').toEqualTypeOf<Box<string>>();
    expectTypeOf(gateway.attach('box', Box, 3))
        .toHaveProperty('box')
        .toEqualTypeOf<Box<string>>();
    expectTypeOf(gateway.attach('box', Box<'a'>))
        .toHaveProperty('box')
        .toEqualTypeOf<Box<'a'>>();
    expectTypeOf(gateway.attach('cache', Cache)).toHaveProperty('cache').toEqualTypeOf<Cache<unknown>>();
    // typescript fills a type parameter from its constraint here and skips the default
    expectTypeOf(gateway.attach('box', Defaulted)).toHaveProperty('box').toEqualTypeOf<Defaulted<string>>();
    expectTypeOf(http.attach('box', HttpBox)).toHaveProperty('box').toEqualTypeOf<HttpBox<string>>();
    expectTypeOf(gateway.attach('box', ServerBox)).toHaveProperty('box').toEqualTypeOf<ServerBox<string>>();
    expectTypeOf(gateway.attach('stores.box', Box).stores).toHaveProperty('box').toEqualTypeOf<Box<string>>();
}

function rejectsMismatches(): void {
    // @ts-expect-error the size parameter takes a number
    gateway.attach('box', Box, 'big');
    // @ts-expect-error HttpBox declares transport 'http'
    gateway.attach('box', HttpBox);
    // @ts-expect-error an edge bot takes no plugins yet
    edge.attach('box', Box);
    // @ts-expect-error EdgeBox declares runtime 'edge' but this bot runs 'server'
    gateway.attach('box', EdgeBox);
    // @ts-expect-error NarrowBox narrows its first parameter
    gateway.attach('box', NarrowBox);
}

void acceptsGenerics;
void rejectsMismatches;
