'use client';

import { Icon, SegmentedControl, cn, segmentIds, tw } from '@seedcord/ui';
import { Check, X } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';

import { highlightText } from '#lib/highlightText';

import type { ReactNode, Ref } from 'react';
import type { ExcludeStrict } from 'type-fest';

const STAGES = ['compiler', 'lint', 'startup', 'Discord'] as const;

type Stage = (typeof STAGES)[number];

interface Run {
    id: string;
    label: string;
    command: string;
    output: string;
}

interface Stopped extends Run {
    stage: ExcludeStrict<Stage, 'Discord'>;
    // has to match the sample's code exactly
    wrong: string;
}

interface Passed extends Run {
    stage: 'Discord';
}

export type Attempt = Stopped | Passed;

const VERDICT: Record<Stage, string> = {
    compiler: 'Stopped by the compiler',
    lint: 'Stopped by a lint rule',
    startup: 'Stopped before the bot starts',
    Discord: 'Answers in Discord'
};

type Stop = 'cleared' | 'through' | 'arrived' | 'failed' | 'ahead';

const QUIET = tw`text-(--seed-dark)/55`;

const STOPS: Record<Stop, { dot: string; label: string; icon?: typeof Check }> = {
    cleared: { dot: tw`border-(--seed-dark) bg-(--seed-dark)`, label: QUIET, icon: Check },
    through: { dot: tw`border-(--rind-deep) bg-(--rind-deep)`, label: QUIET, icon: Check },
    arrived: {
        dot: tw`border-(--rind-deep) bg-(--rind-deep)`,
        label: tw`font-semibold text-(--rind-deep)`,
        icon: Check
    },
    failed: { dot: tw`border-(--flesh-deep) bg-(--flesh-deep)`, label: tw`font-semibold text-(--flesh-deep)`, icon: X },
    ahead: { dot: tw`border-(--seed-dark)/25 bg-(--pith)`, label: QUIET }
};

function stopAt(index: number, reached: number, passed: boolean): Stop {
    if (index > reached) return 'ahead';
    if (index === reached) return passed ? 'arrived' : 'failed';
    return passed ? 'through' : 'cleared';
}

const DOT = tw`relative z-10 flex size-5 items-center justify-center rounded-full border-[3px] text-(--pith) motion-safe:transition-colors motion-safe:duration-300`;

// the line runs between the centres of the first and last of the four columns
const LINE = tw`absolute inset-x-[12.5%] top-2 h-1`;

function Track({ stage }: { stage: Stage }): ReactNode {
    const reached = STAGES.indexOf(stage);
    const passed = stage === 'Discord';

    return (
        <div className={cn('relative grid grid-cols-4')} aria-hidden>
            <span className={cn(LINE, 'bg-(--seed-dark)/15')} />
            <span
                className={cn(
                    LINE,
                    'origin-left motion-safe:transition-transform motion-safe:duration-300',
                    passed ? 'bg-(--rind-deep)' : 'bg-(--seed-dark)'
                )}
                style={{ transform: `scaleX(${reached / (STAGES.length - 1)})` }}
            />
            {STAGES.map((name, index) => {
                const stop = STOPS[stopAt(index, reached, passed)];
                return (
                    <span key={name} className={cn('flex flex-col items-center gap-2')}>
                        <span className={cn(DOT, stop.dot)}>
                            {stop.icon ? <Icon icon={stop.icon} size={12} /> : null}
                        </span>
                        <span className={cn('font-mono-code text-xs', stop.label)}>{name}</span>
                    </span>
                );
            })}
        </div>
    );
}

interface LayersProps {
    ids: readonly string[];
    picked: number;
    shown?: Ref<HTMLDivElement>;
    className?: string;
    children: readonly ReactNode[];
}

// the layers share one grid cell, and the tallest one sets its height for every pick
function Layers({ ids, picked, shown, className, children }: LayersProps): ReactNode {
    return (
        <div className={cn('grid', className)}>
            {children.map((layer, index) => (
                <div
                    key={ids[index]}
                    ref={index === picked ? shown : undefined}
                    inert={index !== picked}
                    className={cn('col-start-1 row-start-1 min-w-0', index !== picked && 'invisible')}
                >
                    {layer}
                </div>
            ))}
        </div>
    );
}

interface MistakePickerProps {
    attempts: readonly Attempt[];
    // holds one card per attempt, in the same order
    cards: readonly ReactNode[];
}

export function MistakePicker({ attempts, cards }: MistakePickerProps): ReactNode {
    const tabsPrefix = useId();
    const [picked, setPicked] = useState(0);
    const shown = useRef<HTMLDivElement>(null);
    const attempt = attempts[picked];
    const ids = attempts.map((one) => one.id);

    useEffect(() => {
        if (attempt === undefined || attempt.stage === 'Discord' || shown.current === null) return;

        return highlightText({ mistake: [{ root: shown.current, texts: [attempt.wrong] }] });
    }, [attempt]);

    if (attempt === undefined) return null;

    return (
        <div className={cn('min-w-0')}>
            <SegmentedControl
                options={attempts.map((one) => ({ value: one.id, label: one.label }))}
                value={attempt.id}
                onChange={(id) => setPicked(attempts.findIndex((one) => one.id === id))}
                variant="underline"
                tabsPrefix={tabsPrefix}
                aria-label="Pick a mistake"
                className={cn('mb-4 flex-wrap gap-y-2')}
            />
            <div
                role="tabpanel"
                id={segmentIds(tabsPrefix, picked).panel}
                aria-labelledby={segmentIds(tabsPrefix, picked).tab}
                tabIndex={0}
                className={cn('blk-rind overflow-hidden rounded-sm rule')}
            >
                <Layers ids={ids} picked={picked} shown={shown} className={cn('bg-(--seed-dark)')}>
                    {cards}
                </Layers>
                <div className={cn('border-t-[3px] border-(--seed-dark) bg-(--pith) p-5')}>
                    <Track stage={attempt.stage} />
                    <Layers ids={ids} picked={picked} className={cn('mt-5')}>
                        {attempts.map((one) => (
                            <div key={one.id} className={cn('flex h-full flex-col gap-3')}>
                                <p className={cn('font-display text-lg font-semibold text-(--seed-dark)')}>
                                    {VERDICT[one.stage]}
                                </p>
                                <pre
                                    className={cn(
                                        'font-mono-code flex-1 rounded-sm bg-(--seed-dark) p-4 text-xs/relaxed wrap-break-word whitespace-pre-wrap text-(--pith)'
                                    )}
                                >
                                    <span className={cn('text-(--pith)/55')}>$ {one.command}</span>
                                    {`\n${one.output}`}
                                </pre>
                            </div>
                        ))}
                    </Layers>
                </div>
            </div>
        </div>
    );
}
