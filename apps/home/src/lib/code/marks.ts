import { tw } from '@seedcord/ui';

// --flesh reads too dark on the flesh and rind grounds
export const CODE_MARK_DARK = tw`rounded-sm bg-(--seed-dark)/30 px-1.5 text-[0.88em]`;
export const CODE_MARK_LIGHT = tw`text-[0.95em] text-(--flesh)`;
// the ink ground is --seed-dark itself. the chip above only darkens it further
export const CODE_MARK_INK = tw`rounded-sm bg-(--pith)/15 px-1.5 text-[0.88em]`;
// a post can have a code name every few words, and red at that density pulls the eye off the sentence
export const CODE_MARK_PROSE = tw`rounded-sm bg-(--seed-dark)/8 px-1 py-px text-[0.86em] text-(--seed-dark) in-[a]:text-inherit`;
