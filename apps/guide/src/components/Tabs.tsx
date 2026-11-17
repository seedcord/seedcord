'use client';

import { Card, SegmentedControl, cn } from '@seedcord/ui';
import { Children, isValidElement, useState } from 'react';

import type { ReactElement, ReactNode } from 'react';

export interface TabProps {
    label: string;
    children?: ReactNode;
}

// only holds the panel because Tabs reads the label off each Tab
export function Tab({ children }: TabProps): ReactElement {
    return <div className={cn('flex flex-col gap-5')}>{children}</div>;
}

interface TabsProps {
    children?: ReactNode;
}

// checks the label because React passes each Tab from the server mdx as a client reference, whose type isn't Tab
function isTab(child: unknown): child is ReactElement<TabProps> {
    return isValidElement<Partial<TabProps>>(child) && typeof child.props.label === 'string';
}

function tabsOf(children: ReactNode): ReactElement<TabProps>[] {
    return Children.toArray(children).map((child) => {
        if (!isTab(child)) throw new Error('Tabs takes only <Tab label="..."> children. Give each Tab a label.');
        return child;
    });
}

export function Tabs({ children }: TabsProps): ReactElement {
    const tabs = tabsOf(children);
    const options = tabs.map((tab) => ({ value: tab.props.label, label: tab.props.label }));
    const [active, setActive] = useState(options[0]?.value ?? '');

    return (
        <Card as="div" size="sm">
            <div className={cn('nice-scroll overflow-x-auto')}>
                <SegmentedControl
                    options={options}
                    value={active}
                    onChange={setActive}
                    size="sm"
                    aria-label="Tabs"
                    className={cn('whitespace-nowrap')}
                />
            </div>
            <div className={cn('mt-3 text-sm/relaxed [&_p]:text-sm/relaxed')}>
                {tabs.map((tab) => (
                    <div key={tab.props.label} hidden={tab.props.label !== active}>
                        {tab}
                    </div>
                ))}
            </div>
        </Card>
    );
}
