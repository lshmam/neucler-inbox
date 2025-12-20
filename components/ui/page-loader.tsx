"use client";

import { motion } from "framer-motion";

export function PageLoader() {
    return (
        <div className="flex-1 flex items-center justify-center min-h-[60vh]">
            <div className="flex flex-col items-center gap-4">
                {/* Animated Logo/Spinner */}
                <div className="relative">
                    {/* Outer ring */}
                    <motion.div
                        className="w-16 h-16 rounded-full border-4 border-slate-200"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    />
                    {/* Inner spinning arc */}
                    <motion.div
                        className="absolute inset-0 w-16 h-16 rounded-full border-4 border-transparent border-t-blue-600 border-r-blue-600"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    />
                    {/* Center pulse */}
                    <motion.div
                        className="absolute inset-0 flex items-center justify-center"
                        animate={{ scale: [1, 1.1, 1] }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                    >
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600" />
                    </motion.div>
                </div>

                {/* Loading text with animated dots */}
                <div className="flex items-center gap-1 text-slate-500 font-medium">
                    <span>Loading</span>
                    <motion.span
                        animate={{ opacity: [0, 1, 0] }}
                        transition={{ duration: 1.5, repeat: Infinity, delay: 0 }}
                    >.</motion.span>
                    <motion.span
                        animate={{ opacity: [0, 1, 0] }}
                        transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
                    >.</motion.span>
                    <motion.span
                        animate={{ opacity: [0, 1, 0] }}
                        transition={{ duration: 1.5, repeat: Infinity, delay: 0.4 }}
                    >.</motion.span>
                </div>
            </div>
        </div>
    );
}

// Skeleton loader variants for different content types
export function CardSkeleton() {
    return (
        <div className="rounded-xl border border-slate-200 bg-white p-6 animate-pulse">
            <div className="h-4 w-1/3 bg-slate-200 rounded mb-4" />
            <div className="h-8 w-1/2 bg-slate-200 rounded mb-2" />
            <div className="h-3 w-2/3 bg-slate-100 rounded" />
        </div>
    );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
    return (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden animate-pulse">
            {/* Header */}
            <div className="border-b border-slate-100 p-4 flex gap-4">
                {[1, 2, 3, 4].map(i => (
                    <div key={i} className="h-4 bg-slate-200 rounded flex-1" />
                ))}
            </div>
            {/* Rows */}
            {Array.from({ length: rows }).map((_, i) => (
                <div key={i} className="border-b border-slate-50 p-4 flex gap-4">
                    {[1, 2, 3, 4].map(j => (
                        <div key={j} className="h-4 bg-slate-100 rounded flex-1" />
                    ))}
                </div>
            ))}
        </div>
    );
}

export function InboxSkeleton() {
    return (
        <div className="h-screen flex overflow-hidden bg-slate-50">
            {/* Left pane skeleton */}
            <div className="w-80 border-r border-slate-200 bg-white p-4 space-y-3">
                <div className="h-10 bg-slate-100 rounded-lg animate-pulse" />
                <div className="h-8 bg-slate-50 rounded-lg animate-pulse" />
                {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="h-20 bg-slate-50 rounded-xl animate-pulse" />
                ))}
            </div>
            {/* Center pane skeleton */}
            <div className="flex-1 p-6 space-y-4">
                <div className="h-12 w-1/3 bg-slate-100 rounded-lg animate-pulse" />
                <div className="flex-1 space-y-3">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className={`h-16 rounded-xl animate-pulse ${i % 2 === 0 ? 'w-2/3 bg-slate-100' : 'w-1/2 ml-auto bg-blue-50'}`} />
                    ))}
                </div>
            </div>
        </div>
    );
}

export function DashboardSkeleton() {
    return (
        <div className="flex-1 space-y-6 p-8 pt-6">
            {/* KPI Cards */}
            <div className="grid gap-4 md:grid-cols-3">
                {[1, 2, 3].map(i => <CardSkeleton key={i} />)}
            </div>
            {/* Charts */}
            <div className="grid gap-6 lg:grid-cols-3">
                <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white p-6 h-[350px] animate-pulse">
                    <div className="h-4 w-1/4 bg-slate-200 rounded mb-6" />
                    <div className="h-full bg-slate-50 rounded-lg" />
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-6 animate-pulse">
                    <div className="h-4 w-1/3 bg-slate-200 rounded mb-4" />
                    <div className="space-y-3">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="h-14 bg-slate-50 rounded-lg" />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
