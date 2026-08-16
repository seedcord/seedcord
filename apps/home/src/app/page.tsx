import { BeforeAfter } from '#components/home/BeforeAfter';
import { Codec } from '#components/home/Codec';
import { DevTui } from '#components/home/DevTui';
import { FeatureGrid } from '#components/home/FeatureGrid';
import { Footer } from '#components/home/Footer';
import { Gates } from '#components/home/Gates';
import { GetStarted } from '#components/home/GetStarted';
import { Hero } from '#components/home/Hero';
import { FeatureMarquee } from '#components/home/Marquee';
import { Nav } from '#components/home/Nav';
import { ResolvedType } from '#components/home/ResolvedType';
import { TypedDx } from '#components/home/TypedDx';
import { SlashCommand } from '#components/SlashCommand';
import { FEATURES } from '#lib/features';

import type { ReactNode } from 'react';

function Home(): ReactNode {
    return (
        <>
            <Nav />
            <main id="main-content">
                <Hero />
                <FeatureMarquee items={FEATURES} />
                <TypedDx />
                <ResolvedType />
                <BeforeAfter />
                <Codec />
                <Gates />
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
