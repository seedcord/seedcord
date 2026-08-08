import { S_STEP_SUBMIT, log, spinner } from '@clack/prompts';
import { paint } from '@seedcord/errors/internal';

interface StepLabels {
    running: string;
    done: string;
}

export interface StepUi {
    run: <Ret>(labels: StepLabels, work: () => Promise<Ret>) => Promise<Ret>;
    skip: (label: string) => void;
}

export function clackSteps(): StepUi {
    return {
        run: async (labels, work) => {
            // clack fixes the indicator at construction
            const spin = spinner({ indicator: 'timer' });
            spin.start(labels.running);

            try {
                const result = await work();
                spin.stop(labels.done);
                return result;
            } catch (error) {
                spin.error(`${labels.running} failed`);
                throw error;
            }
        },
        skip: (label) => {
            log.message(paint.mute(`${label} (skipped)`), { symbol: paint.mute(S_STEP_SUBMIT) });
        }
    };
}

export function silentSteps(): StepUi {
    return {
        run: async (_labels, work) => work(),
        skip: () => undefined
    };
}
