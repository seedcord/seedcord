import { botColorStep } from './botColor';
import { capabilitiesStep } from './capabilities';
import { directoryStep } from './directory';
import { runtimeStep } from './runtime';
import { testingGuildsStep } from './testingGuilds';
import { tokenStep } from './token';
import { transportStep } from './transport';
import { gitStep, installStep } from './yesNo';

import type { AnyStep } from '#interview/types';

export const STEPS: AnyStep[] = [
    directoryStep,
    transportStep,
    runtimeStep,
    capabilitiesStep,
    tokenStep,
    testingGuildsStep,
    botColorStep,
    installStep,
    gitStep
];
