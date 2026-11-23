import type { StepPrinter } from '#core/output/StepPrinter';
import type { Steps } from '#core/output/Steps';

export type PresenterOutput<Label extends string> = Pick<
    StepPrinter<Label>,
    'step' | 'detail' | 'line' | 'wrapped' | 'warn'
>;

export abstract class StepsPresenter<Label extends string> implements Steps<Label> {
    constructor(protected readonly output: PresenterOutput<Label>) {}

    public step<Result>(label: Label, task: () => Promise<Result>, note?: (result: Result) => string): Promise<Result> {
        return this.output.step(label, task, note);
    }

    public detail(key: string, value: string): void {
        this.output.detail(key, value);
    }
}
