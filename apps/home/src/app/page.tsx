import { BeforeAfter } from '#components/home/BeforeAfter.tsx';
import { Codec } from '#components/home/Codec.tsx';
import { DevTui } from '#components/home/DevTui.tsx';
import { FeatureGrid } from '#components/home/FeatureGrid.tsx';
import { Footer } from '#components/home/Footer.tsx';
import { Gates } from '#components/home/Gates.tsx';
import { GetStarted } from '#components/home/GetStarted.tsx';
import { Hero } from '#components/home/Hero.tsx';
import { FeatureMarquee } from '#components/home/Marquee.tsx';
import { Nav } from '#components/home/Nav.tsx';
import { Plugins } from '#components/home/Plugins.tsx';
import { ResolvedType } from '#components/home/ResolvedType.tsx';
import { Targets } from '#components/home/Targets.tsx';
import { Transports } from '#components/home/Transports.tsx';
import { TypedDx } from '#components/home/TypedDx.tsx';
import { Vite } from '#components/home/Vite.tsx';
import { SlashCommand } from '#components/SlashCommand.tsx';
import { FEATURES } from '#lib/features.ts';
import { HOME_PREVIEW } from '#lib/linkPreview.ts';
import { MAIN_CONTENT_ID } from '@seedcord/ui';
import { PreviewCard } from '@seedcord/ui/LinkPreview';
import { ComponentEmbed } from 'discord-component-embed/react';

import type { ReactNode } from 'react';

function Home(): ReactNode {
    return (
        <>
            <ComponentEmbed>
                <PreviewCard {...HOME_PREVIEW} />
            </ComponentEmbed>
            <Nav />
            <main id={MAIN_CONTENT_ID}>
                <Hero />
                <FeatureMarquee items={FEATURES} />
                <TypedDx />
                <ResolvedType />
                <BeforeAfter />
                <Vite />
                <Transports />
                <Targets />
                <Codec />
                <Gates />
                <Plugins />
                <DevTui />
                <FeatureGrid />
                <GetStarted />
            </main>
            <Footer />
            <SlashCommand />
        </>
    );
}

export default Home;
