"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { ActionItem } from "@/app/(dashboard)/actions/action-client";
import { DEMO_DATA, getDemoMode, Industry, DashboardStats, TeamMember, QueueItem, ChartDataPoint } from "@/lib/demo-data";

interface DemoContextType {
    industry: Industry;
    setIndustry: (industry: Industry) => void;
    isDemo: boolean;
    data: {
        actions: ActionItem[];
        stats?: DashboardStats;
        team?: TeamMember[];
        queue?: QueueItem[];
        chart?: ChartDataPoint[];
    };
}

const DemoContext = createContext<DemoContextType | null>(null);

export function useDemo() {
    const ctx = useContext(DemoContext);
    if (!ctx) throw new Error("useDemo must be used within DemoProvider");
    return ctx;
}

export function DemoProvider({ children }: { children: ReactNode }) {
    const [industry, setIndustryState] = useState<Industry>("auto");
    const [mounted, setMounted] = useState(false);

    // Persist to local storage helper
    const setIndustry = (newIndustry: Industry) => {
        setIndustryState(newIndustry);
        localStorage.setItem("demo-industry", newIndustry);
    };

    useEffect(() => {
        const hostname = window.location.hostname;
        const pathname = window.location.pathname;
        let mode = getDemoMode(hostname);

        // 1. Path overrides Hostname
        if (pathname.startsWith("/medspa-demo")) {
            mode = "medspa";
        } else if (pathname.startsWith("/dental-demo")) {
            mode = "dental";
        } else if (hostname === "app.neucler.com") {
            // CRITICAL: Strict production mode.
            // Never allow local storage or other overrides to enable demo mode here.
            mode = "real";
        } else {
            // 2. LocalStorage
            // Allow LS override if we are on a demo domain OR if we are on localhost (for dev/testing)
            const isLocalhost = hostname.includes("localhost");
            const canOverride = mode !== "real" || isLocalhost;

            if (canOverride) {
                const stored = localStorage.getItem("demo-industry") as Industry | null;
                if (stored && DEMO_DATA[stored]) {
                    mode = stored;
                } else if (isLocalhost && mode === "real") {
                    // Force "auto" demo on localhost if no preference is saved
                    mode = "auto";
                }
            }
        }

        // 3. Query Param Overrides Everything (for testing specific links)
        const params = new URLSearchParams(window.location.search);
        const override = params.get("demo") as Industry | null;

        if (override && DEMO_DATA[override]) {
            setIndustryState(override);
            // If they specifically linked with ?demo=, should we persist it? Yes.
            localStorage.setItem("demo-industry", override);
        } else {
            setIndustryState(mode);
        }
        setMounted(true);
    }, []);

    const isDemo = industry !== "real";

    // In real mode, we return empty arrays so components know to fetch their own data
    // In demo mode, we return the hardcoded data
    const data = isDemo ? DEMO_DATA[industry] : DEMO_DATA["real"];

    return (
        <DemoContext.Provider value={{ industry, setIndustry, isDemo, data }}>
            {children}
        </DemoContext.Provider>
    );
}
