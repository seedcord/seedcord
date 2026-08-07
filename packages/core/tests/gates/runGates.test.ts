import { describe, it, expect } from 'vitest';

import { and, or } from '@gates/combinators';
import { defineEffectGate, defineGate } from '@gates/Gate';
import { runGates, runHandlerGates } from '@gates/runGates';
import { GatedMetadataKey, InteractionRouteKeys, InteractionRoutes } from '@src/metadataKeys';
import { Notice } from '@stops/Notice';

import { TestNotice } from '../utils/TestNotice';

import type { GateContextBase } from '@gates/Gate';

// gates ignore ctx here, so a minimal cast stands in
const ctx = {} as unknown as GateContextBase;

describe('runGates', () => {
    it('runs each gate in order and resolves when all pass', async () => {
        const order: string[] = [];
        const A = defineGate('a', () => {
            order.push('a');
        });
        const B = defineGate('b', () => {
            order.push('b');
        });

        await runGates([A, B], ctx);

        expect(order).toEqual(['a', 'b']);
    });

    it('propagates the first gate refusal and stops', async () => {
        const order: string[] = [];
        const A = defineGate('a', () => {
            order.push('a');
            throw new TestNotice('no');
        });
        const B = defineGate('b', () => {
            order.push('b');
        });

        await expect(runGates([A, B], ctx)).rejects.toBeInstanceOf(Notice);
        expect(order).toEqual(['a']);
    });
});

describe('effect gates', () => {
    it('runs an effect gate commit after every gate in the set passes', async () => {
        const order: string[] = [];
        const charge = defineEffectGate(
            'charge',
            () => {
                order.push('check');
            },
            () => {
                order.push('commit');
            }
        );
        const plain = defineGate('plain', () => {
            order.push('plain');
        });

        await runGates([charge, plain], ctx);

        expect(order).toEqual(['check', 'plain', 'commit']);
    });

    it('skips a queued commit when a later gate refuses', async () => {
        const committed: string[] = [];
        const charge = defineEffectGate(
            'charge',
            () => {},
            () => {
                committed.push('charge');
            }
        );
        const refuse = defineGate('refuse', () => {
            throw new TestNotice('no');
        });

        await expect(runGates([charge, refuse], ctx)).rejects.toBeInstanceOf(Notice);

        expect(committed).toEqual([]);
    });

    it('commits an effect gate nested in an and once the set passes', async () => {
        const committed: string[] = [];
        const charge = defineEffectGate(
            'charge',
            () => {},
            () => {
                committed.push('charge');
            }
        );
        const plain = defineGate('plain', () => {});

        await runGates([and(charge, plain)], ctx);

        expect(committed).toEqual(['charge']);
    });

    it('commits only the winning arm of an or', async () => {
        const committed: string[] = [];
        const chargeA = defineEffectGate(
            'chargeA',
            () => {
                throw new TestNotice('a refuses');
            },
            () => {
                committed.push('a');
            }
        );
        const chargeB = defineEffectGate(
            'chargeB',
            () => {},
            () => {
                committed.push('b');
            }
        );

        await runGates([or(chargeA, chargeB)], ctx);

        // a refused so only b's commit is queued
        expect(committed).toEqual(['b']);
    });

    it('cancels a combinator effect when a later sibling refuses', async () => {
        const committed: string[] = [];
        const charge = defineEffectGate(
            'charge',
            () => {},
            () => {
                committed.push('charge');
            }
        );
        const plain = defineGate('plain', () => {});
        const refuse = defineGate('refuse', () => {
            throw new TestNotice('no');
        });

        await expect(runGates([and(charge, plain), refuse], ctx)).rejects.toBeInstanceOf(Notice);

        // the and passed and queued charge, but the sibling refuse stopped the set first
        expect(committed).toEqual([]);
    });

    it('rolls back the effect of a refused or arm, so a later arm winning does not commit it', async () => {
        const committed: string[] = [];
        const charge = defineEffectGate(
            'charge',
            () => {},
            () => {
                committed.push('charge');
            }
        );
        const refuse = defineGate('refuse', () => {
            throw new TestNotice('no');
        });
        const pass = defineGate('pass', () => {});

        await runGates([or(and(charge, refuse), pass)], ctx);

        // the first arm queued charge then refused, the or moved to pass, so charge must not commit
        expect(committed).toEqual([]);
    });
});

describe('gate observer', () => {
    it('reports the name and elapsed ms of each gate', async () => {
        const seen: { name: string; ms: number }[] = [];
        const A = defineGate('a', () => {});
        const B = defineGate('b', () => {});

        await runGates([A, B], ctx, (name, ms) => {
            seen.push({ name, ms });
        });

        expect(seen.map((s) => s.name)).toEqual(['a', 'b']);
        for (const s of seen) expect(s.ms).toBeGreaterThanOrEqual(0);
    });

    it('reports a gate that throws before the refusal propagates', async () => {
        const seen: string[] = [];
        const refuse = defineGate('refuse', () => {
            throw new TestNotice('no');
        });

        await expect(
            runGates([refuse], ctx, (name) => {
                seen.push(name);
            })
        ).rejects.toBeInstanceOf(Notice);

        expect(seen).toEqual(['refuse']);
    });

    it('times a combinator as one unit under its joined name', async () => {
        const seen: string[] = [];
        const A = defineGate('a', () => {});
        const B = defineGate('b', () => {});

        await runGates([and(A, B)], ctx, (name) => {
            seen.push(name);
        });

        expect(seen).toEqual(['a & b']);
    });

    it('threads the observer through runHandlerGates', async () => {
        const seen: string[] = [];
        const probe = defineGate('probe', () => {});
        const handler = {};
        Reflect.defineMetadata(GatedMetadataKey, [probe], handler);

        await runHandlerGates(handler, ctx, undefined, (name) => {
            seen.push(name);
        });

        expect(seen).toEqual(['probe']);
    });
});

describe('runHandlerGates', () => {
    it('threads the handler route id onto the context as kind:route', async () => {
        let seen: string | null | undefined;
        const probe = defineGate('probe', (c: GateContextBase) => {
            seen = c.routeId;
        });
        // runHandlerGates only reads metadata off the ctor, so a plain object stands in for the handler class
        const dailyHandler = {};
        Reflect.defineMetadata(InteractionRouteKeys[InteractionRoutes.Slash], ['daily'], dailyHandler);
        Reflect.defineMetadata(GatedMetadataKey, [probe], dailyHandler);

        await runHandlerGates(dailyHandler, ctx);

        expect(seen).toBe('slash:daily');
    });

    it('prefers an explicit route id over the ctor metadata', async () => {
        let seen: string | null | undefined;
        const probe = defineGate('probe', (c: GateContextBase) => {
            seen = c.routeId;
        });
        const dailyHandler = {};
        Reflect.defineMetadata(InteractionRouteKeys[InteractionRoutes.Slash], ['daily'], dailyHandler);
        Reflect.defineMetadata(GatedMetadataKey, [probe], dailyHandler);

        await runHandlerGates(dailyHandler, ctx, 'slash:manifest');

        expect(seen).toBe('slash:manifest');
    });

    it('leaves routeId null for a handler with no route metadata', async () => {
        let seen: string | null | undefined = 'unset';
        const probe = defineGate('probe', (c: GateContextBase) => {
            seen = c.routeId;
        });
        const plain = {};
        Reflect.defineMetadata(GatedMetadataKey, [probe], plain);

        await runHandlerGates(plain, ctx);

        expect(seen).toBeNull();
    });
});
