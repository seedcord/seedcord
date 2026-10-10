import { botColorStep } from './botColor';
import { capabilitiesStep } from './capabilities';
import { directoryStep } from './directory';
import { tokenStep } from './token';
import { transportStep } from './transport';

import type { AnyStep } from '#interview/types';

export const STEPS: AnyStep[] = [directoryStep, transportStep, capabilitiesStep, tokenStep, botColorStep];
