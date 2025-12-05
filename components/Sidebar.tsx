"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
    LayoutDashboard,
    TrendingUp,
    MessageSquare,
    Smartphone,
    Mail,
    Bot,
    Globe,
    Star,
    Trophy,
    Zap,
    CreditCard,
    Settings,
    LogOut,
    ChevronDown,
    User
} from "lucide-react";

const NAV_SECTIONS = [
    {
        title: "Overview",
        items: [
            { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
            { label: "Analytics", href: "/analytics", icon: TrendingUp },
            { label: "Customers", href: "/customers", icon: User },
            { label: "Inbox", href: "/inbox", icon: MessageSquare },
        ]
    },
    {
        title: "Growth",
        items: [
            // { label: "Communications", href: "/communications", icon: MessageSquare },
            { label: "SMS", href: "/sms", icon: Smartphone },
            { label: "Email", href: "/email", icon: Mail },
            { label: "Calls", href: "/ai-agent", icon: Bot },
            { label: "Site Widgets", href: "/site-widgets", icon: Globe },
        ]
    },
    {
        title: "Retention",
        items: [
            { label: "Reputation", href: "/reviews", icon: Star },
            // { label: "Loyalty", href: "/loyalty", icon: Trophy },
        ]
    },
    {
        title: "Automation",
        items: [
            { label: "Automations", href: "/automations", icon: Zap },
        ]
    },
    {
        title: "Account",
        items: [
            { label: "Subscription", href: "/subscription", icon: CreditCard },
            { label: "Settings", href: "/settings", icon: Settings },
        ]
    }
];

interface SidebarProps {
    branding?: {
        name: string;
        logo: string | null;
        color: string;
    }
}

const DEFAULT_BRANDING = {
    name: "Clover AI",
    logo: null,
    color: "blue"
};

export function Sidebar({ branding = DEFAULT_BRANDING }: SidebarProps) {
    const pathname = usePathname();

    // Keep track of open menus
    const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
        "Overview": true,
        "Growth": true,
        "Retention": true,
        "Automation": true,
        "Account": true
    });

    const toggleGroup = (title: string) => {
        setOpenGroups(prev => ({ ...prev, [title]: !prev[title] }));
    };

    return (
        <div className="flex flex-col h-full w-64 bg-[#09090b] border-r border-zinc-800 text-zinc-300 shrink-0">

            {/* --- HEADER --- */}
            <div className="h-16 flex items-center px-6 border-b border-zinc-800 shrink-0">
                <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-md bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0 text-white font-bold overflow-hidden">
                        {branding.logo ? <img src={branding.logo} className="w-full h-full object-cover" alt="Logo" /> : branding.name.substring(0, 2)}
                    </div>
                    <h1 className="font-semibold text-white text-sm truncate">{branding.name}</h1>
                </div>
            </div>

            {/* --- SCROLLABLE NAV --- */}
            <div className="flex-1 overflow-y-auto py-6 px-4 space-y-6 
                /* SCROLLBAR STYLING START */
                [&::-webkit-scrollbar]:w-1.5
                [&::-webkit-scrollbar-track]:bg-transparent
                [&::-webkit-scrollbar-thumb]:bg-zinc-800
                [&::-webkit-scrollbar-thumb]:rounded-full
                hover:[&::-webkit-scrollbar-thumb]:bg-zinc-700
                /* SCROLLBAR STYLING END */
            ">
                {NAV_SECTIONS.map((section) => (
                    <div key={section.title}>
                        <button
                            onClick={() => toggleGroup(section.title)}
                            className="flex items-center justify-between w-full px-2 py-2 text-[11px] font-bold text-zinc-500 uppercase tracking-wider hover:text-zinc-300 transition-colors mb-1"
                        >
                            <span>{section.title}</span>
                            <ChevronDown
                                className={cn(
                                    "h-3 w-3 transition-transform duration-200",
                                    openGroups[section.title] ? "rotate-180" : "rotate-0"
                                )}
                            />
                        </button>

                        <div
                            className={cn(
                                "space-y-1 overflow-hidden transition-all duration-300",
                                !openGroups[section.title] ? "max-h-0 opacity-0" : "max-h-[500px] opacity-100"
                            )}
                        >
                            {section.items.map((item) => {
                                const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className={cn(
                                            "group flex items-center rounded-md px-3 py-2 text-sm font-medium transition-all duration-200",
                                            isActive
                                                ? "bg-blue-600 text-white shadow-md"
                                                : "text-zinc-400 hover:bg-blue-600 hover:text-white"
                                        )}
                                    >
                                        <item.icon className={cn("h-5 w-5 shrink-0 mr-3", isActive ? "text-white" : "text-zinc-400 group-hover:text-white")} />
                                        <span className="truncate">{item.label}</span>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>

            {/* --- FOOTER --- */}
            <div className="p-4 border-t border-zinc-800 bg-[#09090b] shrink-0">
                <a
                    href="/auth/logout"
                    className="flex items-center rounded-md px-3 py-2 text-sm font-medium text-zinc-400 hover:bg-red-500/10 hover:text-red-500 transition-all"
                >
                    <LogOut className="h-5 w-5 shrink-0 mr-3" />
                    <span>Sign Out</span>
                </a>
            </div>
        </div>
    );
}