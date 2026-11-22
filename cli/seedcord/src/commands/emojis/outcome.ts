import { paint, SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
import { errorReason } from '@seedcord/utils/internal';

import type { StepPrinter } from '#core/output/StepPrinter';

const DONE = { upload: 'uploaded', delete: 'deleted', download: 'downloaded' } satisfies Record<string, string>;
type Action = keyof typeof DONE;

interface Failure<Item> {
    item: Item;
    reason: string;
}

export interface Outcome<Item> {
    done: Item[];
    failed: Failure<Item>[];
}

type Count = readonly [count: number, did: string];

interface Settle<Item> {
    items: readonly Item[];
    run: (item: Item) => Promise<void>;
    labelOf: (item: Item) => string;
    // splits the count in the step row, like "2 uploaded, 1 replaced". skip it if you want one number
    counts?: (done: readonly Item[]) => readonly Count[];
    reasonOf?: (error: unknown) => string;
}

// one item at a time. a failed one gets a warning and the rest still run
export async function settleStep<Step extends Action, Item>(
    output: Pick<StepPrinter<NoInfer<Step>>, 'step' | 'line' | 'warn'>,
    action: Step,
    { items, run, labelOf, counts = (done) => [[done.length, DONE[action]]], reasonOf = errorReason }: Settle<Item>
): Promise<Outcome<Item>> {
    const outcome = await output.step(
        action,
        async () => {
            const settled: Outcome<Item> = { done: [], failed: [] };
            for (const item of items) {
                try {
                    await run(item);
                    settled.done.push(item);
                } catch (error: unknown) {
                    settled.failed.push({ item, reason: reasonOf(error) });
                }
            }
            return settled;
        },
        ({ done, failed }) => {
            const parts = counts(done)
                .filter(([count]) => count > 0)
                .map(([count, did]) => `${paint.iris(String(count))} ${did}`);
            if (failed.length > 0) parts.push(paint.coral(`${failed.length} failed`));
            return parts.join(', ');
        }
    );

    if (outcome.failed.length > 0) output.line();
    for (const { item, reason } of outcome.failed) output.warn(`Could not ${action} ${labelOf(item)} (${reason}).`);
    return outcome;
}

export function assertNoneFailed({ failed }: Outcome<unknown>, action: Action): void {
    if (failed.length > 0) throw new SeedcordError(SeedcordErrorCode.CliSomeFailed, ['emojis', DONE[action]]);
}
