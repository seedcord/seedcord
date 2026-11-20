'use client';

import { Icon, Switch, cn, tw } from '@seedcord/ui';
import { Check, Minus, X } from 'lucide-react';
import { useEffect, useId, useMemo, useRef, useState } from 'react';

import { highlightText } from '#lib/highlightText';

import type { ReactNode } from 'react';

type Outcome = 'passes' | 'refuses' | 'skipped';

interface Caller {
    inServer: boolean;
    canBan: boolean;
    hasRole: boolean;
    botCanBan: boolean;
}

interface GateInfo {
    // has to match the sample's code card exactly
    call: string;
    fact: string;
    flag: keyof Caller;
}

const GATE_IDS = ['guild', 'permissions', 'role', 'bot'] as const;

type GateId = (typeof GATE_IDS)[number];

const GATES = {
    guild: { call: 'GuildOnly()', fact: 'in a server', flag: 'inServer' },
    permissions: { call: 'RequirePermissions([BanMembers])', fact: 'can ban members', flag: 'canBan' },
    role: { call: 'RequireRole(modRoleId)', fact: 'has the mod role', flag: 'hasRole' },
    bot: { call: 'RequireBotPermissions([BanMembers])', fact: 'the bot can ban', flag: 'botCanBan' }
} satisfies Record<GateId, GateInfo>;

interface Verdict {
    outcomes: Record<GateId, Outcome>;
    orPasses: boolean;
    refusal: string | undefined;
}

function refusalFor(inServer: boolean, orPasses: boolean, botCanBan: boolean): string | undefined {
    if (!inServer) return 'GuildOnly() refuses a DM.';
    if (!orPasses) return 'or() refuses because neither of its gates passes.';
    if (!botCanBan) return 'RequireBotPermissions() refuses because the bot can’t ban.';
    return undefined;
}

// gates run left to right. the first refusal stops the rest, and or() stops at its first pass
function evaluate({ inServer, canBan, hasRole, botCanBan }: Caller): Verdict {
    const orPasses = inServer && (canBan || hasRole);
    const outcome = (reached: boolean, passes: boolean): Outcome => {
        if (!reached) return 'skipped';
        return passes ? 'passes' : 'refuses';
    };

    return {
        outcomes: {
            guild: outcome(true, inServer),
            permissions: outcome(inServer, canBan),
            role: outcome(inServer && !canBan, hasRole),
            bot: outcome(orPasses, botCanBan)
        },
        orPasses,
        refusal: refusalFor(inServer, orPasses, botCanBan)
    };
}

const MARK: Record<Outcome, { icon: typeof Check; className: string }> = {
    passes: { icon: Check, className: tw`bg-(--seed-dark) text-(--pith)` },
    refuses: { icon: X, className: tw`bg-(--flesh-deep) text-(--pith)` },
    skipped: { icon: Minus, className: tw`bg-(--pith)/20 text-(--pith)/70` }
};

interface GroupProps {
    combinator: string;
    rule: string;
    passes: boolean;
    children: ReactNode;
}

function Group({ combinator, rule, passes, children }: GroupProps): ReactNode {
    return (
        <div
            className={cn(
                'rounded-sm border-[3px] px-4 pt-3 pb-4 motion-safe:transition-colors motion-safe:duration-200',
                passes ? 'border-(--pith) bg-(--seed-dark)/25' : 'border-dashed border-(--pith)/50'
            )}
        >
            <p className={cn('flex flex-wrap items-baseline gap-x-2')}>
                <span className={cn('font-mono-code font-semibold')}>{combinator}</span>
                <span className={cn('text-(--pith)/80')}>{rule}</span>
            </p>
            <div className={cn('mt-3 space-y-3')}>{children}</div>
        </div>
    );
}

const SWITCH = tw`border-(--pith)/70 bg-(--seed-dark)/45 data-[state=checked]:border-(--pith) data-[state=checked]:bg-(--pith) [&>span]:bg-(--pith) data-[state=checked]:[&>span]:bg-(--rind-deep)`;

interface GateProps {
    id: GateId;
    caller: Caller;
    outcome: Outcome;
    onChange: (caller: Caller) => void;
}

function Gate({ id, caller, outcome, onChange }: GateProps): ReactNode {
    const switchId = useId();
    const { call, fact, flag } = GATES[id];
    const mark = MARK[outcome];
    const disabled = flag !== 'inServer' && !caller.inServer;

    return (
        <div className={cn('flex flex-wrap items-center gap-x-3 gap-y-1')}>
            <span className={cn('flex min-w-0 items-center gap-3')}>
                <span
                    className={cn(
                        'flex size-5 shrink-0 items-center justify-center rounded-full motion-safe:transition-colors motion-safe:duration-200',
                        mark.className
                    )}
                    aria-hidden
                >
                    <Icon icon={mark.icon} size={12} />
                </span>
                <span
                    className={cn(
                        'font-mono-code min-w-0 font-semibold wrap-anywhere',
                        outcome === 'skipped' && 'text-(--pith)/65'
                    )}
                >
                    {call.replace(/\(.*\)/, '()')}
                </span>
            </span>
            <span className={cn('ml-auto flex items-center gap-3')}>
                <label htmlFor={switchId} className={cn(disabled && 'opacity-55')}>
                    {fact}
                </label>
                <Switch
                    id={switchId}
                    checked={caller[flag]}
                    onCheckedChange={(on) => onChange({ ...caller, [flag]: on })}
                    disabled={disabled}
                    size="sm"
                    className={cn(SWITCH)}
                />
            </span>
        </div>
    );
}

interface GateEvaluatorProps {
    card: ReactNode;
    children: ReactNode;
}

export function GateEvaluator({ card, children }: GateEvaluatorProps): ReactNode {
    const code = useRef<HTMLDivElement>(null);
    const [caller, setCaller] = useState<Caller>({ inServer: true, canBan: false, hasRole: true, botCanBan: true });
    const { outcomes, orPasses, refusal } = useMemo(() => evaluate(caller), [caller]);
    const runs = refusal === undefined;

    useEffect(() => {
        const root = code.current;
        if (root === null) return;

        const calls = (outcome: Outcome): string[] =>
            GATE_IDS.filter((id) => outcomes[id] === outcome).map((id) => GATES[id].call);

        return highlightText({
            'gate-pass': [{ root, texts: calls('passes') }],
            'gate-fail': [{ root, texts: calls('refuses') }]
        });
    }, [outcomes]);

    const gate = (id: GateId): ReactNode => (
        <Gate id={id} caller={caller} outcome={outcomes[id]} onChange={setCaller} />
    );

    return (
        <div className={cn('grid items-start gap-10 md:grid-cols-2 lg:grid-cols-[1fr_1.1fr]')}>
            <div className={cn('min-w-0')}>{children}</div>
            <div className={cn('min-w-0 text-lg md:pt-2 lg:col-start-1 lg:row-start-2 lg:self-end lg:pt-0')}>
                <Group combinator="@Gated()" rule="every gate passes" passes={runs}>
                    {gate('guild')}
                    <Group combinator="or()" rule="any one gate passes" passes={orPasses}>
                        {gate('permissions')}
                        {gate('role')}
                    </Group>
                    {gate('bot')}
                    <p className={cn('min-h-19 border-t-[3px] border-(--pith)/40 pt-3')} aria-live="polite">
                        <span className={cn('font-display text-2xl font-semibold')}>
                            {runs ? '/ban runs.' : '/ban is refused.'}
                        </span>{' '}
                        <span className={cn('text-(--pith)/85')}>{refusal}</span>
                    </p>
                </Group>
            </div>
            <div
                ref={code}
                className={cn(
                    'min-w-0 md:col-span-2 lg:col-span-1 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-end'
                )}
            >
                {card}
            </div>
        </div>
    );
}
