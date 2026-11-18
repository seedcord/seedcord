import { TextDisplayBuilder } from '@discordjs/builders';

import { translateSerializationError } from './translateSerialization';

import type { ModalLike } from './BaseReplySender';
import type { ReplyResponse } from '@seedcord/types';
import type { APIMessageTopLevelComponent, APIModalInteractionResponseCallbackData } from 'discord-api-types/v10';

export interface SerializedReply<TNative = never> {
    readonly components: APIMessageTopLevelComponent[];
    readonly allowedMentions?: ReplyResponse['allowedMentions'];
    readonly files?: ReplyResponse<TNative>['files'];
}

// untyped code can pass null, and a null-prototype value doesn't have a constructor
function builderName(value: unknown, fallback: string): string {
    if (typeof value !== 'object' || value === null) return fallback;
    const ctor: unknown = Reflect.get(value, 'constructor');
    const name = typeof ctor === 'function' ? ctor.name : '';
    return name === '' || name === 'Object' ? fallback : name;
}

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
            return 'toJSON' in component ? component.toJSON() : component;
        } catch (error) {
            throw translateSerializationError(error, builderName(component, 'component'), index, routeId);
        }
    });

    return {
        components,
        ...(response.allowedMentions && { allowedMentions: response.allowedMentions }),
        ...(response.files && { files: response.files })
    };
}

export function serializeModal(modal: ModalLike, routeId: string): APIModalInteractionResponseCallbackData {
    try {
        return modal.toJSON();
    } catch (error) {
        throw translateSerializationError(error, builderName(modal, 'modal'), 0, routeId);
    }
}
