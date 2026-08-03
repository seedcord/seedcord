import { extendsDjsType, methodName } from '@seedcord/eslint-utils';
import { AST_NODE_TYPES, ESLintUtils } from '@typescript-eslint/utils';

import { createRule } from '../createRule';

// client meta and lifecycle events, plus interactionCreate (routed through the interaction dispatcher).
// a raw client.on for these is allowed.
const NON_GATEWAY_EVENTS = new Set([
    'ready',
    'clientReady',
    'error',
    'warn',
    'debug',
    'cacheSweep',
    'invalidated',
    'shardReady',
    'shardDisconnect',
    'shardError',
    'shardReconnecting',
    'shardResume',
    'interactionCreate'
]);

// on/once and the EventEmitter aliases the Client inherits, all register a listener
const REGISTER_METHODS = new Set(['on', 'once', 'addListener', 'prependListener', 'prependOnceListener']);

export default createRule({
    name: 'no-raw-client-events',
    meta: {
        type: 'problem',
        docs: {
            description: 'Disallow raw client.on handlers for gateway events. Route them through @RegisterEvent.'
        },
        messages: {
            rawEvent:
                'Handle this gateway event with a @RegisterEvent handler. A raw client.on bypasses the event dispatcher and its middleware.'
        },
        schema: []
    },
    defaultOptions: [],
    create(context) {
        const services = ESLintUtils.getParserServices(context);
        const checker = services.program.getTypeChecker();

        return {
            CallExpression(node) {
                const method = methodName(node);
                if (method === undefined || !REGISTER_METHODS.has(method)) return;
                if (node.callee.type !== AST_NODE_TYPES.MemberExpression) return;

                const receiverType = services.getTypeAtLocation(node.callee.object);
                if (!extendsDjsType(checker, receiverType, 'Client')) return;

                const eventArg = node.arguments[0];
                if (!eventArg || eventArg.type === AST_NODE_TYPES.SpreadElement) return;

                // a string literal and an Events enum member both resolve to the same string literal type
                const eventType = services.getTypeAtLocation(eventArg);

                if (eventType.isStringLiteral()) {
                    if (!NON_GATEWAY_EVENTS.has(eventType.value)) context.report({ node, messageId: 'rawEvent' });
                    return;
                }

                // conservative: skip if any member is dynamic or a non-gateway event
                if (
                    eventType.isUnionOrIntersection() &&
                    eventType.types.every((m) => m.isStringLiteral() && !NON_GATEWAY_EVENTS.has(m.value))
                ) {
                    context.report({ node, messageId: 'rawEvent' });
                }
            }
        };
    }
});
