import { styleText } from 'node:util';

import { S_STEP_SUBMIT, log, spinner } from '@clack/prompts';

export interface StepLabels {
    running: string;
    done: string;
    stream?: boolean;
}

export type StepLogger = (line: string) => void;

export interface StepUi {
    run: <Ret>(labels: StepLabels, work: (onLine: StepLogger) => Promise<Ret>) => Promise<Ret>;
    skip: (label: string) => void;
}

export function clackSteps(): StepUi {
    return {
        run: async (labels, work) => {
            const spin = spinner();
            spin.start(labels.running);

            const onLine: StepLogger =
                labels.stream === true
                    ? (line) => {
                          spin.message(`${labels.running}  ${styleText('dim', line)}`);
                      }
                    : () => undefined;

            try {
                const result = await work(onLine);
                spin.stop(labels.done);
                return result;
            } catch (error) {
                spin.error(labels.running);
                throw error;
            }
        },
        skip: (label) => {
            log.message(styleText('gray', `${label} (skipped)`), {
                symbol: styleText('gray', S_STEP_SUBMIT)
            });
        }
    };
}

export function silentSteps(): StepUi {
    return {
        run: async (_labels, work) => work(() => undefined),
        skip: () => undefined
    };
}
