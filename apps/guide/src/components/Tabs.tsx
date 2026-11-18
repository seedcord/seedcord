'use client';

import { Card, SegmentedControl, cn, segmentIds } from '@seedcord/ui';
import { Children, isValidElement, useId, useState } from 'react';

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

interface TabPanelProps {
    prefix: string;
    index: number;
    hidden: boolean;
    children: ReactNode;
}

function TabPanel({ prefix, index, hidden, children }: TabPanelProps): ReactElement {
    const ids = segmentIds(prefix, index);
    return (
        <div id={ids.panel} role="tabpanel" aria-labelledby={ids.tab} hidden={hidden}>
            {children}
        </div>
    );
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
    const prefix = useId();

    return (
        <Card as="div" size="sm">
            <div className={cn('nice-scroll overflow-x-auto')}>
                <SegmentedControl
                    options={options}
                    value={active}
                    onChange={setActive}
                    size="sm"
                    aria-label="Tabs"
                    tabsPrefix={prefix}
                    className={cn('whitespace-nowrap')}
                />
            </div>
            <div className={cn('mt-3 text-sm/relaxed [&_p]:text-sm/relaxed')}>
                {tabs.map((tab, index) => (
                    <TabPanel key={tab.props.label} prefix={prefix} index={index} hidden={tab.props.label !== active}>
                        {tab}
                    </TabPanel>
                ))}
            </div>
        </Card>
    );
}
