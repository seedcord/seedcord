import { botColorStep } from './botColor';
import { capabilitiesStep } from './capabilities';
import { directoryStep } from './directory';
import { publicKeyStep } from './publicKey';
import { tokenStep } from './token';
import { transportStep } from './transport';

import type { AnyStep } from '#interview/types';

// the token and public key are both read off the Discord dashboard
export const STEPS: AnyStep[] = [
    directoryStep,
    transportStep,
    capabilitiesStep,
    tokenStep,
    publicKeyStep,
    botColorStep
];
