'use client';

import { createContext } from 'react';

// the mobile drawer's content node. popovers rendered inside it (package and version selectors) portal here
// so they anchor to their trigger and stay inside the dialog's focus trap. portaling to document.body leaves
// them mispositioned and inert under the modal dialog.
export const MobilePanelContainerContext = createContext<HTMLElement | null>(null);
