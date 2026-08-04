import { commandRefreshPrompt } from './commandRefreshPrompt';
import { errorThenRestart } from './errorThenRestart';
import { filters } from './filters';
import { happyStartup } from './happyStartup';
import { restartRequiredFromFileChange } from './restartRequiredFromFileChange';

import type { Scenario } from './types';

export const SCENARIOS: readonly Scenario[] = [
    happyStartup,
    filters,
    errorThenRestart,
    restartRequiredFromFileChange,
    commandRefreshPrompt
];
