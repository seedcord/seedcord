export const STEP_LABELS = ['files', 'install', 'format', 'types', 'git'] as const;

export type StepLabel = (typeof STEP_LABELS)[number];

export interface StepUi {
    run: <Ret>(label: StepLabel, work: () => Promise<Ret>) => Promise<Ret>;
    skip: (label: StepLabel) => void;
}

export function silentSteps(): StepUi {
    return {
        run: async (_label, work) => work(),
        skip: () => undefined
    };
}
