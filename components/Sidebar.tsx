"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
    LayoutDashboard,
    Headset,
    TrendingUp,
    LineChart,
    BookOpenCheck,
    Radio,
    Settings,
    LogOut,
    ChevronDown,
    PhoneCall
} from "lucide-react";

const NAV_SECTIONS = [
    {
        title: "OPERATIONS",
        items: [
            { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
            { label: "Service Desk", href: "/service-desk", icon: Headset },
            { label: "Pipeline", href: "/pipeline", icon: TrendingUp },
            { label: "Outreach", href: "/outreach", icon: Radio },
        ]
    },
    {
        title: "MANAGEMENT",
        items: [
            { label: "Performance", href: "/performance", icon: LineChart },
            { label: "Call Analytics", href: "/call-analytics", icon: PhoneCall },
            { label: "Shop Playbook", href: "/knowledge-base", icon: BookOpenCheck },
        ]
    },
    {
        title: "SYSTEM",
        items: [
            { label: "Settings", href: "/settings", icon: Settings },
        ]
    }
];

interface SidebarProps {
    branding?: {
        name: string;
        logo: string | null;
        color: string;
    };
    onNavigate?: () => void;
}

const DEFAULT_BRANDING = {
    name: "Auto Shop OS",
    logo: null,
    color: "blue"
};

export function Sidebar({ branding = DEFAULT_BRANDING, onNavigate }: SidebarProps) {
    const pathname = usePathname();

    const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
        "OPERATIONS": true,
        "MANAGEMENT": true,
        "SYSTEM": true
    });

    const toggleGroup = (title: string) => {
        setOpenGroups(prev => ({ ...prev, [title]: !prev[title] }));
    };

    return (
        <div className="flex flex-col h-full w-64 bg-slate-50 border-r border-slate-200 text-slate-900 shrink-0">

            {/* --- HEADER --- */}
            <div className="min-h-16 flex items-center px-6 py-4 border-b border-slate-200 shrink-0 bg-white">
                <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-blue-600 flex items-center justify-center shrink-0 text-white font-bold text-sm overflow-hidden shadow-sm">
                        {branding.logo ? <img src={branding.logo} className="w-full h-full object-cover" alt="Logo" /> : branding.name.substring(0, 2).toUpperCase()}
                    </div>
                    <h1 className="font-semibold text-slate-900 text-sm leading-tight line-clamp-2">{branding.name}</h1>
                </div>
            </div>

            {/* --- SCROLLABLE NAV --- */}
            <div className="flex-1 overflow-y-auto py-4 px-3 flex flex-col
                [&::-webkit-scrollbar]:w-1.5
                [&::-webkit-scrollbar-track]:bg-transparent
                [&::-webkit-scrollbar-thumb]:bg-slate-300
                [&::-webkit-scrollbar-thumb]:rounded-full
                hover:[&::-webkit-scrollbar-thumb]:bg-slate-400
            ">
                {NAV_SECTIONS.map((section, index) => (
                    <div key={section.title} className={cn("mb-4", index < NAV_SECTIONS.length - 1 && "pb-4 border-b border-slate-200")}>
                        <button
                            onClick={() => toggleGroup(section.title)}
                            className="flex items-center justify-between w-full px-2 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest hover:text-slate-700 transition-colors"
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
                                "space-y-0.5 overflow-hidden transition-all duration-300",
                                !openGroups[section.title] ? "max-h-0 opacity-0" : "max-h-[500px] opacity-100"
                            )}
                        >
                            {section.items.map((item) => {
                                const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        onClick={onNavigate}
                                        className={cn(
                                            "group flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150",
                                            isActive
                                                ? "bg-blue-50 text-blue-700 border border-blue-100"
                                                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-transparent"
                                        )}
                                    >
                                        <item.icon className={cn(
                                            "h-5 w-5 shrink-0 mr-3",
                                            isActive ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600"
                                        )} />
                                        <span className="truncate">{item.label}</span>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>

            {/* --- FOOTER --- */}
            <div className="p-3 border-t border-slate-200 bg-white shrink-0">
                <a
                    href="/auth/logout"
                    className="flex items-center rounded-lg px-3 py-2.5 text-sm font-medium text-slate-500 hover:bg-red-50 hover:text-red-600 transition-all border border-transparent hover:border-red-100"
                >
                    <LogOut className="h-5 w-5 shrink-0 mr-3" />
                    <span>Sign Out</span>
                </a>
            </div>
        </div>
    );
}