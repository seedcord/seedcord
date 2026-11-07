import React from 'react';

import { Autocomplete } from './Autocomplete';
import { Checklist } from './Checklist';
import { Confirm } from './Confirm';
import { PickMany } from './PickMany';
import { Select } from './Select';
import { TextInput } from './TextInput';

import type { AutocompletePrompt } from './Autocomplete';
import type { ChecklistPrompt } from './Checklist';
import type { ConfirmPrompt } from './Confirm';
import type { PickManyPrompt } from './PickMany';
import type { SelectPrompt } from './Select';
import type { PasswordPrompt, TextPrompt } from './TextInput';
import type { Outcome } from './usePrompt';
import type { ReactElement } from 'react';

type EndPrompt<Answer> = (outcome: Outcome<Answer>) => void;

export const promptViews = {
    select: <Value extends string>(prompt: SelectPrompt<Value>, onEnd: EndPrompt<Value>): ReactElement => (
        <Select {...prompt} onEnd={onEnd} />
    ),
    confirm: (prompt: ConfirmPrompt, onEnd: EndPrompt<boolean>): ReactElement => <Confirm {...prompt} onEnd={onEnd} />,
    pickMany: <Value extends string>(prompt: PickManyPrompt<Value>, onEnd: EndPrompt<Value[]>): ReactElement => (
        <PickMany {...prompt} onEnd={onEnd} />
    ),
    checklist: <Value extends string>(prompt: ChecklistPrompt<Value>, onEnd: EndPrompt<Value[]>): ReactElement => (
        <Checklist {...prompt} onEnd={onEnd} />
    ),
    autocomplete: <Value extends string>(prompt: AutocompletePrompt<Value>, onEnd: EndPrompt<Value>): ReactElement => (
        <Autocomplete {...prompt} onEnd={onEnd} />
    ),
    text: (prompt: TextPrompt, onEnd: EndPrompt<string>): ReactElement => <TextInput {...prompt} onEnd={onEnd} />,
    password: (prompt: PasswordPrompt, onEnd: EndPrompt<string>): ReactElement => (
        <TextInput {...prompt} masked onEnd={onEnd} />
    )
};
