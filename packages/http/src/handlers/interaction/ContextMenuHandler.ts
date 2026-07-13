import { InteractionHandler } from '@handlers/interaction/InteractionHandler';

import type { APIContextMenuInteraction } from 'discord-api-types/v10';

/**
 * Base class for a context-menu command handler on the HTTP transport (right-click a user or a message).
 *
 * Read the right-clicked entity off `this.event.data`. Reply through the handler members.
 */
export abstract class ContextMenuHandler extends InteractionHandler<APIContextMenuInteraction> {}
