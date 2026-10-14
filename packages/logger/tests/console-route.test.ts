import { stripAnsi } from '@seedcord/utils';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { consoleRecord, routeConsole, traceError } from '#src/consoleRoute';
import { formatBody } from '#src/node';

import type { ConsoleMethod } from '#src/consoleRoute';

// no-console flags the calls these tests make on purpose
const terminal = console;

describe('routeConsole', () => {
    let restore: (() => void) | undefined;

    afterEach(() => {
        restore?.();
        restore = undefined;
    });

    it('starts a Trace error at the console.trace call', () => {
        const traces: Error[] = [];
        restore = routeConsole(['trace'], (_method, _args, invoked) => traces.push(traceError('here', invoked)));

        terminal.trace('here');

        const [, frame] = stripAnsi(formatBody(consoleRecord('error', '', traces))).split('\n');
        expect(frame).toContain('console-route.test.ts');
    });

    it('sends each listed method to the route with its args', () => {
        const calls: [ConsoleMethod, unknown[]][] = [];
        restore = routeConsole(['log', 'warn'], (method, args) => calls.push([method, args]));

        terminal.log('a', 1);
        terminal.warn({ b: 2 });

        expect(calls).toEqual([
            ['log', ['a', 1]],
            ['warn', [{ b: 2 }]]
        ]);
    });

    it('leaves a method off the list alone', () => {
        const route = vi.fn();
        const info = vi.spyOn(terminal, 'info').mockImplementation(() => undefined);
        restore = routeConsole(['log'], route);

        terminal.info('untouched');

        expect(route).not.toHaveBeenCalled();
        expect(info).toHaveBeenCalledWith('untouched');
        info.mockRestore();
    });

    it('sends a console call made inside the route to the original method', () => {
        const original = vi.spyOn(terminal, 'log').mockImplementation(() => undefined);
        const route = vi.fn(() => terminal.log('from inside'));
        restore = routeConsole(['log'], route);

        terminal.log('outside');

        expect(route).toHaveBeenCalledOnce();
        expect(original).toHaveBeenCalledWith('from inside');
        restore();
        restore = undefined;
        original.mockRestore();
    });

    it('puts the original methods back', () => {
        const before = Object.getOwnPropertyDescriptors(terminal);
        const undo = routeConsole(['log', 'warn'], () => undefined);

        undo();

        expect(Object.getOwnPropertyDescriptors(terminal)).toEqual(before);
    });
});
