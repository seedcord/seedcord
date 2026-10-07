import type { Steps } from '#core/output/Steps';

export const silentSteps: Steps<string> = {
    step: (_label, task) => task(),
    detail: () => undefined
};
