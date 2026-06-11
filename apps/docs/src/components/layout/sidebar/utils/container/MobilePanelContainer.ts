'use client';

import { createContext } from 'react';

// The mobile nav drawer's content node. Popovers rendered inside the drawer (the package and version selectors)
// portal here so they anchor to their trigger and stay inside the Dialog's focus trap, rather than landing on
// document.body where the modal Dialog leaves them mispositioned and inert.
export const MobilePanelContainerContext = createContext<HTMLElement | null>(null);
