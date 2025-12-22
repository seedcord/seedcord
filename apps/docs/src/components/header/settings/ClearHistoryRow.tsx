import { Trash2 } from 'lucide-react';

import { clearDocsHistory } from '@lib/settings/clearHistory';
import Button from '@ui/Button';
import Icon from '@ui/Icon';

import SettingsRow from './SettingsRow';

import type { ReactElement } from 'react';

function ClearHistoryRow(): ReactElement {
    const handleClear = (): void => {
        clearDocsHistory();
    };

    return (
        <SettingsRow title="Clear history" subtitle="Delete cached site navigation settings">
            <Button variant="ghost" size="icon" onClick={handleClear} aria-label="Clear history">
                <Icon icon={Trash2} size={16} />
            </Button>
        </SettingsRow>
    );
}

export default ClearHistoryRow;
