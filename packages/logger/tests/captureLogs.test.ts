import { beforeEach, describe, expect, it } from 'vite-plus/test';

import { captureLogs } from '#src/captureLogs';
import { Logger } from '#src/Logger';
import { LoggerChannelRegistry } from '#src/LoggerChannelRegistry';

beforeEach(() => LoggerChannelRegistry.instance.reset());

describe('captureLogs', () => {
    it('captures every level, trace included, by level', () => {
        using logs = captureLogs();
        const logger = new Logger('Bot');

        const cause = new Error('db down');

        logger.trace('took 3ms');
        logger.warn('slow gate', cause);

        expect(logs.at('trace')).toEqual(['took 3ms']);
        expect(logs.at('warn')).toEqual(['slow gate']);
        expect(logs.argsAt('warn')).toEqual([cause]);
        expect(logs.records.map((record) => record.label)).toEqual(['Bot', 'Bot']);
    });

    it('stops recording and puts the default floor back once disposed', () => {
        const outer = captureLogs();
        {
            using inner = captureLogs();
            new Logger('Bot').trace('during');
            expect(inner.at('trace')).toEqual(['during']);
        }

        new Logger('Bot').trace('after');

        expect(outer.at('trace')).toEqual(['during']);
        outer[Symbol.dispose]();
    });
});
