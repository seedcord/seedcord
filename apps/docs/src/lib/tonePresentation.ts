import { tw } from '@seedcord/ui';
import { Braces, FunctionSquare, ListTree, Puzzle, SquareStack, Variable } from 'lucide-react';

import type { EntityTone } from '@seedcord/docs-engine/client';

// The tone taxonomy and resolution logic are defined in @seedcord/docs-engine. This file only maps each tone to its visuals.
const TONE_PRESENTATION = {
    class: {
        icon: SquareStack,
        styles: {
            heading: tw`text-(--tone-class-heading)`,
            dot: tw`bg-(--entity-class)`,
            iconColor: tw`text-(--entity-class)`,
            item: tw`hover:border-(--tone-class-badge-border) hover:bg-(--tone-class-item-bg) focus-visible:outline-(--entity-class)`,
            active: tw`data-[active=true]:border-(--tone-class-badge-border) data-[active=true]:bg-(--tone-class-item-bg)`,
            badge: tw`border-(--tone-class-badge-border) bg-(--tone-class-badge-bg) text-(--entity-class)`,
            tag: tw`border-(--tone-class-badge-border) bg-(--tone-class-tag-bg) text-(--tone-class-tag-text)`,
            accent: tw`text-(--tone-class-heading)`
        }
    },
    interface: {
        icon: Puzzle,
        styles: {
            heading: tw`text-(--tone-interface-heading)`,
            dot: tw`bg-(--entity-interface)`,
            iconColor: tw`text-(--entity-interface)`,
            item: tw`hover:border-(--tone-interface-badge-border) hover:bg-(--tone-interface-item-bg) focus-visible:outline-(--entity-interface)`,
            active: tw`data-[active=true]:border-(--tone-interface-badge-border) data-[active=true]:bg-(--tone-interface-item-bg)`,
            badge: tw`border-(--tone-interface-badge-border) bg-(--tone-interface-badge-bg) text-(--entity-interface)`,
            tag: tw`border-(--tone-interface-badge-border) bg-(--tone-interface-tag-bg) text-(--tone-interface-tag-text)`,
            accent: tw`text-(--tone-interface-heading)`
        }
    },
    type: {
        icon: Braces,
        styles: {
            heading: tw`text-(--tone-type-heading)`,
            dot: tw`bg-(--entity-type)`,
            iconColor: tw`text-(--entity-type)`,
            item: tw`hover:border-(--tone-type-badge-border) hover:bg-(--tone-type-item-bg) focus-visible:outline-(--entity-type)`,
            active: tw`data-[active=true]:border-(--tone-type-badge-border) data-[active=true]:bg-(--tone-type-item-bg)`,
            badge: tw`border-(--tone-type-badge-border) bg-(--tone-type-badge-bg) text-(--entity-type)`,
            tag: tw`border-(--tone-type-badge-border) bg-(--tone-type-tag-bg) text-(--tone-type-tag-text)`,
            accent: tw`text-(--tone-type-heading)`
        }
    },
    function: {
        icon: FunctionSquare,
        styles: {
            heading: tw`text-(--tone-func-heading)`,
            dot: tw`bg-(--entity-function)`,
            iconColor: tw`text-(--entity-function)`,
            item: tw`hover:border-(--tone-func-badge-border) hover:bg-(--tone-func-item-bg) focus-visible:outline-(--entity-function)`,
            active: tw`data-[active=true]:border-(--tone-func-badge-border) data-[active=true]:bg-(--tone-func-item-bg)`,
            badge: tw`border-(--tone-func-badge-border) bg-(--tone-func-badge-bg) text-(--entity-function)`,
            tag: tw`border-(--tone-func-badge-border) bg-(--tone-func-tag-bg) text-(--tone-func-tag-text)`,
            accent: tw`text-(--tone-func-heading)`
        }
    },
    enum: {
        icon: ListTree,
        styles: {
            heading: tw`text-(--tone-enum-heading)`,
            dot: tw`bg-(--entity-enum)`,
            iconColor: tw`text-(--entity-enum)`,
            item: tw`hover:border-(--tone-enum-badge-border) hover:bg-(--tone-enum-item-bg) focus-visible:outline-(--entity-enum)`,
            active: tw`data-[active=true]:border-(--tone-enum-badge-border) data-[active=true]:bg-(--tone-enum-item-bg)`,
            badge: tw`border-(--tone-enum-badge-border) bg-(--tone-enum-badge-bg) text-(--entity-enum)`,
            tag: tw`border-(--tone-enum-badge-border) bg-(--tone-enum-tag-bg) text-(--tone-enum-tag-text)`,
            accent: tw`text-(--tone-enum-heading)`
        }
    },
    variable: {
        icon: Variable,
        styles: {
            heading: tw`text-(--tone-var-heading)`,
            dot: tw`bg-(--entity-variable)`,
            iconColor: tw`text-(--entity-variable)`,
            item: tw`hover:border-(--tone-var-badge-border) hover:bg-(--tone-var-item-bg) focus-visible:outline-(--entity-variable)`,
            active: tw`data-[active=true]:border-(--tone-var-badge-border) data-[active=true]:bg-(--tone-var-item-bg)`,
            badge: tw`border-(--tone-var-badge-border) bg-(--tone-var-badge-bg) text-(--entity-variable)`,
            tag: tw`border-(--tone-var-badge-border) bg-(--tone-var-tag-bg) text-(--tone-var-tag-text)`,
            accent: tw`text-(--tone-var-heading)`
        }
    }
} as const satisfies Record<EntityTone, { icon: typeof SquareStack; styles: Record<string, string> }>;

type EntityToneConfig = (typeof TONE_PRESENTATION)[EntityTone];
export type EntityToneStyle = EntityToneConfig['styles'];

export function getToneConfig(tone: EntityTone): EntityToneConfig {
    return TONE_PRESENTATION[tone];
}
