export const STEP_LABELS = ['files', 'deps', 'format', 'types', 'git'] as const;

export type StepLabel = (typeof STEP_LABELS)[number];

export interface StepUi {
    run: <Ret>(label: StepLabel, work: () => Promise<Ret>) => Promise<Ret>;
    skip: (label: StepLabel) => void;
}
