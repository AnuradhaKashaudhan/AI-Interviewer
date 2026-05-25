import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const LandingPage = () => {
    const navigate = useNavigate();

    useEffect(() => {
        // Intersection Observer for Entrance Animations
        const observerOptions = {
            threshold: 0.15,
            rootMargin: '0px 0px -50px 0px'
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('active');
                }
            });
        }, observerOptions);

        document.querySelectorAll('.reveal').forEach(el => {
            observer.observe(el);
        });

        // Cleanup
        return () => observer.disconnect();
    }, []);

    const scrollToSection = (e, targetId) => {
        e.preventDefault();
        const target = document.querySelector(targetId);
        if (target) {
            target.scrollIntoView({ behavior: 'smooth' });
        }
    };

    return (
        <div className="dark font-body text-on-surface antialiased overflow-x-hidden no-scrollbar bg-background">
            {/* TopAppBar */}
            <header className="fixed top-0 w-full z-50 bg-surface/70 backdrop-blur-xl border-b border-outline-variant/30">
                <div className="flex justify-between items-center px-6 py-4 max-w-7xl mx-auto">
                    <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary-container" style={{ fontVariationSettings: "'FILL' 1" }}>neurology</span>
                        <span className="font-headline font-bold text-xl bg-clip-text text-transparent bg-gradient-to-r from-primary-container to-secondary-fixed">NEURALINTERVIEW</span>
                    </div>
                    <button onClick={() => navigate('/interview')} className="bg-primary-container text-on-primary px-4 py-2 rounded-lg font-label text-label-sm font-semibold transition-transform duration-200 active:scale-95 glow-active">
                        Get Started
                    </button>
                </div>
            </header>

            <main className="pt-20">
                {/* Hero Section */}
                <section className="relative px-6 py-16 flex flex-col items-center text-center overflow-hidden min-h-[795px] justify-center">
                    {/* Background Ambience */}
                    <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
                        <div className="bg-ambience absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-[#b026ff]/10 rounded-full blur-[120px]"></div>
                        <div className="bg-ambience absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-[#00f0ff]/10 rounded-full blur-[120px] [animation-delay:-5s]"></div>
                        <img alt="AI Background" className="w-full h-full object-cover mix-blend-overlay opacity-30 scale-110" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDUc7aFmdQ1gSM-_4P_MVJ030ENbABPSOVFsG442wPM0tXyWoNg1Gb7R8IA98IM3i8UlU0xfQwx17VGpCHx5mFuIjNqYp_LMXS7P0anbKQYZp06qz5tiQLAClRAYmJeN-AVv31rI0zA84XDig5i7djU5jOREyNjQPM9eQ_CmkpnCkStNkhGCXgAkJrE8tkflaR6oxzPP6njBX2khbrWa5jwrkcUg6b13Por835EetRiugbKh6BLLZNZQKrwk_2YiWiYBJPZ7B99zAI" />
                    </div>
                    <div className="relative z-10 max-w-lg reveal">
                        <h1 className="font-headline text-5xl font-extrabold tracking-tight text-on-surface leading-tight mb-6">
                            Master Your <span className="text-primary-container text-glow-cyan">Interview</span> with AI
                        </h1>
                        <p className="text-on-surface-variant text-lg mb-10 font-body leading-relaxed">
                            Harness the power of neural analysis to perfect your performance through real-time biometric feedback and industry-specific simulations.
                        </p>
                        <div className="flex flex-col gap-4 w-full px-4">
                            <button onClick={() => navigate('/interview')} className="w-full bg-primary-container text-on-primary py-4 rounded-xl font-headline font-bold text-lg transition-all active:scale-95 glow-active">
                                Get Started
                            </button>
                            <button onClick={(e) => scrollToSection(e, '#how-it-works')} className="w-full border border-outline-variant bg-surface/40 backdrop-blur-md text-on-surface py-4 rounded-xl font-headline font-bold text-lg transition-all hover:bg-surface-container-high active:scale-95">
                                Watch Demo
                            </button>
                        </div>
                    </div>
                </section>

                {/* Features Bento Grid */}
                <section className="px-6 py-20 bg-surface-container-lowest">
                    <div className="mb-12 reveal">
                        <h2 className="font-headline text-3xl font-bold text-on-surface mb-2">Neural Capabilities</h2>
                        <div className="h-1 w-20 bg-gradient-to-r from-primary-container to-secondary-fixed rounded-full"></div>
                    </div>
                    <div className="grid grid-cols-1 gap-4">
                        {/* Card 1 */}
                        <div className="glass-card reveal p-6 rounded-2xl flex flex-col gap-4 border-l-4 border-l-primary-container">
                            <span className="material-symbols-outlined text-primary-container text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>keyboard_voice</span>
                            <div>
                                <h3 className="font-headline font-bold text-xl text-on-surface">Voice Recognition</h3>
                                <p className="text-on-surface-variant text-sm mt-1">Advanced speech analysis focusing on tone, clarity, and filler word detection.</p>
                            </div>
                        </div>
                        {/* Card 2 */}
                        <div className="glass-card reveal p-6 rounded-2xl flex flex-col gap-4 border-l-4 border-l-secondary-fixed">
                            <span className="material-symbols-outlined text-secondary-fixed text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>visibility</span>
                            <div>
                                <h3 className="font-headline font-bold text-xl text-on-surface">Body Language</h3>
                                <p className="text-on-surface-variant text-sm mt-1">Visual feedback on posture, eye contact, and micro-expressions.</p>
                            </div>
                        </div>
                        {/* Card 3 */}
                        <div className="glass-card reveal p-6 rounded-2xl flex flex-col gap-4 border-l-4 border-l-[#b026ff]">
                            <span className="material-symbols-outlined text-[#b026ff] text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>quiz</span>
                            <div>
                                <h3 className="font-headline font-bold text-xl text-on-surface">Custom Questions</h3>
                                <p className="text-on-surface-variant text-sm mt-1">Deep-dive into industry-specific technical and behavioral inquiries.</p>
                            </div>
                        </div>
                        {/* Card 4 */}
                        <div className="glass-card reveal p-6 rounded-2xl flex flex-col gap-4 border-l-4 border-l-tertiary-fixed-dim">
                            <span className="material-symbols-outlined text-tertiary-fixed-dim text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>monitoring</span>
                            <div>
                                <h3 className="font-headline font-bold text-xl text-on-surface">Progress Tracking</h3>
                                <p className="text-on-surface-variant text-sm mt-1">Data-driven growth metrics with performance heatmaps and scoring.</p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* How It Works */}
                <section id="how-it-works" className="px-6 py-20 relative">
                    <div className="mb-12 text-center reveal">
                        <h2 className="font-headline text-3xl font-bold text-on-surface">The Neural Process</h2>
                        <p className="text-on-surface-variant text-sm">Your path to interview mastery</p>
                    </div>
                    <div className="relative flex flex-col gap-12">
                        {/* Connecting Line */}
                        <div className="absolute left-6 top-4 bottom-4 w-0.5 bg-gradient-to-b from-primary-container via-[#b026ff] to-secondary-fixed opacity-30"></div>
                        {/* Step 1 */}
                        <div className="relative flex gap-6 items-start reveal">
                            <div className="z-10 w-12 h-12 rounded-full bg-surface-container-high border-2 border-primary-container flex items-center justify-center font-headline font-bold text-primary-container shadow-[0_0_10px_rgba(0,240,255,0.4)]">1</div>
                            <div className="flex-1">
                                <h4 className="font-headline font-bold text-lg text-on-surface">Select Role</h4>
                                <p className="text-on-surface-variant text-sm">Choose your target position from over 500+ tech and business domains.</p>
                            </div>
                        </div>
                        {/* Step 2 */}
                        <div className="relative flex gap-6 items-start reveal">
                            <div className="z-10 w-12 h-12 rounded-full bg-surface-container-high border-2 border-[#b026ff] flex items-center justify-center font-headline font-bold text-[#b026ff] shadow-[0_0_10px_rgba(176,38,255,0.4)]">2</div>
                            <div className="flex-1">
                                <h4 className="font-headline font-bold text-lg text-on-surface">AI Interview</h4>
                                <p className="text-on-surface-variant text-sm">Engage with our lifelike neural avatar in a real-time, high-pressure session.</p>
                            </div>
                        </div>
                        {/* Step 3 */}
                        <div className="relative flex gap-6 items-start reveal">
                            <div className="z-10 w-12 h-12 rounded-full bg-surface-container-high border-2 border-secondary-fixed flex items-center justify-center font-headline font-bold text-secondary-fixed shadow-[0_0_10px_rgba(150,209,214,0.4)]">3</div>
                            <div className="flex-1">
                                <h4 className="font-headline font-bold text-lg text-on-surface">Neural Analysis</h4>
                                <p className="text-on-surface-variant text-sm">Receive detailed feedback based on thousands of successful interview data points.</p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Pricing */}
                <section className="px-6 py-20 bg-surface-container">
                    <div className="mb-12 text-center reveal">
                        <h2 className="font-headline text-3xl font-bold text-on-surface">Choose Your Core</h2>
                    </div>
                    <div className="flex flex-col gap-8">
                        {/* Starter */}
                        <div className="glass-card reveal p-8 rounded-3xl relative overflow-hidden group">
                            <div className="mb-6">
                                <span className="text-on-surface-variant font-label text-xs uppercase tracking-widest">Starter Tier</span>
                                <h3 className="font-headline font-bold text-2xl text-on-surface mt-1">Basic Core</h3>
                            </div>
                            <div className="flex items-baseline gap-1 mb-6">
                                <span className="text-3xl font-bold text-on-surface">$0</span>
                                <span className="text-on-surface-variant text-sm">/month</span>
                            </div>
                            <ul className="space-y-4 mb-8">
                                <li className="flex items-center gap-3 text-sm text-on-surface-variant">
                                    <span className="material-symbols-outlined text-primary-fixed-dim text-lg">check_circle</span>
                                    3 Sessions per month
                                </li>
                                <li className="flex items-center gap-3 text-sm text-on-surface-variant">
                                    <span className="material-symbols-outlined text-primary-fixed-dim text-lg">check_circle</span>
                                    Standard Question Bank
                                </li>
                            </ul>
                            <button className="w-full py-3 rounded-xl border border-outline-variant font-bold text-on-surface transition-all group-hover:bg-surface-variant">
                                Begin Free
                            </button>
                        </div>
                        {/* Pro */}
                        <div className="glass-card reveal neon-pulse-card p-8 rounded-3xl relative border-2 border-primary-container/30 overflow-hidden scale-[1.05] z-10">
                            <div className="absolute top-0 right-0 bg-primary-container text-on-primary font-bold text-[10px] px-3 py-1 rounded-bl-lg uppercase tracking-wider">Neural Link</div>
                            <div className="mb-6">
                                <span className="text-primary-container font-label text-xs uppercase tracking-widest font-bold">Recommended</span>
                                <h3 className="font-headline font-bold text-2xl text-on-surface mt-1">Pro Neural</h3>
                            </div>
                            <div className="flex items-baseline gap-1 mb-6">
                                <span className="text-3xl font-bold text-on-surface">$29</span>
                                <span className="text-on-surface-variant text-sm">/month</span>
                            </div>
                            <ul className="space-y-4 mb-8">
                                <li className="flex items-center gap-3 text-sm text-on-surface">
                                    <span className="material-symbols-outlined text-primary-container text-lg">verified</span>
                                    Unlimited AI Interviews
                                </li>
                                <li className="flex items-center gap-3 text-sm text-on-surface">
                                    <span className="material-symbols-outlined text-primary-container text-lg">verified</span>
                                    Full Body Language Analysis
                                </li>
                                <li className="flex items-center gap-3 text-sm text-on-surface">
                                    <span className="material-symbols-outlined text-primary-container text-lg">verified</span>
                                    Priority Neural Link Processing
                                </li>
                            </ul>
                            <button className="w-full py-3 rounded-xl bg-primary-container text-on-primary font-bold transition-transform active:scale-95 glow-active">
                                Upgrade Now
                            </button>
                        </div>
                    </div>
                </section>

                {/* CTA Final */}
                <section className="px-6 py-24 text-center reveal">
                    <div className="p-8 rounded-3xl bg-gradient-to-br from-surface-container-high to-surface border border-outline-variant/30 relative overflow-hidden group">
                        <div className="absolute top-[-20%] right-[-20%] w-40 h-40 bg-secondary-container/20 blur-3xl group-hover:bg-secondary-container/30 transition-colors duration-700"></div>
                        <h2 className="font-headline text-3xl font-bold text-on-surface mb-4">Ready to Evolve?</h2>
                        <p className="text-on-surface-variant mb-8">Join 50,000+ candidates who upgraded their careers with neural feedback.</p>
                        <button className="bg-on-surface text-surface py-4 px-10 rounded-full font-headline font-bold text-lg hover:bg-primary-container hover:text-on-primary transition-all duration-300 active:scale-95">
                            Initialize Setup
                        </button>
                    </div>
                </section>
            </main>

            {/* Footer */}
            <footer className="w-full py-12 border-t border-outline-variant/20 bg-surface-container-lowest">
                <div className="flex flex-col md:flex-row justify-between items-center px-8 gap-6 max-w-7xl mx-auto">
                    <div className="flex flex-col items-center md:items-start gap-2">
                        <span className="font-headline font-black text-on-surface text-xl">NEURALINTERVIEW AI</span>
                        <p className="font-body text-label-sm tracking-tighter text-outline">© 2024 NEURALINTERVIEW AI. SYSTEM ACTIVE.</p>
                    </div>
                    <div className="flex gap-6">
                        <a className="text-outline hover:text-primary-container transition-colors duration-300 font-body text-label-sm tracking-tighter" href="#">Architecture</a>
                        <a className="text-outline hover:text-primary-container transition-colors duration-300 font-body text-label-sm tracking-tighter" href="#">Protocols</a>
                        <a className="text-outline hover:text-primary-container transition-colors duration-300 font-body text-label-sm tracking-tighter" href="#">Privacy</a>
                        <a className="text-outline hover:text-primary-container transition-colors duration-300 font-body text-label-sm tracking-tighter" href="#">Neural Link</a>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;
