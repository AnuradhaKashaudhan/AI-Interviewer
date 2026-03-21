import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Mic, 
  Video, 
  MessageSquare, 
  TrendingUp, 
  Shield, 
  ArrowRight,
  BrainCircuit,
  Layout,
  Star,
  CheckCircle2,
  FileCheck2
} from 'lucide-react';
import ATSCheckerSection from './ATSCheckerSection';

const LandingPage = () => {
    const navigate = useNavigate();

    const features = [
        {
            icon: <MessageSquare className="w-6 h-6 text-primary" />,
            title: "Mock Interviews",
            description: "Schedule practice sessions with our intelligent AI interviewer."
        },
        {
            icon: <TrendingUp className="w-6 h-6 text-secondary" />,
            title: "Real-time Feedback",
            description: "Instant performance analysis and personalized improvement tips."
        },
        {
            icon: <Layout className="w-6 h-6 text-accent" />,
            title: "Expert Resources",
            description: "Access a curated library of interview tips and best practices."
        }
    ];

    const companies = ["Google", "Amazon", "Microsoft", "Meta", "Tesla"];

    return (
        <div className="landing-page">
            <div className="bg-gradient" />
            
            {/* Navigation */}
            <nav className="container py-6 flex justify-between items-center relative z-10">
                <div className="flex items-center gap-2">
                    <BrainCircuit className="text-primary w-8 h-8" />
                    <span className="text-xl font-bold tracking-tight">AI Interviewer</span>
                </div>
                
                <div className="hidden md:flex items-center gap-8 text-sm font-medium text-text-muted">
                    <button onClick={() => document.getElementById('how-it-works').scrollIntoView({ behavior: 'smooth' })} className="hover:text-white transition-colors bg-transparent border-none cursor-pointer">About</button>
                    <button onClick={() => document.getElementById('features').scrollIntoView({ behavior: 'smooth' })} className="hover:text-white transition-colors bg-transparent border-none cursor-pointer">Features</button>
                    <button onClick={() => document.getElementById('ats-checker').scrollIntoView({ behavior: 'smooth' })} className="hover:text-white transition-colors bg-transparent border-none cursor-pointer font-bold text-accent px-2 py-1 bg-accent/5 rounded-lg border border-accent/20">ATS Checker ✨</button>
                    <button onClick={() => document.getElementById('pricing').scrollIntoView({ behavior: 'smooth' })} className="hover:text-white transition-colors bg-transparent border-none cursor-pointer">Pricing</button>
                    <button onClick={() => document.getElementById('contact').scrollIntoView({ behavior: 'smooth' })} className="hover:text-white transition-colors bg-transparent border-none cursor-pointer">Contact</button>
                </div>

                <div className="flex items-center gap-4">
                    <button className="btn-secondary hidden sm:block">Sign Up</button>
                    <button onClick={() => navigate('/interview')} className="btn-primary">
                        Get Started
                    </button>
                </div>
            </nav>

            {/* Hero Section */}
            <header className="container pt-20 pb-32">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                    <motion.div 
                        initial={{ opacity: 0, x: -50 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.8 }}
                    >
                        
                        <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
                            Master Your <br />
                            Interview with AI.
                        </h1>
                        
                        <p className="text-lg text-text-muted mb-10 max-w-xl">
                            The intelligent way to prepare for your next career move. 
                            Practice with personalized AI-driven mock interviews.
                        </p>
                        
                        <div className="flex flex-wrap gap-4">
                            <button onClick={() => navigate('/interview')} className="btn-primary px-8 py-3">
                                Get Started Free
                            </button>
                        </div>
                    </motion.div>

                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="relative"
                    >
                        <div className="card p-4 overflow-hidden border-white/10">
                            <img 
                                src="/hero_ai_interviewer.png" 
                                alt="AI Interviewer" 
                                className="w-full h-auto rounded-lg"
                            />
                        </div>
                    </motion.div>
                </div>
            </header>

            {/* Trusted By Section */}
            <section className="container pb-32">
                <div className="card py-8 px-8 flex flex-col md:flex-row items-center justify-between gap-8 border-white/5 text-center md:text-left">
                    <span className="text-xs font-bold text-text-muted uppercase tracking-widest">Used by professionals at</span>
                    <div className="flex flex-wrap justify-center gap-8 md:gap-16 opacity-30 grayscale hover:grayscale-0 transition-all">
                        {companies.map(company => (
                            <span key={company} className="text-xl font-bold text-white">{company}</span>
                        ))}
                    </div>
                </div>
            </section>

            {/* ATS Checker Section */}
            <ATSCheckerSection />

            {/* How It Works Section */}
            <section id="how-it-works" className="container pb-32">
                <div className="text-center mb-16">
                    <h2 className="text-4xl md:text-5xl font-bold mb-4">How It <span className="text-gradient">Works</span></h2>
                    <p className="text-text-muted max-w-2xl mx-auto">Our AI-driven process is designed to give you the most realistic interview experience possible.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {[
                        { step: "01", title: "Upload Resume", desc: "Our AI parses your experience to tailor questions specifically for your background." },
                        { step: "02", title: "Live Interview", desc: "Experience a real-time conversation with our AI interviewer, complete with audio and video." },
                        { step: "03", title: "Detailed Analysis", desc: "Receive comprehensive feedback on your answers, soft skills, and technical knowledge." }
                    ].map((step, i) => (
                        <motion.div 
                            key={i}
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.2 }}
                            className="card p-8 border-white/5 hover:border-primary/30 transition-all group"
                        >
                            <div className="text-5xl font-black text-white/5 group-hover:text-primary/20 transition-colors mb-4">{step.step}</div>
                            <h3 className="text-xl font-bold mb-2 text-white">{step.title}</h3>
                            <p className="text-text-muted text-sm leading-relaxed">{step.desc}</p>
                        </motion.div>
                    ))}
                </div>
            </section>
            {/* Features Section */}
            <section id="features" className="container pb-32">
                <div className="text-center mb-16">
                    <h2 className="text-4xl md:text-5xl font-bold mb-4">Powerful <span className="text-gradient">Features</span></h2>
                    <p className="text-text-muted max-w-2xl mx-auto">Everything you need to ace your next technical or behavioral interview.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[
                        { icon: <Mic className="text-primary" />, title: "Voice Recognition", desc: "Advanced STT to capture every detail of your answer." },
                        { icon: <Video className="text-secondary" />, title: "Body Language", desc: "AI analysis of your confidence and eye contact via webcam." },
                        { icon: <BrainCircuit className="text-accent" />, title: "Custom Questions", desc: "Dynamic generation based on your unique resume and role." },
                        { icon: <TrendingUp className="text-primary" />, title: "Progress Tracking", desc: "Visualize your improvement over multiple sessions." }
                    ].map((feat, i) => (
                        <div key={i} className="card p-6 border-white/5 hover:border-primary/20 transition-all">
                            <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mb-4">{feat.icon}</div>
                            <h3 className="font-bold mb-2">{feat.title}</h3>
                            <p className="text-sm text-text-muted">{feat.desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Pricing Section */}
            <section id="pricing" className="container pb-32">
                <div className="text-center mb-16">
                    <h2 className="text-4xl md:text-5xl font-bold mb-4">Simple <span className="text-gradient">Pricing</span></h2>
                    <p className="text-text-muted max-w-2xl mx-auto">Choose the plan that fits your career goals.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                    <div className="card p-10 border-white/5 flex flex-col">
                        <h3 className="text-2xl font-bold mb-2">Free</h3>
                        <div className="text-4xl font-bold mb-6">$0<span className="text-xl text-text-muted">/mo</span></div>
                        <ul className="space-y-4 mb-10 text-text-muted flex-grow">
                            <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-500" /> 3 Interviews / month</li>
                            <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-500" /> Basic AI Feedback</li>
                            <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-500" /> Resume Analysis</li>
                        </ul>
                        <button className="btn-secondary w-full">Current Plan</button>
                    </div>
                    <div className="card p-10 border-primary/30 relative overflow-hidden flex flex-col scale-105 shadow-2xl shadow-primary/20">
                        <div className="absolute top-0 right-0 bg-primary px-4 py-1 text-xs font-bold rounded-bl-xl">POPULAR</div>
                        <h3 className="text-2xl font-bold mb-2">Pro</h3>
                        <div className="text-4xl font-bold mb-6">$19<span className="text-xl text-text-muted">/mo</span></div>
                        <ul className="space-y-4 mb-10 text-text-muted flex-grow">
                            <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary" /> Unlimited Interviews</li>
                            <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary" /> Advanced Video Analysis</li>
                            <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary" /> Priority AI Support</li>
                            <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary" /> Exportable Reports</li>
                        </ul>
                        <button className="btn-primary w-full">Upgrade Now</button>
                    </div>
                </div>
            </section>

            {/* Footer / Contact */}
            <footer id="contact" className="container py-20 border-t border-white/5">
                <div className="flex flex-col md:flex-row justify-between gap-12">
                    <div className="max-w-xs">
                        <div className="flex items-center gap-2 mb-6">
                            <BrainCircuit className="text-primary w-6 h-6" />
                            <span className="text-xl font-bold tracking-tight">AI Interviewer</span>
                        </div>
                        <p className="text-sm text-text-muted leading-relaxed">Helping engineers land their dream jobs with state-of-the-art AI coaching since 2024.</p>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-12">
                        <div>
                            <h4 className="font-bold mb-4">Product</h4>
                            <ul className="space-y-2 text-sm text-text-muted">
                                <li><a href="#" className="hover:text-white transition-colors">Features</a></li>
                                <li><a href="#" className="hover:text-white transition-colors">Pricing</a></li>
                                <li><a href="#" className="hover:text-white transition-colors">Roadmap</a></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-bold mb-4">Company</h4>
                            <ul className="space-y-2 text-sm text-text-muted">
                                <li><a href="#" className="hover:text-white transition-colors">About</a></li>
                                <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
                                <li><a href="#" className="hover:text-white transition-colors">Careers</a></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-bold mb-4">Support</h4>
                            <ul className="space-y-2 text-sm text-text-muted">
                                <li><a href="#" className="hover:text-white transition-colors">Help Center</a></li>
                                <li><a href="#" className="hover:text-white transition-colors">Documentation</a></li>
                                <li><a href="#" className="hover:text-white transition-colors">Privacy</a></li>
                            </ul>
                        </div>
                    </div>
                </div>
                <div className="mt-20 pt-8 border-t border-white/5 text-center text-xs text-text-muted">
                    © 2026 AI Mock Interviewer. All rights reserved. Built with ❤️ for developers.
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;
