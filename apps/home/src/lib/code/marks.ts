import { tw } from '@seedcord/ui';

// --flesh reads too dark on the flesh and rind grounds
export const CODE_MARK_DARK = tw`rounded-sm bg-(--seed-dark)/30 px-1.5 text-[0.88em]`;
export const CODE_MARK_LIGHT = tw`text-[0.95em] text-(--flesh)`;
// the ink ground is --seed-dark itself. the chip above only darkens it further
export const CODE_MARK_INK = tw`rounded-sm bg-(--pith)/15 px-1.5 text-[0.88em]`;
