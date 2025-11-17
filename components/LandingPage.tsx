import React from 'react';
import { LogoIcon, WardrobeIcon, StyleIcon, EnhanceIcon } from './icons';
import ThemeSwitcher from './ThemeSwitcher';

interface LandingPageProps {
    onGetStarted: () => void;
}

const FeatureCard: React.FC<{ icon: React.ReactNode; title: string; children: React.ReactNode }> = ({ icon, title, children }) => (
    <div className="bg-card/50 backdrop-blur-sm border border-border p-6 rounded-xl text-center flex flex-col items-center">
        <div className="w-12 h-12 bg-primary/20 text-primary rounded-lg flex items-center justify-center mb-4">
            {icon}
        </div>
        <h3 className="text-xl font-bold mb-2 text-card-foreground">{title}</h3>
        <p className="text-foreground/80">{children}</p>
    </div>
);

const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted }) => {
    return (
        <div className="min-h-screen bg-background text-foreground animate-fadeIn">
            
            <header className="sticky top-0 z-10 p-4 bg-background/80 backdrop-blur-sm border-b border-border/50">
                <div className="max-w-6xl mx-auto flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                        <LogoIcon className="h-8 w-8 text-primary" />
                        <span className="text-2xl font-serif font-bold">Chroma</span>
                    </div>
                    <div className="flex items-center space-x-4">
                        <ThemeSwitcher />
                        <button onClick={onGetStarted} className="px-4 py-2 bg-input text-foreground rounded-lg hover:bg-border transition-colors text-sm font-semibold">
                            Sign In
                        </button>
                    </div>
                </div>
            </header>

            <main className="relative z-0">
                <section className="text-center py-20 px-4">
                    <h1 className="font-serif font-bold text-5xl md:text-7xl tracking-tight mb-4 text-foreground">
                        Rediscover Your Style.
                    </h1>
                    <p className="max-w-3xl mx-auto text-lg md:text-xl text-foreground/80 mb-8">
                        Your personal fashion assistant, powered by AI. Effortlessly catalog your wardrobe, get daily outfit recommendations, and enhance your look.
                    </p>
                    <button onClick={onGetStarted} className="px-8 py-4 bg-primary text-primary-foreground font-bold rounded-lg shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all transform active:scale-95 text-lg">
                        Get Started for Free
                    </button>
                </section>

                <section className="py-20 px-4">
                    <div className="max-w-6xl mx-auto">
                        <h2 className="text-4xl font-serif font-bold text-center mb-12">How It Works</h2>
                        <div className="grid md:grid-cols-3 gap-8">
                            <FeatureCard icon={<WardrobeIcon className="w-6 h-6"/>} title="1. Analyze & Catalog">
                                Simply upload photos of your clothes. Our AI analyzes each item, automatically categorizing it by type, color, and style.
                            </FeatureCard>
                             <FeatureCard icon={<StyleIcon className="w-6 h-6"/>} title="2. Get Styled">
                                Receive personalized, daily outfit suggestions based on your wardrobe, the weather, and the occasion. Never wonder what to wear again.
                            </FeatureCard>
                             <FeatureCard icon={<EnhanceIcon className="w-6 h-6"/>} title="3. Enhance & Evolve">
                                Get smart suggestions on what to discard and what to buy to complement your existing collection, keeping your style fresh and modern.
                            </FeatureCard>
                        </div>
                    </div>
                </section>
            </main>
            
            <footer className="text-center py-8 px-4 border-t border-border">
                <p className="text-foreground/60">&copy; {new Date().getFullYear()} Chroma. All rights reserved.</p>
            </footer>
        </div>
    );
};

export default LandingPage;