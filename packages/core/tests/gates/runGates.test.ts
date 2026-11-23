import { describe, it, expect } from 'vite-plus/test';

import { and, or } from '#gates/combinators';
import { defineEffectGate, defineGate } from '#gates/Gate';
import { runGates, runHandlerGates } from '#gates/runGates';
import { DispatchContext } from '#src/dispatch/DispatchContext';
import { GatedMetadataKey } from '#src/metadataKeys';
import { Notice } from '#stops/Notice';
import { TestNotice } from '#tests/utils/TestNotice';

import type { GateContextBase } from '#gates/Gate';

// gates ignore ctx here, and runHandlerGates reads only dispatch off it
const ctx = { dispatch: new DispatchContext('event', 'probe') } as unknown as GateContextBase;

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

    it('commits only the winning gate of an or', async () => {
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

    it('rolls back the effect of a gate that refused inside an or, so a later gate winning does not commit it', async () => {
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

        // charge must not commit because the first gate queued it then refused, and the or moved to pass
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

        await runHandlerGates(handler, ctx, (name) => {
            seen.push(name);
        });

        expect(seen).toEqual(['probe']);
    });
});
