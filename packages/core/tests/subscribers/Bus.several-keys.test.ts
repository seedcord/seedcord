import { SeedcordErrorCode } from '@seedcord/errors';
import { describe, expect, expectTypeOf, it, vi } from 'vitest';

import { Subscribe } from '#subscribers/decorators/Subscribe';
import { PublishDefault } from '#subscribers/publishDefault';
import { RegisteredCount, UnregisterSubscriber } from '#subscribers/slots';
import { Subscriber } from '#subscribers/Subscriber';
import { busWith } from '#tests/utils/busWith';

import type { CoreBase } from '#interfaces/CoreBase';
import type { AllSubscriptions } from '#subscribers/types/Subscriptions';

const unknown: AllSubscriptions['unknownException'] = {
    uuid: crypto.randomUUID(),
    dispatchId: 'd-1',
    error: new Error('unknown boom'),
    origin: 'slash:probe'
};
const unhandled: AllSubscriptions['unhandledInteractionError'] = { error: new Error('unhandled boom') };

describe('a subscriber on several keys', () => {
    it("runs the case for the published key, with that key's payload", async () => {
        const seen: string[] = [];

        @Subscribe(['unknownException'], ['unhandledInteractionError'])
        class Both extends Subscriber<'unknownException' | 'unhandledInteractionError', CoreBase> {
            async execute(): Promise<void> {
                const result = await this.match({
                    unknownException: (data) => seen.push(`unknown ${data.origin}`),
                    unhandledInteractionError: (data) => {
                        seen.push(`unhandled ${data.error.message}`);
                        return Promise.resolve('done');
                    }
                });
                expectTypeOf(result).toEqualTypeOf<number | string>();

                await this.match<string>({
                    unknownException: () => 'unknown',
                    // @ts-expect-error this case returns a number.
                    unhandledInteractionError: () => 1
                });
            }
        }

        const bus = busWith(Both);
        bus[PublishDefault]('unknownException', unknown);
        bus[PublishDefault]('unhandledInteractionError', unhandled);
        await vi.waitFor(() => expect(seen).toEqual(['unknown slash:probe', 'unhandled unhandled boom']));
    });

    it('spends a once key without spending an on key of the same class', async () => {
        const runs: string[] = [];

        @Subscribe(['unknownException', { frequency: 'once' }], ['unhandledInteractionError'])
        class Mixed extends Subscriber<'unknownException' | 'unhandledInteractionError', CoreBase> {
            async execute(): Promise<void> {
                await this.match({
                    unknownException: () => runs.push('once'),
                    unhandledInteractionError: () => runs.push('on')
                });
            }
        }

        const bus = busWith(Mixed);
        for (let round = 0; round < 2; round++) {
            bus[PublishDefault]('unknownException', unknown);
            bus[PublishDefault]('unhandledInteractionError', unhandled);
        }
        await vi.waitFor(() => expect(runs).toEqual(['once', 'on', 'on']));
    });

    it('counts a class on several keys once and unregisters it from every key', async () => {
        const ran: string[] = [];

        @Subscribe(['unknownException'], ['unhandledInteractionError'])
        class Both extends Subscriber<'unknownException' | 'unhandledInteractionError', CoreBase> {
            async execute(): Promise<void> {
                await Promise.resolve();
                ran.push('both');
            }
        }

        @Subscribe(['unknownException'])
        class Witness extends Subscriber<'unknownException', CoreBase> {
            async execute(): Promise<void> {
                await Promise.resolve();
                ran.push('witness');
            }
        }

        const bus = busWith(Both, Witness);
        expect(bus[RegisteredCount]).toBe(2);

        bus[UnregisterSubscriber](Both, ['unknownException', 'unhandledInteractionError']);
        bus[PublishDefault]('unhandledInteractionError', unhandled);
        bus[PublishDefault]('unknownException', unknown);

        await vi.waitFor(() => expect(ran).toEqual(['witness']));
    });

    it('throws DecoratorDuplicateKey for a key listed twice', () => {
        expect(() => {
            @Subscribe(['unknownException'], ['unknownException', { frequency: 'once' }])
            class Twice extends Subscriber<'unknownException', CoreBase> {
                async execute(): Promise<void> {}
            }
            void Twice;
        }).toThrow(expect.objectContaining({ code: SeedcordErrorCode.DecoratorDuplicateKey }));
    });

    it('throws MatchCaseMissing for a published key without a case', async () => {
        @Subscribe(['unknownException'], ['unhandledInteractionError'])
        class Partial extends Subscriber<'unknownException' | 'unhandledInteractionError', CoreBase> {
            async execute(): Promise<void> {
                const cases = { unknownException: () => undefined, unhandledInteractionError: () => undefined };
                Reflect.deleteProperty(cases, 'unhandledInteractionError');
                await this.match(cases);
            }
        }

        // justified: match reads only the key and the payload
        const subscriber = new Partial(unhandled, {} as unknown as CoreBase, 'unhandledInteractionError');

        await expect(subscriber.execute()).rejects.toMatchObject({ code: SeedcordErrorCode.MatchCaseMissing });
    });
});

// compile-only. the decorator and the generic have to list the same keys.
function typeChecks(): void {
    // @ts-expect-error the decorator leaves out a key the generic declares
    @Subscribe(['unknownException'])
    class MissingKey extends Subscriber<'unknownException' | 'unhandledInteractionError', CoreBase> {
        async execute(): Promise<void> {}
    }

    // @ts-expect-error the decorator lists a key the generic doesn't declare
    @Subscribe(['unknownException'], ['unhandledInteractionError'])
    class ExtraKey extends Subscriber<'unknownException', CoreBase> {
        async execute(): Promise<void> {}
    }

    @Subscribe(['unknownException'])
    class Single extends Subscriber<'unknownException', CoreBase> {
        execute(): Promise<void> {
            expectTypeOf(this.data).toEqualTypeOf<AllSubscriptions['unknownException']>();
            return Promise.resolve();
        }
    }

    @Subscribe(['unknownException'], ['unhandledInteractionError'])
    class Several extends Subscriber<'unknownException' | 'unhandledInteractionError', CoreBase> {
        execute(): Promise<void> {
            expectTypeOf(this.data).toBeNever();
            return Promise.resolve();
        }
    }

    void [MissingKey, ExtraKey, Single, Several];
}

void typeChecks;
