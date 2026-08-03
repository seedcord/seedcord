import { TextDisplayBuilder } from '@discordjs/builders';

import { translateSerializationError } from './translateSerialization';

import type { ReplyResponse } from '@seedcord/types';
import type { APIMessageTopLevelComponent } from 'discord-api-types/v10';

/** Serialized message data the transport wire writers consume. */
export interface SerializedReply<TNative = never> {
    readonly components: APIMessageTopLevelComponent[];
    readonly allowedMentions?: ReplyResponse['allowedMentions'];
    readonly files?: ReplyResponse<TNative>['files'];
}

/** Wraps a string in a TextDisplay component. */
export function serializeReply<TNative>(
    response: ReplyResponse<TNative> | string,
    routeId: string
): SerializedReply<TNative> {
    if (typeof response === 'string') {
        try {
            return { components: [new TextDisplayBuilder().setContent(response).toJSON()] };
        } catch (error) {
            throw translateSerializationError(error, 'TextDisplayBuilder', 0, routeId);
        }
    }

    const components = response.components.map((component, index) => {
        try {
            return component.toJSON();
        } catch (error) {
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- a null-prototype value has no constructor at runtime
            const name = component.constructor?.name;
            throw translateSerializationError(error, !name || name === 'Object' ? 'component' : name, index, routeId);
        }
    });

    return {
        components,
        ...(response.allowedMentions && { allowedMentions: response.allowedMentions }),
        ...(response.files && { files: response.files })
    };
}
