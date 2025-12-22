import Button from '@ui/Button';

import CommentExamples from '../comments/CommentExamples';
import CommentParagraphs from '../comments/CommentParagraphs';
import { renderParameterBadge } from '../utils/renderers/renderParameterBadge';

import type { FunctionSignatureModel } from '@lib/docs/types';
import type { ReactElement } from 'react';

function SignatureCard({ signature }: { signature: FunctionSignatureModel }): ReactElement {
    return (
        <article className="card bg-surface-97 shadow-soft space-y-3 p-4 sm:p-5">
            <header className="flex flex-wrap items-center justify-between gap-3">
                {signature.sourceUrl ? (
                    <Button
                        asChild
                        variant="ghost"
                        size="icon"
                        className="border-border/80 text-subtle h-10 w-10 shrink-0 rounded-xl border transition hover:text-(--text)"
                        aria-label="Open source in a new tab"
                    ></Button>
                ) : null}
            </header>
            {signature.code.html ? (
                <div className="code-scroll-area panel px-3 py-2 text-xs text-(--text) sm:text-sm">
                    <div className="code-scroll-content" dangerouslySetInnerHTML={{ __html: signature.code.html }} />
                </div>
            ) : (
                <div className="code-scroll-area panel px-3 py-2 text-xs text-(--text) sm:text-sm">
                    <pre className="code-scroll-content whitespace-pre-wrap">{signature.code.text}</pre>
                </div>
            )}
            <CommentParagraphs paragraphs={signature.summary} />
            {signature.parameters.length ? (
                <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-(--text)">Parameters</h4>
                    <ul className="space-y-2">
                        {signature.parameters.map((parameter) => (
                            <li
                                key={parameter.name}
                                className="bg-surface-96 text-subtle rounded-lg border border-(--border)/60 p-3 text-sm"
                            >
                                <div className="flex flex-wrap items-start justify-between gap-2">
                                    {renderParameterBadge(parameter)}
                                    {parameter.display?.html ? (
                                        <div
                                            className="surface-chip px-2 py-0.5 text-xs text-(--text)"
                                            dangerouslySetInnerHTML={{ __html: parameter.display.html }}
                                        />
                                    ) : parameter.display?.text ? (
                                        <code className="surface-chip px-2 py-0.5 text-xs text-(--text)">
                                            {parameter.display.text}
                                        </code>
                                    ) : parameter.type ? (
                                        <code className="surface-chip px-2 py-0.5 text-xs text-(--text)">
                                            {parameter.type}
                                        </code>
                                    ) : null}
                                </div>
                                {parameter.defaultValue ? (
                                    <p className="text-subtle mt-2 text-xs">
                                        Default value: <span className="font-mono">{parameter.defaultValue}</span>
                                    </p>
                                ) : null}
                                {parameter.documentation.length ? (
                                    <div className="text-subtle mt-2 text-sm">
                                        <CommentParagraphs paragraphs={parameter.documentation} />
                                    </div>
                                ) : null}
                            </li>
                        ))}
                    </ul>
                </div>
            ) : null}
            {signature.examples.length ? <CommentExamples examples={signature.examples} /> : null}
            {signature.throws?.length ? (
                <div>
                    <p className="text-subtle flex flex-wrap items-baseline gap-2">
                        <span className="font-semibold text-(--text)">Throws:</span>
                    </p>
                    <CommentParagraphs paragraphs={signature.throws} />
                </div>
            ) : null}
        </article>
    );
}

export default SignatureCard;
