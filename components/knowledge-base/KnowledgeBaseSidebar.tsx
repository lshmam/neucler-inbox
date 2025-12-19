'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { Search, Copy, Check, Pin, BookOpen, X, ChevronDown, ChevronUp } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// Types
type SOP = {
    id: string;
    category: 'Billing' | 'Technical' | 'Scheduling' | 'General' | 'FAQ';
    question: string;
    answer: string;
    isPinned?: boolean;
};

interface KnowledgeBaseSidebarProps {
    articles?: {
        id: string;
        title: string;
        content: string;
        category: string | null;
    }[];
    isOpen?: boolean;
    onClose?: () => void;
}

// Category colors
const categoryColors: Record<string, { bg: string; text: string; border: string }> = {
    'Billing': { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
    'Technical': { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
    'Scheduling': { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
    'General': { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200' },
    'FAQ': { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
    'Services': { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
    'Pricing': { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
};

// SOP Card component
function SOPCard({ sop, onCopy }: { sop: SOP; onCopy: (answer: string) => void }) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isCopied, setIsCopied] = useState(false);

    const handleCopy = () => {
        onCopy(sop.answer);
        navigator.clipboard.writeText(sop.answer);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    };

    const colors = categoryColors[sop.category] || categoryColors['General'];
    const isLongContent = sop.answer.length > 150;

    return (
        <div className={cn(
            "group rounded-lg border p-3 transition-all hover:shadow-md cursor-pointer",
            colors.bg, colors.border
        )}>
            {/* Header */}
            <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        {sop.isPinned && <Pin className="h-3 w-3 text-amber-500 shrink-0" />}
                        <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", colors.text, colors.border)}>
                            {sop.category}
                        </Badge>
                    </div>
                    <h4 className="font-medium text-sm text-slate-900 leading-tight">
                        {sop.question}
                    </h4>
                </div>
                <Button
                    size="sm"
                    variant="ghost"
                    className={cn(
                        "h-7 w-7 p-0 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity",
                        isCopied && "opacity-100 text-green-600"
                    )}
                    onClick={(e) => {
                        e.stopPropagation();
                        handleCopy();
                    }}
                >
                    {isCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
            </div>

            {/* Body */}
            <p className={cn(
                "text-xs text-slate-600 mt-2 leading-relaxed",
                !isExpanded && isLongContent && "line-clamp-2"
            )}>
                {sop.answer}
            </p>

            {/* Expand/Collapse */}
            {isLongContent && (
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="flex items-center gap-1 text-[10px] text-slate-500 mt-2 hover:text-slate-700 transition-colors"
                >
                    {isExpanded ? (
                        <>
                            <ChevronUp className="h-3 w-3" /> Show less
                        </>
                    ) : (
                        <>
                            <ChevronDown className="h-3 w-3" /> Show more
                        </>
                    )}
                </button>
            )}
        </div>
    );
}

export function KnowledgeBaseSidebar({ articles = [], isOpen = true, onClose }: KnowledgeBaseSidebarProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [copiedToast, setCopiedToast] = useState(false);
    const searchInputRef = useRef<HTMLInputElement>(null);

    // Convert articles to SOP format
    const sops: SOP[] = useMemo(() => {
        return articles.map(article => ({
            id: article.id,
            category: (article.category as SOP['category']) || 'General',
            question: article.title,
            answer: article.content,
            isPinned: false // Could add this to DB later
        }));
    }, [articles]);

    // Keyboard shortcut for search
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === '/' && !e.ctrlKey && !e.metaKey) {
                const activeElement = document.activeElement;
                const isTyping = activeElement?.tagName === 'INPUT' || activeElement?.tagName === 'TEXTAREA';
                if (!isTyping) {
                    e.preventDefault();
                    searchInputRef.current?.focus();
                }
            }
            if (e.key === 'Escape' && searchTerm) {
                setSearchTerm('');
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [searchTerm]);

    // Fuzzy search filter
    const filteredSops = useMemo(() => {
        if (!searchTerm.trim()) {
            // No search: show pinned first, then by category
            const pinned = sops.filter(s => s.isPinned);
            const unpinned = sops.filter(s => !s.isPinned);
            return [...pinned, ...unpinned];
        }

        const term = searchTerm.toLowerCase();
        return sops.filter(sop =>
            sop.question.toLowerCase().includes(term) ||
            sop.answer.toLowerCase().includes(term) ||
            sop.category.toLowerCase().includes(term)
        );
    }, [sops, searchTerm]);

    // Group by category when not searching
    const groupedSops = useMemo(() => {
        if (searchTerm.trim()) {
            return { 'Search Results': filteredSops };
        }

        const pinned = filteredSops.filter(s => s.isPinned);
        const unpinned = filteredSops.filter(s => !s.isPinned);

        const groups: Record<string, SOP[]> = {};

        if (pinned.length > 0) {
            groups['📌 Pinned'] = pinned;
        }

        unpinned.forEach(sop => {
            const cat = sop.category || 'General';
            if (!groups[cat]) groups[cat] = [];
            groups[cat].push(sop);
        });

        return groups;
    }, [filteredSops, searchTerm]);

    const handleCopy = (answer: string) => {
        setCopiedToast(true);
        setTimeout(() => setCopiedToast(false), 2000);
    };

    if (!isOpen) return null;

    return (
        <div className="w-80 h-full bg-white border-l border-slate-200 flex flex-col shadow-lg">
            {/* Header */}
            <div className="p-4 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <BookOpen className="h-5 w-5 text-[#004789]" />
                        <h2 className="font-semibold text-slate-900">Knowledge Base</h2>
                    </div>
                    {onClose && (
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onClose}>
                            <X className="h-4 w-4" />
                        </Button>
                    )}
                </div>

                {/* Sticky Search */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                        ref={searchInputRef}
                        placeholder="Search SOPs..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9 pr-8 h-9 text-sm bg-white"
                    />
                    {searchTerm && (
                        <button
                            onClick={() => setSearchTerm('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                            <X className="h-3 w-3" />
                        </button>
                    )}
                </div>
                <p className="text-[10px] text-slate-400 mt-1.5 text-center">
                    Press <kbd className="px-1.5 py-0.5 bg-slate-100 rounded text-[9px] font-mono">/</kbd> to search
                </p>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-3 space-y-4">
                {Object.entries(groupedSops).map(([category, items]) => (
                    <div key={category}>
                        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-1">
                            {category} ({items.length})
                        </h3>
                        <div className="space-y-2">
                            {items.map(sop => (
                                <SOPCard key={sop.id} sop={sop} onCopy={handleCopy} />
                            ))}
                        </div>
                    </div>
                ))}

                {filteredSops.length === 0 && (
                    <div className="text-center py-8 text-slate-400">
                        <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-40" />
                        <p className="text-sm">No SOPs found</p>
                        {searchTerm && (
                            <p className="text-xs mt-1">Try a different search term</p>
                        )}
                    </div>
                )}
            </div>

            {/* Copied Toast */}
            {copiedToast && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-lg animate-in fade-in slide-in-from-bottom-2">
                    <Check className="h-3 w-3 text-green-400" />
                    Copied to clipboard!
                </div>
            )}

            {/* Footer Stats */}
            <div className="p-3 border-t border-slate-200 bg-slate-50">
                <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>{sops.length} SOPs available</span>
                    <span>{filteredSops.length} showing</span>
                </div>
            </div>
        </div>
    );
}

export default KnowledgeBaseSidebar;
