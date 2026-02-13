"use client";

import { useState, useEffect } from "react";
import { MobileNav } from "@/components/MobileNav";
import { Sidebar } from "@/components/Sidebar";
import { KnowledgeBaseSidebar } from "@/components/knowledge-base/KnowledgeBaseSidebar";
import { CallProvider } from "@/components/call-context";
import { CallPanel } from "@/components/call-panel";
import { DemoProvider } from "@/components/demo-provider";
import { BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

interface DashboardShellProps {
    branding: {
        name: string;
        logo: string | null;
        color: string;
    };
    children: React.ReactNode;
    knowledgeBaseArticles?: any[];
}

export function DashboardShell({ branding, children, knowledgeBaseArticles = [] }: DashboardShellProps) {
    const [showKnowledgeBase, setShowKnowledgeBase] = useState(false);

    // Keyboard shortcut: Ctrl+K to toggle KB sidebar
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                setShowKnowledgeBase(prev => !prev);
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, []);

    return (
        <DemoProvider>
            <CallProvider>
                <div className="h-screen overflow-hidden relative">
                    {/* Mobile Navigation */}
                    <MobileNav branding={branding} />

                    {/* Desktop Sidebar - Hidden on mobile */}
                    <div className="hidden h-full md:flex md:flex-col md:fixed md:inset-y-0 z-[80]">
                        <Sidebar branding={branding} />
                    </div>

                    {/* Main Content */}
                    <main
                        className={cn(
                            "md:pl-64 h-full overflow-y-auto bg-slate-50 transition-all duration-300 pt-14 md:pt-0",
                            showKnowledgeBase && "md:pr-80"
                        )}
                        id="main-content"
                    >
                        {children}
                    </main>

                    {/* Floating Call Panel */}
                    <CallPanel />

                    {/* Knowledge Base Toggle Button - Hidden on mobile */}
                    <button
                        onClick={() => setShowKnowledgeBase(prev => !prev)}
                        className={cn(
                            "hidden md:flex fixed bottom-4 right-4 z-[90] h-12 w-12 rounded-full shadow-lg items-center justify-center transition-all duration-300",
                            showKnowledgeBase
                                ? "bg-[#004789] text-white"
                                : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
                        )}
                        title="Toggle Knowledge Base (Ctrl+K)"
                    >
                        <BookOpen className="h-5 w-5" />
                    </button>

                    {/* Knowledge Base Right Sidebar */}
                    <div className={cn(
                        "fixed top-0 right-0 h-full z-[85] transition-transform duration-300",
                        showKnowledgeBase ? "translate-x-0" : "translate-x-full"
                    )}>
                        <KnowledgeBaseSidebar
                            articles={knowledgeBaseArticles}
                            isOpen={showKnowledgeBase}
                            onClose={() => setShowKnowledgeBase(false)}
                        />
                    </div>
                </div>
            </CallProvider>
        </DemoProvider>
    );
}
