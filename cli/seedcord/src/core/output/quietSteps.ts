import type { Steps } from './Steps';

// runs each task and prints nothing
export const quietSteps: Steps<string> = {
    step: (_label, task) => task(),
    detail: () => undefined
};
