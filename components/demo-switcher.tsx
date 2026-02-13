"use client";

import { useState, useRef, useEffect } from "react";
import { useDemo } from "@/components/demo-provider";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, Sparkles, Stethoscope, Car } from "lucide-react";
import { Industry } from "@/lib/demo-data";

const INDUSTRIES: { id: Industry; label: string; icon: any }[] = [
    { id: "auto", label: "Auto Shop", icon: Car },
    { id: "medspa", label: "MedSpa", icon: Sparkles },
    { id: "dental", label: "Dental Practice", icon: Stethoscope },
];

export function DemoSwitcher() {
    const { isDemo, industry, setIndustry } = useDemo();
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    // Close on outside click
    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, []);

    if (!isDemo) return null;

    const current = INDUSTRIES.find(i => i.id === industry) || INDUSTRIES[0];
    const Icon = current.icon;

    return (
        <div ref={ref} className="relative mx-6 mt-4">
            {/* Trigger */}
            <button
                onClick={() => setOpen(!open)}
                className="w-full p-3 bg-indigo-50 border border-indigo-100 rounded-xl cursor-pointer hover:bg-indigo-100 transition-colors text-left"
            >
                <div className="flex items-center justify-between mb-1">
                    <Badge variant="secondary" className="bg-indigo-600 text-white hover:bg-indigo-700 text-[10px] h-5 px-1.5">
                        DEMO MODE
                    </Badge>
                    <ChevronDown className={`h-3 w-3 text-indigo-400 transition-transform ${open ? "rotate-180" : ""}`} />
                </div>
                <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-indigo-700" />
                    <span className="font-semibold text-sm text-indigo-900">{current.label}</span>
                </div>
            </button>

            {/* Dropdown Content */}
            {open && (
                <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-[9999] py-1">
                    <div className="px-3 py-1.5 text-xs text-slate-500 font-normal">
                        Select Industry Demo
                    </div>
                    <div className="h-px bg-slate-100 mx-1" />
                    {INDUSTRIES.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => {
                                setIndustry(item.id);
                                setOpen(false);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-indigo-50 transition-colors text-left"
                        >
                            <item.icon className={`h-4 w-4 ${industry === item.id ? "text-indigo-600" : "text-slate-400"}`} />
                            <span className={industry === item.id ? "font-semibold text-indigo-900" : "text-slate-700"}>
                                {item.label}
                            </span>
                            {industry === item.id && (
                                <div className="ml-auto h-1.5 w-1.5 rounded-full bg-indigo-600" />
                            )}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
