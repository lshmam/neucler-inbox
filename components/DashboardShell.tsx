"use client";

import { MobileNav } from "@/components/MobileNav";
import { Sidebar } from "@/components/Sidebar";

interface DashboardShellProps {
    branding: {
        name: string;
        logo: string | null;
        color: string;
    };
    children: React.ReactNode;
}

export function DashboardShell({ branding, children }: DashboardShellProps) {
    return (
        <div className="h-screen overflow-hidden relative">
            {/* Mobile Navigation */}
            <MobileNav branding={branding} />

            {/* Desktop Sidebar - Hidden on mobile */}
            <div className="hidden h-full md:flex md:flex-col md:fixed md:inset-y-0 z-[80]">
                <Sidebar branding={branding} />
            </div>

            {/* Main Content */}
            <main
                className="md:pl-64 h-full overflow-auto bg-slate-50 transition-all duration-300 pt-14 md:pt-0"
                id="main-content"
            >
                {children}
            </main>
        </div>
    );
}
