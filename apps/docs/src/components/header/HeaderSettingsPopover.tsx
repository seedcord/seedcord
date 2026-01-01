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
                    className="text-(--text) transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--outline-accent-b-moderate)"
                >
                    <Icon icon={Settings} size={18} />
                </Button>
            </Popover.Trigger>
            <Popover.Portal>
                <Popover.Content
                    sideOffset={12}
                    align="end"
                    className="card shadow-soft w-64 bg-(--bg-popover) p-4 text-sm text-(--text)"
                >
                    <div className="mt-2">
                        <ClearHistoryRow />
                    </div>

                    <Popover.Arrow className="fill-(--bg-popover)" />
                </Popover.Content>
            </Popover.Portal>
        </Popover.Root>
    );
}

export default HeaderSettingsPopover;
