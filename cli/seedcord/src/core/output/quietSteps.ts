import type { Steps } from './Steps';

export const quietSteps: Steps<string> = {
    step: (_label, task) => task(),
    detail: () => undefined
};
