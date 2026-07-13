import { TextDisplayBuilder } from '@discordjs/builders';

import { translateSerializationError } from './translateSerialization';

import type { ReplyResponse } from '@seedcord/types';
import type { APIMessageTopLevelComponent } from 'discord-api-types/v10';

/** Serialized message data the transport wire writers consume. */
export interface SerializedReply {
    readonly components: APIMessageTopLevelComponent[];
    readonly allowedMentions?: ReplyResponse['allowedMentions'];
    readonly files?: ReplyResponse['files'];
}

/** Wraps a string in a TextDisplay component. */
export function serializeReply(response: ReplyResponse | string, routeId: string): SerializedReply {
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
            // a null-prototype value has no constructor
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
