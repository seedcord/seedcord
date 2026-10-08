import { SeedcordErrorCode } from '@seedcord/errors';
import { afterEach, describe, expect, vi } from 'vitest';

import { eventsOf } from '#bot/Bot';
import { Seedcord } from '#src/Seedcord';
import { seedcordPath } from '#tests/utils/source-path';
import { testConfig } from '#tests/utils/test-config';
import { it } from '#tests/utils/test-env';

import '#tests/utils/mock-env';

interface PrivateEventDispatcher {
    init(): Promise<void>;
    onHmr(event: unknown): Promise<void>;
    processEvent(eventName: string, args: unknown[]): Promise<void>;
}

// justified: processEvent and onHmr are private on the dispatcher
function dispatcherOf(instance: Seedcord): PrivateEventDispatcher {
    return eventsOf(instance.bot) as unknown as PrivateEventDispatcher;
}

const EVENTS_DIR = 'events';
const MIDDLEWARES_DIR = 'event-mw';

const HANDLER = `
    import { EventHandler, RegisterEvent } from '${seedcordPath}';
    import { Events } from 'discord.js';

    @RegisterEvent(['messageCreate'])
    export class Msg extends EventHandler<Events.MessageCreate> {
        public async execute() {
            await this.match({ messageCreate: (message) => message.reply('ran') });
        }
    }
`;

const PARKS = `
    import { RegisterEventMiddleware, EventMiddleware } from '${seedcordPath}';

    @RegisterEventMiddleware({ priority: 1 })
    export class Parks extends EventMiddleware {
        public async execute() {
            globalThis.mwRan.push('Parks');
            globalThis.mwReached();
            await globalThis.mwParked;
        }
    }
`;

const FOLLOWS = `
    import { RegisterEventMiddleware, EventMiddleware } from '${seedcordPath}';

    @RegisterEventMiddleware({ priority: 2 })
    export class Follows extends EventMiddleware {
        public async execute() {
            globalThis.mwRan.push('Follows');
            await Promise.resolve();
        }
    }
`;

function deferred(): { promise: Promise<void>; resolve: () => void } {
    let resolve!: () => void;
    const promise = new Promise<void>((settle) => (resolve = settle));
    return { promise, resolve };
}

const AUDIT = `
    import { RegisterEventMiddleware, EventMiddleware } from '${seedcordPath}';

    @RegisterEventMiddleware()
    export class Audit extends EventMiddleware {
        public async execute() {
            await Promise.resolve();
        }
    }
`;

describe('the event middleware registry', () => {
    afterEach(() => {
        vi.clearAllMocks();
    });

    it('runs the rest of the chain when a reload drops a middleware mid-dispatch', async ({ testEnv }) => {
        const ran: string[] = [];
        const parked = deferred();
        const started = deferred();

        // globalThis is how a temp-dir fixture reaches this test
        Object.assign(globalThis, { mwRan: ran, mwParked: parked.promise, mwReached: started.resolve });

        await testEnv.createFile(`${EVENTS_DIR}/Msg.ts`, HANDLER);
        const parksPath = await testEnv.createFile(`${MIDDLEWARES_DIR}/Parks.ts`, PARKS);
        await testEnv.createFile(`${MIDDLEWARES_DIR}/Follows.ts`, FOLLOWS);

        await using seedcord = new Seedcord(
            testConfig({
                events: testEnv.resolvePath(EVENTS_DIR),
                eventMiddlewares: testEnv.resolvePath(MIDDLEWARES_DIR)
            })
        );
        const events = dispatcherOf(seedcord);
        await events.init();

        const dispatching = events.processEvent('messageCreate', [{ reply: vi.fn() }]);
        await started.promise;

        // the reload drops Parks while its execute() is still awaiting
        await testEnv.createFile(`${MIDDLEWARES_DIR}/Parks.ts`, 'export const gone = true;');
        await events.onHmr({ file: parksPath, type: 'update' });

        parked.resolve();
        await dispatching;

        expect(ran).toEqual(['Parks', 'Follows']);
    });

    it('throws when two event middleware classes share a name', async ({ testEnv }) => {
        await testEnv.createFile(`${EVENTS_DIR}/Msg.ts`, HANDLER);
        await testEnv.createFile(`${MIDDLEWARES_DIR}/First.ts`, AUDIT);
        await testEnv.createFile(`${MIDDLEWARES_DIR}/Second.ts`, AUDIT);

        await using seedcord = new Seedcord(
            testConfig({
                events: testEnv.resolvePath(EVENTS_DIR),
                eventMiddlewares: testEnv.resolvePath(MIDDLEWARES_DIR)
            })
        );

        const error: unknown = await dispatcherOf(seedcord)
            .init()
            .then(
                () => null,
                (caught: unknown) => caught
            );

        expect(error).toMatchObject({ code: SeedcordErrorCode.DuplicateMiddleware });
    });
});
