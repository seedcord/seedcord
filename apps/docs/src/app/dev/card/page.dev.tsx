import { Card, CardBody, CardDescription, CardFooter, CardHeader, CardTitle, cn } from '@seedcord/ui';

import type { ReactElement } from 'react';

function DevSection({ title, children }: { title: string; children: ReactElement | ReactElement[] }): ReactElement {
    return (
        <section className={cn('space-y-3')}>
            <h2 className={cn('text-subtle text-xs font-semibold tracking-widest uppercase')}>{title}</h2>
            {children}
        </section>
    );
}

function CardPage(): ReactElement {
    return (
        <div className={cn('space-y-10')}>
            <header className={cn('space-y-2')}>
                <h1 className={cn('text-2xl font-semibold tracking-tight text-(--text)')}>Card</h1>
                <p className={cn('text-subtle text-sm')}>
                    Flat compound. Polymorphic via `as` prop (default `&lt;div&gt;`). Variants: default (with soft
                    shadow) + flat (no shadow). Sizes: none / sm / md / lg (controls outer padding). Subcomponents:
                    CardHeader, CardBody, CardFooter, CardTitle, CardDescription.
                </p>
            </header>
            <DevSection title="Default variant, size matrix">
                <div className={cn('grid gap-4 md:grid-cols-2')}>
                    <Card size="sm">
                        <CardTitle>size=&quot;sm&quot;</CardTitle>
                        <CardDescription>12px padding.</CardDescription>
                    </Card>
                    <Card size="md">
                        <CardTitle>size=&quot;md&quot;</CardTitle>
                        <CardDescription>16px padding (default).</CardDescription>
                    </Card>
                    <Card size="lg">
                        <CardTitle>size=&quot;lg&quot;</CardTitle>
                        <CardDescription>24px padding.</CardDescription>
                    </Card>
                    <Card size="none" className={cn('p-4')}>
                        <CardTitle>size=&quot;none&quot;</CardTitle>
                        <CardDescription>caller controls all padding via className.</CardDescription>
                    </Card>
                </div>
            </DevSection>
            <DevSection title="Flat variant (no shadow)">
                <Card variant="flat" size="md">
                    <CardTitle>variant=&quot;flat&quot;</CardTitle>
                    <CardDescription>Same surface + border, no soft shadow. Useful for nested cards.</CardDescription>
                </Card>
            </DevSection>
            <DevSection title="Compound layout">
                <Card>
                    <CardBody>
                        <CardHeader>
                            <CardTitle>API documentation</CardTitle>
                            <CardDescription>Public symbols extracted from the package manifest.</CardDescription>
                        </CardHeader>
                        <p className={cn('text-sm text-(--text)')}>
                            Body content sits inside <code>CardBody</code> which is just a `space-y-3` wrapper. The
                            header above stacks title + description with `gap-1.5`.
                        </p>
                        <CardFooter>
                            <span className={cn('text-subtle text-xs')}>v0.10.6 · last published 2 days ago</span>
                        </CardFooter>
                    </CardBody>
                </Card>
            </DevSection>
            <DevSection title='Polymorphic (as="section")'>
                <Card as="section" size="md">
                    <CardTitle>Card rendered as &lt;section&gt;</CardTitle>
                    <CardDescription>Useful for landmark semantics on pages.</CardDescription>
                </Card>
            </DevSection>
        </div>
    );
}

export default CardPage;
