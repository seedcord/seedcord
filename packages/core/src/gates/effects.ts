import type { EffectGate, Gate, GateContextBase } from './Gate';

type CommitFn = () => Promise<void>;

// commits wait here until the whole gate set passes, one queue per request. the key is the context
// itself and the map is weak, so an entry goes when its request does
const commitQueues = new WeakMap<GateContextBase, CommitFn[]>();

function isEffectGate(gate: Gate<GateContextBase>): gate is EffectGate<GateContextBase> {
    return typeof (gate as Partial<EffectGate<GateContextBase>>).commit === 'function';
}

// a refused effect gate never commits. combinators call this too
export async function runCheck(gate: Gate<GateContextBase>, ctx: GateContextBase): Promise<void> {
    await gate.check(ctx);
    if (!isEffectGate(gate)) return;

    let queue = commitQueues.get(ctx);
    if (!queue) {
        queue = [];
        commitQueues.set(ctx, queue);
    }
    queue.push(() => gate.commit(ctx));
}

export async function runCommits(ctx: GateContextBase): Promise<void> {
    const queue = commitQueues.get(ctx);
    if (!queue) return;
    for (const commit of queue) await commit();
}

// the runner calls this from a finally, refused run or not
export function discardCommits(ctx: GateContextBase): void {
    commitQueues.delete(ctx);
}

// an `or` arm takes this mark before it runs
export function markCommits(ctx: GateContextBase): number {
    return commitQueues.get(ctx)?.length ?? 0;
}

// and rolls back to it when the arm refuses, leaving no commit behind
export function rollbackCommits(ctx: GateContextBase, mark: number): void {
    const queue = commitQueues.get(ctx);
    if (queue && queue.length > mark) queue.length = mark;
}
