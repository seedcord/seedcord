'use client';

import { LabelSwap, cn, useTimedToggle } from '@seedcord/ui';
import { useRef } from 'react';

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

interface CopyCommandProps {
    command: string;
    className?: string;
}

export function CopyCommand({ command, className }: CopyCommandProps): ReactNode {
    const burstRef = useRef<HTMLSpanElement>(null);
    const [copied, markCopied] = useTimedToggle(COPIED_RESET_MS);

    const copy = async (): Promise<void> => {
        try {
            await navigator.clipboard.writeText(command);
        } catch {
            return;
        }
        markCopied();
        if (burstRef.current) burstSeeds(burstRef.current);
    };

    return (
        <>
            {/* aria-label pins the button's name, keeping the swap below out of the a11y tree */}
            <span aria-live="polite" className={cn('sr-only')}>
                {copied ? 'Copied' : ''}
            </span>
            {/* eslint-disable-next-line react/forbid-elements -- the two-label grid swap and the seed burst have no Button variant */}
            <button
                type="button"
                aria-label={`Copy ${command}`}
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
                <LabelSwap
                    active={copied}
                    idleLabel={
                        <>
                            <span className={cn('text-(--pith)/50 select-none')}>$ </span>
                            {command}
                        </>
                    }
                    activeLabel="copied!"
                    activeClassName={cn('text-center')}
                />
                <span ref={burstRef} aria-hidden className={cn('pointer-events-none absolute inset-0')} />
            </button>
        </>
    );
}
