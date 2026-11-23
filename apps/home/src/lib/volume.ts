import { SeedcordErrorCode } from '@seedcord/errors/codes';
import seedcordRules from '@seedcord/eslint-plugin';
import { sumBy } from 'es-toolkit';
import discordjsRules from 'eslint-plugin-discordjs';

// a numeric enum also maps each number back to its name
export const ERROR_CODE_COUNT = Object.values(SeedcordErrorCode).filter((value) => typeof value === 'number').length;

// eslint's plugin type marks rules optional. both plugins define them
export const LINT_RULE_COUNT = sumBy(
    [seedcordRules, discordjsRules],
    (plugin) => Object.keys(plugin.rules ?? {}).length
);
