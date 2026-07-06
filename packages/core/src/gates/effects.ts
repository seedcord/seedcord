import type { EffectGate, Gate, GateContextBase } from './Gate';

type CommitFn = () => Promise<void>;

// per-request commit queue keyed on the context, so an effect gate's commit runs only after the whole
// set passes. WeakMap so each entry is dropped once its request's context is gone
const commitQueues = new WeakMap<GateContextBase, CommitFn[]>();

function isEffectGate(gate: Gate<GateContextBase>): gate is EffectGate<GateContextBase> {
    return typeof (gate as Partial<EffectGate<GateContextBase>>).commit === 'function';
}

// a refusal throws before the queue, so a refused effect gate never commits. the combinators and the
// runner both route through here, so an effect gate inside `and`/`or` queues the same way
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

// the runner calls this after every run, so a refused or drained run leaves no stale queue behind
export function discardCommits(ctx: GateContextBase): void {
    commitQueues.delete(ctx);
}

// the queued-commit count, the mark an `or` arm rolls back to if it refuses
export function markCommits(ctx: GateContextBase): number {
    return commitQueues.get(ctx)?.length ?? 0;
}

// drops commits queued after `mark`, so a refused `or` arm leaves no commit behind
export function rollbackCommits(ctx: GateContextBase, mark: number): void {
    const queue = commitQueues.get(ctx);
    if (queue && queue.length > mark) queue.length = mark;
}
