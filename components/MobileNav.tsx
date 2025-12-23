"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Sidebar } from "./Sidebar";

interface MobileNavProps {
    branding: {
        name: string;
        logo: string | null;
        color: string;
    };
}

export function MobileNav({ branding }: MobileNavProps) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <>
            {/* Mobile Header - Only visible on mobile */}
            <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-white border-b border-slate-200 z-[90] flex items-center justify-between px-4">
                {/* Logo/Brand */}
                <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-md bg-blue-600 flex items-center justify-center shrink-0 text-white font-bold overflow-hidden shadow-sm">
                        {branding.logo ? (
                            <img src={branding.logo} className="w-full h-full object-cover" alt="Logo" />
                        ) : (
                            branding.name.substring(0, 2).toUpperCase()
                        )}
                    </div>
                    <span className="font-semibold text-slate-900 text-sm">{branding.name}</span>
                </div>

                {/* Hamburger Button */}
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="p-2 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                    aria-label="Toggle menu"
                >
                    {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                </button>
            </div>

            {/* Overlay - visible when menu is open on mobile */}
            {isOpen && (
                <div
                    className="md:hidden fixed inset-0 bg-black/50 z-[85] backdrop-blur-sm"
                    onClick={() => setIsOpen(false)}
                />
            )}

            {/* Mobile Sidebar - slides in from left */}
            <div
                className={`
                    md:hidden fixed inset-y-0 left-0 z-[90] w-64
                    transform transition-transform duration-300 ease-in-out
                    ${isOpen ? 'translate-x-0' : '-translate-x-full'}
                `}
            >
                <Sidebar branding={branding} onNavigate={() => setIsOpen(false)} />
            </div>
        </>
    );
}
