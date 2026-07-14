import { classInstanceType, extendsDjsType, extendsSeedcordType, forEachSeedcordImport } from '@seedcord/eslint-utils';
import { AST_NODE_TYPES, ESLintUtils } from '@typescript-eslint/utils';

import { createRule } from '../createRule';

import type { TSESTree } from '@typescript-eslint/utils';

// AutocompleteHandler and InteractionMiddleware extend BaseHandler directly, so this gate excludes both
const HANDLER_GATE = 'InteractionHandler';

// literal superclass names, matched before falling back to the type checker
const HANDLER_BASE_NAMES = new Set([
    'InteractionHandler',
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

const ACK_MESSAGES = {
    reply: 'replyMember',
    deferReply: 'deferMember',
    editReply: 'editMember',
    followUp: 'followUpMember',
    deferUpdate: 'deferUpdateMember',
    update: 'updateMember',
    showModal: 'showModalMember',
    fetchReply: 'fetchReply',
    deleteReply: 'deleteReply'
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
            deleteReply: 'Delete through this.delete().'
        },
        schema: []
    },
    defaultOptions: [],
    create(context) {
        const services = ESLintUtils.getParserServices(context);
        const checker = services.program.getTypeChecker();
        const bases = new Set<string>();
        // true inside an InteractionHandler subclass
        const classStack: boolean[] = [];

        function isHandlerClass(node: TSESTree.ClassDeclaration | TSESTree.ClassExpression): boolean {
            if (node.superClass?.type === AST_NODE_TYPES.Identifier && bases.has(node.superClass.name)) return true;
            const classType = classInstanceType(node, services, checker);
            return classType !== undefined && extendsSeedcordType(checker, classType, HANDLER_GATE);
        }

        function enterClass(node: TSESTree.ClassDeclaration | TSESTree.ClassExpression): void {
            const inScope = isHandlerClass(node);
            // lets a same-file subclass hit the fast bases.has path and skip the type checker
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

                const receiverType = services.getTypeAtLocation(node.callee.object);
                if (!extendsDjsType(checker, receiverType, REPLIABLE_INTERACTIONS)) return;

                context.report({ node, messageId: ACK_MESSAGES[method] });
            }
        };
    }
});
