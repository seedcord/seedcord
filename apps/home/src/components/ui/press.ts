import { cn } from '@seedcord/ui';

export const pressable = cn(
    'transition-[color,background-color,scale] duration-150 ease-(--ease-out-strong)',
    'motion-safe:active:scale-[0.97]'
);
