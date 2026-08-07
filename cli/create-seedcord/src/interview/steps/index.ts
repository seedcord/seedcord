import { botColorStep } from './botColor';
import { capabilitiesStep } from './capabilities';
import { directoryStep } from './directory';
import { languageStep } from './language';
import { publicKeyStep } from './publicKey';
import { tokenStep } from './token';
import { transportStep } from './transport';

import type { AnyStep } from '../types';

// the token and public key are both read off the Discord dashboard
export const STEPS: AnyStep[] = [
    directoryStep,
    languageStep,
    transportStep,
    capabilitiesStep,
    tokenStep,
    publicKeyStep,
    botColorStep
];
