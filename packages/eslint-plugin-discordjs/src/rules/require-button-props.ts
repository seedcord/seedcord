import {
    constructorData,
    enclosingChainTop,
    extendsDjsType,
    collectChain,
    isFromDiscordJs,
    methodName,
    outermostAssertion,
    staticNumber
} from '@seedcord/eslint-utils';
import { AST_NODE_TYPES, ESLintUtils } from '@typescript-eslint/utils';

import { gatherFacts, knownStyle, LINK, PREMIUM, STYLE_NAMES } from '../buttons';
import { createRule } from '../createRule';

import type { ButtonFacts } from '../buttons';
import type { ParserServicesWithTypeInformation, TSESLint, TSESTree } from '@typescript-eslint/utils';
import type * as ts from 'typescript';

interface TypeInfo {
    services: ParserServicesWithTypeInformation;
    checker: ts.TypeChecker;
    sourceCode: TSESLint.SourceCode;
}

// discord.js's own methods read a builder argument without adding props to it
function isDjsConsumption(call: TSESTree.CallExpression, arg: TSESTree.Expression, info: TypeInfo): boolean {
    if (call.callee.type !== AST_NODE_TYPES.MemberExpression) return false;
    if (!call.arguments.includes(arg)) return false;
    return isFromDiscordJs(info.services.getTypeAtLocation(call.callee.object).getSymbol());
}

// the setter calls that a single read adds, [] for plain consumption, undefined when the builder
// escapes somewhere props could still be added
function referenceCalls(id: TSESTree.Identifier, info: TypeInfo): TSESTree.CallExpression[] | undefined {
    const top = enclosingChainTop(id);
    if (top !== id && top.type === AST_NODE_TYPES.CallExpression) {
        const calls = collectChain(top);
        // a setter chain returns the builder itself, so its result must be dropped or consumed,
        // never bound where props could still be added
        if (!extendsDjsType(info.checker, info.services.getTypeAtLocation(top), 'ButtonBuilder')) return calls;
        const sealed = outermostAssertion(top);
        if (sealed.parent.type === AST_NODE_TYPES.ExpressionStatement) return calls;
        if (sealed.parent.type === AST_NODE_TYPES.CallExpression && isDjsConsumption(sealed.parent, sealed, info)) {
            return calls;
        }
        return undefined;
    }
    const wrapped = outermostAssertion(id);
    if (wrapped.parent.type === AST_NODE_TYPES.CallExpression && isDjsConsumption(wrapped.parent, wrapped, info)) {
        // a from() source is a template, its copies carry the completion
        return methodName(wrapped.parent) === 'from' ? undefined : [];
    }
    // exporting an incomplete builder is flagged deliberately, cross-module completion mutates a
    // shared instance and stays out of scope
    if (
        id.parent.type === AST_NODE_TYPES.ExportSpecifier ||
        id.parent.type === AST_NODE_TYPES.ExportDefaultDeclaration
    ) {
        return [];
    }
    return undefined;
}

// setter calls from every later statement that reads the variable, or undefined when the builder
// escapes through a reference
function completionCalls(
    declarator: TSESTree.VariableDeclarator,
    info: TypeInfo
): TSESTree.CallExpression[] | undefined {
    const variable = info.sourceCode.getDeclaredVariables(declarator)[0];
    if (variable === undefined) return undefined;

    const chains: TSESTree.CallExpression[][] = [];
    for (const ref of variable.references) {
        if (ref.init) continue;
        if (ref.isWrite() || ref.identifier.type !== AST_NODE_TYPES.Identifier) return undefined;
        const calls = referenceCalls(ref.identifier, info);
        if (calls === undefined) return undefined;
        chains.push(calls);
    }
    // reversed so gatherFacts reads the last statement's calls first, matching run order
    return chains.reverse().flat();
}

// the calls that run on the finished value, or undefined when later code could still add props
function reachableCalls(
    top: TSESTree.CallExpression | TSESTree.NewExpression,
    info: TypeInfo
): TSESTree.CallExpression[] | undefined {
    const calls = top.type === AST_NODE_TYPES.CallExpression ? collectChain(top) : [];
    const sealed = outermostAssertion(top);
    const parent = sealed.parent;
    if (parent.type === AST_NODE_TYPES.VariableDeclarator && parent.id.type === AST_NODE_TYPES.Identifier) {
        const later = completionCalls(parent, info);
        return later === undefined ? undefined : [...later, ...calls];
    }
    if (parent.type === AST_NODE_TYPES.ExpressionStatement) return calls;
    if (parent.type === AST_NODE_TYPES.CallExpression && isDjsConsumption(parent, sealed, info)) return calls;
    return undefined;
}

export default createRule({
    name: 'require-button-props',
    meta: {
        type: 'problem',
        docs: {
            description: 'Require every prop the button style must carry before the payload reaches Discord.'
        },
        messages: {
            missingStyle: 'A button requires a style. Discord rejects one without it.',
            missingUrl: 'A Link button requires a url.',
            missingSkuId: 'A Premium button requires a skuId.',
            missingCustomId: 'A {{style}} button requires a customId.',
            missingLabel: 'A {{style}} button requires a label or an emoji.'
        },
        schema: []
    },
    defaultOptions: [],
    create(context) {
        const services = ESLintUtils.getParserServices(context);
        const info: TypeInfo = { services, checker: services.program.getTypeChecker(), sourceCode: context.sourceCode };

        function reportMissing(anchor: TSESTree.Node, style: number, facts: ButtonFacts): void {
            const { props } = facts;
            if (style === PREMIUM) {
                if (!props.has('skuId')) context.report({ node: anchor, messageId: 'missingSkuId' });
                return;
            }
            if (style === LINK && !props.has('url')) {
                context.report({ node: anchor, messageId: 'missingUrl' });
            }
            if (style < LINK && !props.has('customId')) {
                context.report({ node: anchor, messageId: 'missingCustomId', data: { style: STYLE_NAMES[style] } });
            }
            // builders reject a label-less, emoji-less non-premium button at toJSON
            if (!props.has('label') && !props.has('emoji')) {
                context.report({ node: anchor, messageId: 'missingLabel', data: { style: STYLE_NAMES[style] } });
            }
        }

        return {
            NewExpression(node) {
                // a bare discord.js ButtonBuilder construction is the only root that shows every
                // prop the button will carry, so subclasses and .from() copies stay out
                const type = services.getTypeAtLocation(node);
                if (!isFromDiscordJs(type.getSymbol()) || !extendsDjsType(info.checker, type, 'ButtonBuilder')) return;

                // an unreadable data argument can carry any prop, and so can a spread inside it
                const data = constructorData(node);
                if (node.arguments.length > 0 && data === undefined) return;
                if (data?.properties.some((p) => p.type === AST_NODE_TYPES.SpreadElement) === true) return;

                // where the finished value lands decides whether later code can still add props
                const top = enclosingChainTop(node);
                const calls = reachableCalls(top, info);
                if (calls === undefined) return;

                const facts = gatherFacts(calls, data);
                if (facts.styleSource === undefined) {
                    context.report({ node: top, messageId: 'missingStyle' });
                    return;
                }
                // a style that is set but not static (or outside the wire range) keeps the
                // requirements unknowable
                const style = knownStyle(staticNumber(facts.styleSource, services));
                if (style === undefined) return;

                reportMissing(top, style, facts);
            }
        };
    }
});
