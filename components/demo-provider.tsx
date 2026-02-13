"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { ActionItem } from "@/app/(dashboard)/actions/action-client";
import { DEMO_DATA, getDemoMode, Industry } from "@/lib/demo-data";

interface DemoContextType {
    industry: Industry;
    isDemo: boolean;
    data: {
        actions: ActionItem[];
    };
}

const DemoContext = createContext<DemoContextType | null>(null);

export function useDemo() {
    const ctx = useContext(DemoContext);
    if (!ctx) throw new Error("useDemo must be used within DemoProvider");
    return ctx;
}

export function DemoProvider({ children }: { children: ReactNode }) {
    const [industry, setIndustry] = useState<Industry>("auto");
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        const hostname = window.location.hostname;
        const mode = getDemoMode(hostname);

        // Allow overriding via query param for testing (e.g. ?demo=dental)
        const params = new URLSearchParams(window.location.search);
        const override = params.get("demo") as Industry | null;

        if (override && DEMO_DATA[override]) {
            setIndustry(override);
        } else {
            setIndustry(mode);
        }
        setMounted(true);
    }, []);

    const isDemo = industry !== "real";

    // In real mode, we return empty arrays so components know to fetch their own data
    // In demo mode, we return the hardcoded data
    const data = isDemo ? DEMO_DATA[industry] : DEMO_DATA["real"];

    return (
        <DemoContext.Provider value={{ industry, isDemo, data }}>
            {children}
        </DemoContext.Provider>
    );
}
