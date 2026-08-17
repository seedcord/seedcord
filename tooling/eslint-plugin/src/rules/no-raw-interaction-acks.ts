import { classInstanceType, extendsDjsType, extendsSeedcordType, forEachSeedcordImport } from '@seedcord/eslint-utils';
import { AST_NODE_TYPES, ESLintUtils } from '@typescript-eslint/utils';

import { createRule } from '../createRule';

import type { TSESTree } from '@typescript-eslint/utils';

// InteractionMiddleware extends BaseHandler directly, so this gate excludes it
const HANDLER_GATES = ['InteractionHandler', 'AutocompleteHandler'];

const HANDLER_BASE_NAMES = new Set([
    'InteractionHandler',
    'AutocompleteHandler',
    'ComponentHandler',
    'SlashHandler',
    'ButtonHandler',
    'ModalHandler',
    'SelectMenuHandler',
    'ContextMenuHandler'
]);

const REPLIABLE_INTERACTIONS = new Set([
    'ChatInputCommandInteraction',
    'ButtonInteraction',
    'ModalSubmitInteraction',
    'ContextMenuCommandInteraction',
    'UserContextMenuCommandInteraction',
    'MessageContextMenuCommandInteraction',
    'AnySelectMenuInteraction',
    'StringSelectMenuInteraction',
    'UserSelectMenuInteraction',
    'RoleSelectMenuInteraction',
    'MentionableSelectMenuInteraction',
    'ChannelSelectMenuInteraction'
]);

// autocomplete has no reply/defer, so respond gates on it alone
const AUTOCOMPLETE_INTERACTIONS = new Set(['AutocompleteInteraction']);

const ACK_MESSAGES = {
    reply: 'replyMember',
    deferReply: 'deferMember',
    editReply: 'editMember',
    followUp: 'followUpMember',
    deferUpdate: 'deferUpdateMember',
    update: 'updateMember',
    showModal: 'showModalMember',
    fetchReply: 'fetchReply',
    deleteReply: 'deleteReply',
    respond: 'respondMember'
} as const;

function isAckMethod(name: string): name is keyof typeof ACK_MESSAGES {
    return name in ACK_MESSAGES;
}

export default createRule({
    name: 'no-raw-interaction-acks',
    meta: {
        type: 'problem',
        docs: {
            description:
                'Disallow raw discord.js ack calls on a handler interaction. Reply through the base-class members.'
        },
        messages: {
            replyMember: 'Reply through this.reply().',
            deferMember: 'Defer through this.defer().',
            editMember: 'Edit the reply through this.edit().',
            followUpMember: 'Follow up through this.followUp().',
            deferUpdateMember: 'Defer the update through this.deferUpdate().',
            updateMember: 'Update through this.update().',
            showModalMember: 'Show the modal through this.showModal().',
            fetchReply: 'Read the sent message from the return of the reply members.',
            deleteReply: 'Delete through this.delete().',
            respondMember: 'Respond through this.respond().'
        },
        schema: []
    },
    defaultOptions: [],
    create(context) {
        const services = ESLintUtils.getParserServices(context);
        const checker = services.program.getTypeChecker();
        const bases = new Set<string>();
        const classStack: boolean[] = [];

        function isHandlerClass(node: TSESTree.ClassDeclaration | TSESTree.ClassExpression): boolean {
            if (node.superClass?.type === AST_NODE_TYPES.Identifier && bases.has(node.superClass.name)) return true;
            const classType = classInstanceType(node, services, checker);
            if (classType === undefined) return false;
            return HANDLER_GATES.some((gate) => extendsSeedcordType(checker, classType, gate));
        }

        function enterClass(node: TSESTree.ClassDeclaration | TSESTree.ClassExpression): void {
            const inScope = isHandlerClass(node);
            if (inScope && node.abstract && node.id) bases.add(node.id.name);
            classStack.push(inScope);
        }

        function exitClass(): void {
            classStack.pop();
        }

        return {
            ImportDeclaration(node) {
                forEachSeedcordImport(node, (imported, local) => {
                    if (HANDLER_BASE_NAMES.has(imported)) bases.add(local);
                });
            },
            ClassDeclaration: enterClass,
            'ClassDeclaration:exit': exitClass,
            ClassExpression: enterClass,
            'ClassExpression:exit': exitClass,
            CallExpression(node) {
                if (classStack.at(-1) !== true) return;
                if (node.callee.type !== AST_NODE_TYPES.MemberExpression || node.callee.computed) return;
                if (node.callee.property.type !== AST_NODE_TYPES.Identifier) return;

                const method = node.callee.property.name;
                if (!isAckMethod(method)) return;

                const receivers = method === 'respond' ? AUTOCOMPLETE_INTERACTIONS : REPLIABLE_INTERACTIONS;
                const receiverType = services.getTypeAtLocation(node.callee.object);
                if (!extendsDjsType(checker, receiverType, receivers)) return;

                context.report({ node, messageId: ACK_MESSAGES[method] });
            }
        };
    }
});
