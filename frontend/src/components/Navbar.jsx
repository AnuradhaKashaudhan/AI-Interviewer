import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
    BrainCircuit,
    Menu,
    X,
    ArrowRight,
    Sparkles,
    ChevronLeft,
    LayoutDashboard,
    MessageSquare,
    Target,
    CreditCard,
    Headphones
} from 'lucide-react';

const Navbar = () => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    // Auto-scroll logic for landing page sections
    useEffect(() => {
        if (location.state?.scrollTo) {
            const targetId = location.state.scrollTo;
            setTimeout(() => {
                const element = document.getElementById(targetId);
                if (element) {
                    window.scrollTo({
                        top: element.offsetTop - 20,
                        behavior: 'smooth'
                    });
                }
            }, 100);
            window.history.replaceState({}, document.title);
        }
    }, [location]);

    const navLinks = [
        { name: 'Dashboard', href: '#how-it-works', icon: <LayoutDashboard className="w-4 h-4" /> },
        { name: 'Features', href: '#features', icon: <MessageSquare className="w-4 h-4" /> },
        { name: 'ATS Checker', href: '#ats-checker', icon: <Target className="w-4 h-4" />, highlight: true },
        { name: 'Pricing', href: '#pricing', icon: <CreditCard className="w-4 h-4" /> },
        { name: 'Help & Support', href: '#contact', icon: <Headphones className="w-4 h-4" /> },
    ];

    const handleNavClick = (e, href) => {
        e.preventDefault();
        setIsMobileMenuOpen(false);
        const targetId = href.substring(1);

        if (location.pathname !== '/') {
            navigate('/', { state: { scrollTo: targetId } });
        } else {
            const element = document.getElementById(targetId);
            if (element) {
                window.scrollTo({
                    top: element.offsetTop - 20,
                    behavior: 'smooth'
                });
            }
        }
    };

    if (location.pathname === '/interview') return null;

    const SidebarContent = () => (
        <div className="flex flex-col h-full p-6 justify-between">
            <div>
                {/* Sidebar Header */}
                <div className="mb-8">
                    {/* Logo & Back Button Alignment */}
                    <div className="flex items-center justify-between">
                        <Link
                            to="/"
                            className="flex items-center gap-3 transition-transform hover:scale-105"
                            onClick={() => {
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                                setIsMobileMenuOpen(false);
                            }}
                        >
                            <div className="w-10 h-10 rounded-[1.2rem] bg-indigo-600/20 border border-indigo-500/20 flex items-center justify-center p-2">
                                <BrainCircuit className="text-indigo-500 w-full h-full" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-base font-black tracking-tight text-white leading-none">AI Interviewer</span>
                                <span className="text-[10px] text-indigo-500 font-bold uppercase tracking-widest mt-0.5">BETA V1.0</span>
                            </div>
                        </Link>

                        <button
                            className="w-8 h-8 rounded-lg bg-slate-900 border border-white/5 flex items-center justify-center text-white/20 hover:text-white transition-all shadow-xl lg:hidden"
                            onClick={() => setIsMobileMenuOpen(false)}
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Navigation Links */}
                <nav className="flex flex-col gap-1 overflow-y-auto pr-2 custom-scrollbar">
                    <span className="text-[10px] font-bold text-text-muted uppercase tracking-[0.2em] mb-3 pl-3 opacity-40">Main Menu</span>
                    {navLinks.map((link) => (
                        <a
                            key={link.name}
                            href={link.href}
                            onClick={(e) => handleNavClick(e, link.href)}
                            className={`group flex items-center justify-between p-3 rounded-xl transition-all duration-300 ${link.highlight
                                ? 'bg-indigo-500/10 hover:bg-indigo-500/15 border border-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.05)]'
                                : 'hover:bg-white/5 border border-transparent'
                                }`}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${link.highlight
                                    ? 'bg-indigo-500/20 text-indigo-400'
                                    : 'bg-white/5 text-text-muted group-hover:bg-indigo-500/10 group-hover:text-indigo-400'
                                    }`}>
                                    {React.cloneElement(link.icon, { className: "w-4 h-4" })}
                                </div>
                                <span className={`text-[13px] font-semibold tracking-wide ${link.highlight ? 'text-indigo-300' : 'text-text-muted group-hover:text-white'}`}>
                                    {link.name}
                                </span>
                                {link.highlight && (
                                    <Sparkles className="w-3.5 h-3.5 text-indigo-500 ml-1" />
                                )}
                            </div>
                            <ArrowRight className="w-4 h-4 text-indigo-500/50 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all" />
                        </a>
                    ))}
                </nav>
            </div>

            {/* Sidebar Footer - Consolidated User Profile & Action Block */}
            <div className="mt-auto pt-6 border-t border-white/5 flex flex-col gap-3">
                <div className="flex items-center gap-3 p-3 bg-white/[0.02] border border-white/5 rounded-2xl">
                    <div className="w-9 h-9 rounded-full border border-white/10 overflow-hidden bg-slate-800 flex-shrink-0">
                        <img
                            src="https://api.dicebear.com/7.x/avataaars/svg?seed=guest-user"
                            alt="User Avatar"
                            className="w-full h-full object-cover"
                        />
                    </div>
                    <div className="flex flex-col flex-grow min-w-0">
                        <span className="text-xs font-bold text-white leading-none truncate">Guest User</span>
                        <button
                            onClick={() => {
                                setIsMobileMenuOpen(false);
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            className="text-[10px] text-indigo-400 font-bold hover:text-indigo-300 transition-colors text-left mt-1 tracking-wider uppercase"
                        >
                            Sign In
                        </button>
                    </div>
                </div>

                <button
                    onClick={() => {
                        setIsMobileMenuOpen(false);
                        navigate('/interview');
                    }}
                    className="w-full btn-primary py-3 text-center flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider shadow-lg shadow-indigo-500/10"
                >
                    Start Now
                    <ArrowRight className="w-4 h-4" />
                </button>

                <div className="text-center pt-2">
                    <span className="text-[9px] text-text-muted font-bold uppercase tracking-[0.3em] opacity-30">© 2026 AI-INT</span>
                </div>
            </div>
        </div>
    );

    return (
        <>
            {/* Desktop Fixed Sidebar */}
            <aside className="hidden lg:flex fixed top-0 left-0 bottom-0 w-72 bg-[#09090b] border-r border-white/5 z-[100] shadow-[10px_0_30px_rgba(0,0,0,0.5)]">
                <SidebarContent />
            </aside>

            {/* Mobile Top Header (Minimal) */}
            <header className="lg:hidden fixed top-0 left-0 right-0 z-[100] h-16 bg-[#09090b]/90 backdrop-blur-xl border-b border-white/5 flex items-center px-4">
                <button
                    className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-white hover:bg-indigo-500/20 transition-all active:scale-95"
                    onClick={() => setIsMobileMenuOpen(true)}
                >
                    <Menu className="w-5 h-5" />
                </button>
                <div className="ml-4 flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/20 flex items-center justify-center p-1.5">
                        <BrainCircuit className="text-indigo-500 w-full h-full" />
                    </div>
                    <span className="font-bold text-white tracking-tight">AI Interviewer</span>
                </div>
            </header>

            {/* Mobile Sidebar Overlay */}
            <AnimatePresence>
                {isMobileMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] lg:hidden"
                    />
                )}
            </AnimatePresence>

            {/* Mobile Navigation Sidebar */}
            <AnimatePresence>
                {isMobileMenuOpen && (
                    <motion.div
                        initial={{ x: '-100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '-100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed inset-y-0 left-0 w-[280px] bg-[#09090b] z-[120] lg:hidden flex flex-col shadow-2xl border-r border-white/5"
                    >
                        <SidebarContent />
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};

export default Navbar;
