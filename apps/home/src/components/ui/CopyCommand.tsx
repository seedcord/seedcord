'use client';

import { Icon, LabelSwap, cn, useTimedToggle } from '@seedcord/ui';
import { easeOutStrong, layoutSpring } from '@seedcord/ui/lib/motion';
import { Copy, DollarSign } from 'lucide-react';
import { AnimatePresence, m } from 'motion/react';
import { useRef, useState } from 'react';

import { pressable } from './press';

import type { ReactNode } from 'react';

const COPIED_RESET_MS = 2000;

const SEED_COUNT = 10;
const PULP_COUNT = 4;
const SEED_WIDTH_PX = 5;
const SEED_HEIGHT_PX = 8;
const PULP_SIZE_PX = 5;
// launch cone above the chip
const ANGLE_MIN_DEG = 27;
const ANGLE_SPAN_DEG = 126;
const HALF_TURN_DEG = 180;
const RISE_MIN_PX = 36;
const RISE_VAR_PX = 64;
const FALL_MIN_PX = 50;
const FALL_VAR_PX = 50;
const DRIFT_GROWTH = 1.35;
const SPIN_MAX_DEG = 720;
const DURATION_MIN_MS = 650;
const DURATION_VAR_MS = 350;
const HALF = 0.5;

function spawnParticle(container: HTMLElement, isSeed: boolean, pulpColor: string): void {
    const particle = document.createElement('span');
    particle.style.position = 'absolute';
    particle.style.left = '50%';
    particle.style.top = '50%';
    particle.style.width = `${isSeed ? SEED_WIDTH_PX : PULP_SIZE_PX}px`;
    particle.style.height = `${isSeed ? SEED_HEIGHT_PX : PULP_SIZE_PX}px`;
    particle.style.borderRadius = isSeed ? '9999px' : '1px';
    particle.style.background = isSeed ? 'var(--seed-dark)' : pulpColor;
    particle.style.willChange = 'transform, opacity';
    container.append(particle);

    const angle = ((ANGLE_MIN_DEG + ANGLE_SPAN_DEG * Math.random()) / HALF_TURN_DEG) * Math.PI;
    const rise = RISE_MIN_PX + RISE_VAR_PX * Math.random();
    const dx = Math.cos(angle) * rise;
    const dy = Math.sin(angle) * rise;
    const fall = FALL_MIN_PX + FALL_VAR_PX * Math.random();
    const spin = (Math.random() - HALF) * SPIN_MAX_DEG;

    const animation = particle.animate(
        [
            { transform: 'translate(-50%, -50%) rotate(0deg)', opacity: 1, easing: 'cubic-bezier(0.23,1,0.32,1)' },
            {
                transform: `translate(calc(-50% + ${dx}px), calc(-50% - ${dy}px)) rotate(${spin * HALF}deg)`,
                opacity: 1,
                easing: 'cubic-bezier(0.55,0,1,0.45)'
            },
            {
                transform: `translate(calc(-50% + ${dx * DRIFT_GROWTH}px), calc(-50% + ${fall}px)) rotate(${spin}deg)`,
                opacity: 0
            }
        ],
        { duration: DURATION_MIN_MS + DURATION_VAR_MS * Math.random(), fill: 'forwards' }
    );
    animation.onfinish = (): void => particle.remove();
}

function burstSeeds(container: HTMLElement): void {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    for (let i = 0; i < SEED_COUNT; i += 1) spawnParticle(container, true, '');
    for (let i = 0; i < PULP_COUNT; i += 1) {
        spawnParticle(container, false, i % 2 === 0 ? 'var(--flesh-deep)' : 'var(--rind)');
    }
}

// match LabelSwap's 4px, blur-[2px] and duration-200
const SWAP_OFFSET_PX = 4;
const SWAP_SECONDS = 0.2;

export type SwapDirection = 1 | -1;

const swapVariants = {
    enter: (direction: SwapDirection) => ({ opacity: 0, x: direction * SWAP_OFFSET_PX, filter: 'blur(2px)' }),
    shown: { opacity: 1, x: 0, filter: 'blur(0px)' },
    leave: (direction: SwapDirection) => ({ opacity: 0, x: -direction * SWAP_OFFSET_PX, filter: 'blur(2px)' })
};

interface CopyCommandProps {
    command: string;
    label?: string;
    // 1 brings the next label in from the right; -1 from the left
    direction: SwapDirection;
    className?: string;
}

export function CopyCommand({ command, label, direction, className }: CopyCommandProps): ReactNode {
    const burstRef = useRef<HTMLSpanElement>(null);
    const [copiedRecently, markCopied] = useTimedToggle(COPIED_RESET_MS);
    const [lastCopied, setLastCopied] = useState<string | null>(null);
    const [shownCommand, setShownCommand] = useState(command);
    if (shownCommand !== command) {
        setShownCommand(command);
        setLastCopied(null);
    }
    const copied = copiedRecently && lastCopied === command;

    const copy = async (): Promise<void> => {
        try {
            await navigator.clipboard.writeText(command);
        } catch {
            return;
        }
        setLastCopied(command);
        markCopied();
        if (burstRef.current) burstSeeds(burstRef.current);
    };

    return (
        <>
            {/* aria-label pins the button's name, keeping the swap below out of the a11y tree */}
            <span aria-live="polite" className={cn('sr-only')}>
                {copied ? 'Copied' : ''}
            </span>
            <m.button
                layout
                transition={{ layout: layoutSpring }}
                type="button"
                aria-label={label ?? `Copy ${command}`}
                onClick={() => {
                    void copy();
                }}
                className={cn(
                    'font-mono-code relative cursor-pointer rounded-sm bg-(--seed-dark) px-2 py-1 text-sm text-(--pith)',
                    pressable,
                    'hover:bg-(--flesh-deep)',
                    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--rind)',
                    className
                )}
            >
                <AnimatePresence initial={false} mode="popLayout" custom={direction}>
                    {/* motion scales children during a parent layout animation unless they take layout too */}
                    <m.span
                        key={label ?? command}
                        layout="position"
                        custom={direction}
                        variants={swapVariants}
                        initial="enter"
                        animate="shown"
                        exit="leave"
                        transition={{ duration: SWAP_SECONDS, ease: easeOutStrong }}
                        className={cn('block')}
                    >
                        <LabelSwap
                            active={copied}
                            idleLabel={
                                <span className={cn('flex items-center gap-1.5')}>
                                    <Icon
                                        icon={label === undefined ? DollarSign : Copy}
                                        size={14}
                                        className={cn('text-(--pith)/60')}
                                    />
                                    {label ?? command}
                                </span>
                            }
                            activeLabel="copied!"
                            activeClassName={cn('text-center')}
                        />
                    </m.span>
                </AnimatePresence>
                <span ref={burstRef} aria-hidden className={cn('pointer-events-none absolute inset-0')} />
            </m.button>
        </>
    );
}
