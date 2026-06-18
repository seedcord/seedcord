import type { EffectGate, Gate, GateContextBase } from './Gate';

type CommitFn = () => Promise<void>;

// a per-request queue keyed on the context object, so a passing effect gate's commit waits here until the
// whole set passes instead of firing at check time. the context is rebuilt per request, so the WeakMap
// drops each entry once that request is gone
const commitQueues = new WeakMap<GateContextBase, CommitFn[]>();

function isEffectGate(gate: Gate<GateContextBase>): gate is EffectGate<GateContextBase> {
    return (
        typeof (gate as Partial<EffectGate<GateContextBase>>).check === 'function' &&
        typeof (gate as Partial<EffectGate<GateContextBase>>).commit === 'function'
    );
}

/**
 * Runs a gate's check and, when it passes and carries an effect, queues its commit against the context. A
 * refusal throws here before the queue, so a refused effect gate never commits. The combinators and the
 * runner both go through this, so an effect gate inside `and`/`or` queues the same way a top-level one does.
 */
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

/** Drains the queued commits once the whole set has passed. */
export async function runCommits(ctx: GateContextBase): Promise<void> {
    const queue = commitQueues.get(ctx);
    if (!queue) return;
    for (const commit of queue) await commit();
}

/** Drops a context's queue. The runner calls this after every run, so a refused or drained run leaves no stale queue behind. */
export function discardCommits(ctx: GateContextBase): void {
    commitQueues.delete(ctx);
}

/** The current queued-commit count, a mark an `or` arm rolls back to if it refuses. */
export function markCommits(ctx: GateContextBase): number {
    return commitQueues.get(ctx)?.length ?? 0;
}

/** Drops commits queued after `mark`, so an `or` arm that queued an effect then refused leaves nothing for the winning arm to carry. */
export function rollbackCommits(ctx: GateContextBase, mark: number): void {
    const queue = commitQueues.get(ctx);
    if (queue && queue.length > mark) queue.length = mark;
}
