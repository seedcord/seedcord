'use client';

import * as Popover from '@radix-ui/react-popover';
import { Settings } from 'lucide-react';

import Button from '@ui/Button';
import Icon from '@ui/Icon';

import ClearHistoryRow from './settings/ClearHistoryRow';

import type { ReactElement } from 'react';

function HeaderSettingsPopover(): ReactElement {
    return (
        <Popover.Root>
            <Popover.Trigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Open documentation settings"
                    className="text-(--text) transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color-mix(in_oklab,var(--accent-b)_42%,transparent)]"
                >
                    <Icon icon={Settings} size={18} />
                </Button>
            </Popover.Trigger>
            <Popover.Portal>
                <Popover.Content
                    sideOffset={12}
                    align="end"
                    className="card shadow-soft w-64 bg-[color-mix(in_oklab,var(--bg)_98%,#070917_2%)] p-4 text-sm text-(--text)"
                >
                    <div className="mt-2">
                        <ClearHistoryRow />
                    </div>

                    <Popover.Arrow className="fill-[color-mix(in_oklab,var(--bg)_98%,#070917_2%)]" />
                </Popover.Content>
            </Popover.Portal>
        </Popover.Root>
    );
}

export default HeaderSettingsPopover;
