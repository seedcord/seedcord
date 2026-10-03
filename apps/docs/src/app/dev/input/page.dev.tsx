'use client';

import { tw, Input, Icon, Button } from '@seedcord/ui';
import { Search, X, Mail } from 'lucide-react';
import { useState } from 'react';

import type { ReactElement, ReactNode } from 'react';

function DevSection({ title, children }: { title: string; children: ReactNode }): ReactElement {
    return (
        <section className={tw`space-y-3`}>
            <h2 className={tw`text-subtle text-xs font-semibold tracking-widest uppercase`}>{title}</h2>
            {children}
        </section>
    );
}

function VariantsRow(): ReactElement {
    return (
        <div className={tw`max-w-md space-y-3`}>
            <div className={tw`space-y-1`}>
                <p className={tw`text-subtle text-xs`}>variant=&quot;default&quot; (bordered field, own focus ring)</p>
                <Input placeholder="you@example.com" leading={<Icon icon={Mail} size={16} />} />
            </div>
            <div className={tw`space-y-1`}>
                <p className={tw`text-subtle text-xs`}>variant=&quot;ghost&quot; (for embedding in a composed bar)</p>
                <div
                    className={tw`flex items-center rounded-lg border border-(--border) focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-(--focus-outline-b)`}
                >
                    <Input variant="ghost" placeholder="Search entities" leading={<Icon icon={Search} size={16} />} />
                </div>
            </div>
        </div>
    );
}

function SizesRow(): ReactElement {
    return (
        <div className={tw`max-w-md space-y-3`}>
            {(['sm', 'md', 'lg'] as const).map((size) => (
                <div key={size} className={tw`space-y-1`}>
                    <p className={tw`text-subtle text-xs tracking-wide`}>size=&quot;{size}&quot;</p>
                    <Input size={size} placeholder={`size ${size}`} leading={<Icon icon={Search} size={16} />} />
                </div>
            ))}
        </div>
    );
}

function SearchFieldRow(): ReactElement {
    const [value, setValue] = useState('Logger');
    return (
        <div className={tw`max-w-md space-y-1`}>
            <p className={tw`text-subtle text-xs`}>leading icon + trailing clear button (controlled)</p>
            <Input
                value={value}
                onChange={(event) => setValue(event.target.value)}
                placeholder="Search entities or their members"
                leading={<Icon icon={Search} size={16} />}
                trailing={
                    value ? (
                        <Button variant="ghost" size="icon" className={tw`size-6`} onClick={() => setValue('')}>
                            <Icon icon={X} size={14} />
                        </Button>
                    ) : null
                }
            />
            <p className={tw`text-subtle text-xs`}>value: {value || '(empty)'}</p>
        </div>
    );
}

function StatesRow(): ReactElement {
    return (
        <div className={tw`max-w-md space-y-3`}>
            <div className={tw`space-y-1`}>
                <p className={tw`text-subtle text-xs`}>disabled</p>
                <Input disabled placeholder="disabled" leading={<Icon icon={Search} size={16} />} />
            </div>
            <div className={tw`space-y-1`}>
                <p className={tw`text-subtle text-xs`}>no slots (plain field)</p>
                <Input placeholder="plain text field" />
            </div>
        </div>
    );
}

function InputPage(): ReactElement {
    return (
        <div className={tw`space-y-10 pb-32`}>
            <header className={tw`space-y-2`}>
                <h1 className={tw`text-2xl font-semibold tracking-tight text-(--text)`}>Input</h1>
                <p className={tw`text-subtle text-sm`}>
                    Text field primitive: `default` (bordered, own focus ring) and `ghost` (for a composed bar)
                    variants, sm/md/lg sizes, optional `leading`/`trailing` slots for icons and buttons, `ref` as a
                    normal prop.
                </p>
            </header>
            <DevSection title="Variants">
                <VariantsRow />
            </DevSection>
            <DevSection title="Sizes">
                <SizesRow />
            </DevSection>
            <DevSection title="Search field (leading + trailing)">
                <SearchFieldRow />
            </DevSection>
            <DevSection title="States">
                <StatesRow />
            </DevSection>
        </div>
    );
}

export default InputPage;
