'use client';

import { CustomId } from '@seedcord/custom-id';
import { Icon, Input, SegmentedControl, cn, tw } from '@seedcord/ui';
import { attempt } from 'es-toolkit';
import { Pencil } from 'lucide-react';
import { useState } from 'react';

import type { ReactNode } from 'react';

const ROUTE = 'ticket';
const ACTIONS = ['close', 'reopen', 'escalate'] as const;
type Action = (typeof ACTIONS)[number];

// the same definition the component card declares
const Ticket = new CustomId(ROUTE).snowflake('ownerId').snowflake('channelId').uuid('caseId').oneOf('action', ACTIONS);

type Fields = ReturnType<typeof Ticket.decode>;

const OWNER_ID = '287135364127129601';
const CHANNEL_ID = '1099123456789012345';
const CASE_ID = '3f2b8c1e-9a4d-4e6f-b1c2-7d8e9f0a1b2c';

const DISCORD_ID_LIMIT = 100;
const SNOWFLAKE_DIGITS = 20;

const FIELDS = [
    { name: 'ownerId', type: 'string' },
    { name: 'channelId', type: 'string' },
    { name: 'caseId', type: 'string' },
    { name: 'action', type: ACTIONS.map((action) => `'${action}'`).join(' | ') }
] as const satisfies readonly { name: keyof Fields; type: string }[];

type Tone = keyof Fields | 'route' | 'packed' | 'joint';

const TONE: Record<Tone, string> = {
    route: tw`bg-(--husk) text-(--seed-dark)`,
    ownerId: tw`bg-(--flesh) text-(--seed-dark)`,
    channelId: tw`bg-(--rind) text-(--seed-dark)`,
    caseId: tw`bg-(--amber) text-(--seed-dark)`,
    action: tw`bg-(--rind-deep) text-(--pith)`,
    packed: tw`bg-(--pith) text-(--seed-dark)`,
    joint: tw`text-(--pith)`
};

const KEY_LABEL: Partial<Record<Tone, string>> = {
    route: 'the route',
    packed: 'every field, packed together'
};

const SWATCH = tw`inline-block size-3 shrink-0 rounded-xs`;

interface Piece {
    text: string;
    tone: Tone;
}

const JOINT: Piece = { text: ':', tone: 'joint' };

function joined(pieces: readonly Piece[]): Piece[] {
    return pieces.flatMap((piece, index) => (index === 0 ? [piece] : [JOINT, piece]));
}

function Tape({ label, pieces }: { label: string; pieces: readonly Piece[] }): ReactNode {
    const text = pieces.map((piece) => piece.text).join('');
    const cells = pieces.flatMap((piece) => Array.from(piece.text, (char) => ({ char, tone: piece.tone })));

    return (
        <div>
            <div className={cn('flex items-baseline justify-between gap-4')}>
                <span className={cn('text-lg font-semibold')}>{label}</span>
                <span className={cn('font-display text-3xl font-semibold')}>
                    {text.length}
                    <span className={cn('text-lg text-(--pith)/70')}> / {DISCORD_ID_LIMIT}</span>
                </span>
            </div>
            <div className={cn('mt-2 rounded-sm bg-(--seed-dark) p-3 sm:p-4')}>
                <ul className={cn('font-mono-code flex flex-wrap gap-x-5 gap-y-1 text-sm font-semibold')}>
                    {pieces.map(({ tone }) =>
                        tone === 'joint' ? null : (
                            <li key={tone} className={cn('flex items-center gap-2')}>
                                <span className={cn(SWATCH, TONE[tone])} />
                                {KEY_LABEL[tone] ?? tone}
                            </li>
                        )
                    )}
                </ul>
                <div
                    role="img"
                    aria-label={`${text}, ${text.length} of ${DISCORD_ID_LIMIT} characters`}
                    className={cn('mt-3 grid grid-cols-20 gap-0.75 sm:grid-cols-25')}
                >
                    {Array.from({ length: DISCORD_ID_LIMIT }, (_, index) => {
                        const cell = cells[index];
                        return (
                            <span
                                key={index}
                                aria-hidden
                                className={cn(
                                    'font-mono-code flex aspect-4/5 items-center justify-center rounded-xs text-xs font-semibold sm:text-sm',
                                    cell ? TONE[cell.tone] : 'border border-(--pith)/25'
                                )}
                            >
                                {cell?.char}
                            </span>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

const PAPER = tw`bg-(--pith) p-5 text-(--seed-dark)`;
const FIELD_LABEL = tw`font-mono-code mb-1.5 block text-sm font-semibold`;
const FIELD = tw`border-2 border-(--seed-dark) bg-white focus-within:outline-(--rind-deep)`;
const FIELD_TEXT = tw`font-mono-code text-base text-(--seed-dark)`;
const PENCIL = <Icon icon={Pencil} size={16} className={cn('text-(--seed-dark)/60')} />;

function Decoded({ values }: { values: Fields }): ReactNode {
    return (
        <dl className={cn('mt-4 divide-y divide-(--seed-dark)/15 border-t border-(--seed-dark)/15')}>
            {FIELDS.map((field) => (
                <div
                    key={field.name}
                    className={cn('font-mono-code flow-root py-2.5 last:pb-0 sm:flex sm:items-center sm:gap-x-3')}
                >
                    <span className={cn(SWATCH, TONE[field.name], 'max-sm:mr-3')} />
                    <dt className={cn('inline font-semibold')}>{field.name}</dt>
                    <dd
                        className={cn(
                            'text-xs/7 text-(--seed-dark)/60 max-sm:float-right max-sm:max-w-[20ch] max-sm:text-right sm:order-last sm:ml-auto sm:text-sm'
                        )}
                    >
                        {field.type}
                    </dd>
                    <dd className={cn('min-w-0 break-all max-sm:mt-1')}>{values[field.name]}</dd>
                </div>
            ))}
        </dl>
    );
}

interface ValuesProps {
    ownerId: string;
    action: Action;
    onOwnerId: (ownerId: string) => void;
    onAction: (action: Action) => void;
}

function Values({ ownerId, action, onOwnerId, onAction }: ValuesProps): ReactNode {
    return (
        <div className={cn(PAPER, 'blk rounded-sm rule')}>
            <p className={cn('text-lg font-semibold')}>Try your own values.</p>
            <div className={cn('mt-4 grid gap-4 sm:grid-cols-[1fr_auto]')}>
                <label>
                    <span className={cn(FIELD_LABEL)}>ownerId</span>
                    <Input
                        value={ownerId}
                        onChange={(event) => onOwnerId(event.target.value)}
                        inputMode="numeric"
                        maxLength={SNOWFLAKE_DIGITS}
                        spellCheck={false}
                        trailing={PENCIL}
                        className={cn(FIELD)}
                        inputClassName={cn(FIELD_TEXT)}
                    />
                </label>
                <div>
                    <span className={cn(FIELD_LABEL)}>action</span>
                    <SegmentedControl
                        options={ACTIONS.map((one) => ({ value: one, label: one }))}
                        value={action}
                        onChange={onAction}
                        variant="underline"
                        aria-label="action"
                        className={cn('h-10 items-center')}
                    />
                </div>
            </div>
        </div>
    );
}

interface CustomIdDemoProps {
    component: ReactNode;
    handler: ReactNode;
}

export function CustomIdDemo({ component, handler }: CustomIdDemoProps): ReactNode {
    const [ownerId, setOwnerId] = useState(OWNER_ID);
    const [action, setAction] = useState<Action>('escalate');
    const [pasted, setPasted] = useState<string | null>(null);

    const values = { ownerId, channelId: CHANNEL_ID, caseId: CASE_ID, action };
    const [encodeError, encoded] = attempt<string, Error>(() => Ticket.encode(values));
    const id = encoded ?? '';
    const wire = pasted ?? id;
    const [decodeError, decoded] = attempt<Fields, Error>(() => Ticket.decode(wire));

    const byHand = joined([
        { text: ROUTE, tone: 'route' },
        ...FIELDS.map(({ name }) => ({ text: values[name], tone: name }))
    ]);
    const [routeKey = '', ...body] = id.split(':');
    const packed = joined([
        { text: routeKey, tone: 'route' },
        { text: body.join(':'), tone: 'packed' }
    ]);

    const discardingPasted =
        <Value,>(set: (value: Value) => void) =>
        (value: Value): void => {
            set(value);
            setPasted(null);
        };

    return (
        <div className={cn('grid items-start gap-10 lg:grid-cols-2')}>
            {component}

            <div className={cn('min-w-0 space-y-7')}>
                <Values
                    ownerId={ownerId}
                    action={action}
                    onOwnerId={discardingPasted(setOwnerId)}
                    onAction={discardingPasted(setAction)}
                />
                <Tape label="Joined by hand" pieces={byHand} />
                {encodeError === null ? (
                    <Tape label="Ticket.encode()" pieces={packed} />
                ) : (
                    <p className={cn('rounded-sm px-4 py-3 text-lg font-medium rule-pith')}>{encodeError.message}</p>
                )}
            </div>

            {handler}

            <div className={cn(PAPER, 'blk min-w-0 rounded-sm rule')}>
                <label>
                    <span className={cn('mb-1.5 block text-lg font-semibold')}>The id Discord sends back</span>
                    <Input
                        value={wire}
                        onChange={(event) => setPasted(event.target.value)}
                        spellCheck={false}
                        trailing={PENCIL}
                        aria-label="The custom id to decode"
                        className={cn(FIELD)}
                        inputClassName={cn(FIELD_TEXT)}
                    />
                </label>
                <p className={cn('font-mono-code mt-5 text-sm font-semibold')}>this.params</p>
                {decodeError === null ? (
                    <Decoded values={decoded} />
                ) : (
                    <p className={cn('mt-4 text-lg font-medium text-(--flesh-deep)')}>{decodeError.message}</p>
                )}
            </div>
        </div>
    );
}
