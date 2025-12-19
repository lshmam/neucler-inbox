'use client';

import { useState, useMemo } from 'react';
import { Search, Copy, Check, Plus, Pencil, Trash2, BookOpen, ChevronDown, ChevronUp, SlidersHorizontal } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { createKnowledgeBaseArticle, updateKnowledgeBaseArticle, deleteKnowledgeBaseArticle } from '@/app/actions/knowledge-base';
import { useRouter } from 'next/navigation';

interface Article {
    id: string;
    title: string;
    content: string;
    category: string | null;
    is_published: boolean;
    created_at: string;
}

interface KnowledgeBasePageClientProps {
    articles: Article[];
    aiName: string;
    aiTone: string;
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

const CATEGORIES = ['General', 'Billing', 'Technical', 'Scheduling', 'FAQ', 'Services', 'Pricing'];

// SOP Card component
function SOPCard({
    article,
    onEdit,
    onDelete
}: {
    article: Article;
    onEdit: (article: Article) => void;
    onDelete: (id: string) => void;
}) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isCopied, setIsCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(article.content);
        setIsCopied(true);
        toast.success('Copied to clipboard!');
        setTimeout(() => setIsCopied(false), 2000);
    };

    const colors = categoryColors[article.category || 'General'] || categoryColors['General'];
    const isLongContent = article.content.length > 200;

    return (
        <div className={cn(
            "group rounded-xl border-2 p-4 transition-all hover:shadow-lg cursor-pointer bg-white",
            colors.border
        )}>
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className={cn("text-xs px-2 py-0.5", colors.bg, colors.text, colors.border)}>
                            {article.category || 'General'}
                        </Badge>
                    </div>
                    <h3 className="font-semibold text-slate-900 leading-tight text-base">
                        {article.title}
                    </h3>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                        size="sm"
                        variant="ghost"
                        className={cn("h-8 w-8 p-0", isCopied && "text-green-600")}
                        onClick={(e) => { e.stopPropagation(); handleCopy(); }}
                        title="Copy answer"
                    >
                        {isCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                    <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-blue-600"
                        onClick={(e) => { e.stopPropagation(); onEdit(article); }}
                        title="Edit"
                    >
                        <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-red-600"
                        onClick={(e) => { e.stopPropagation(); onDelete(article.id); }}
                        title="Delete"
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Body */}
            <p className={cn(
                "text-sm text-slate-600 mt-3 leading-relaxed whitespace-pre-wrap",
                !isExpanded && isLongContent && "line-clamp-3"
            )}>
                {article.content}
            </p>

            {/* Expand/Collapse */}
            {isLongContent && (
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="flex items-center gap-1 text-xs text-[#004789] mt-3 hover:underline font-medium"
                >
                    {isExpanded ? (
                        <><ChevronUp className="h-3 w-3" /> Show less</>
                    ) : (
                        <><ChevronDown className="h-3 w-3" /> Show more</>
                    )}
                </button>
            )}
        </div>
    );
}

export function KnowledgeBasePageClient({ articles, aiName, aiTone }: KnowledgeBasePageClientProps) {
    const router = useRouter();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingArticle, setEditingArticle] = useState<Article | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        content: '',
        category: 'General'
    });

    // Filter articles
    const filteredArticles = useMemo(() => {
        let result = articles;

        // Category filter
        if (selectedCategory !== 'all') {
            result = result.filter(a => a.category === selectedCategory);
        }

        // Search filter
        if (searchTerm.trim()) {
            const term = searchTerm.toLowerCase();
            result = result.filter(a =>
                a.title.toLowerCase().includes(term) ||
                a.content.toLowerCase().includes(term) ||
                (a.category || '').toLowerCase().includes(term)
            );
        }

        return result;
    }, [articles, searchTerm, selectedCategory]);

    // Group by category
    const groupedArticles = useMemo(() => {
        const groups: Record<string, Article[]> = {};
        filteredArticles.forEach(article => {
            const cat = article.category || 'General';
            if (!groups[cat]) groups[cat] = [];
            groups[cat].push(article);
        });
        return groups;
    }, [filteredArticles]);

    const handleOpenDialog = (article?: Article) => {
        if (article) {
            setEditingArticle(article);
            setFormData({
                title: article.title,
                content: article.content,
                category: article.category || 'General'
            });
        } else {
            setEditingArticle(null);
            setFormData({ title: '', content: '', category: 'General' });
        }
        setIsDialogOpen(true);
    };

    const handleSave = async () => {
        if (!formData.title || !formData.content) {
            toast.error("Title and content are required");
            return;
        }

        setIsLoading(true);
        try {
            if (editingArticle) {
                await updateKnowledgeBaseArticle(editingArticle.id, formData);
                toast.success("Article updated!");
            } else {
                await createKnowledgeBaseArticle(formData);
                toast.success("Article created!");
            }
            router.refresh();
            setIsDialogOpen(false);
        } catch (error) {
            toast.error("Failed to save article");
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this article?")) return;

        try {
            await deleteKnowledgeBaseArticle(id);
            toast.success("Article deleted");
            router.refresh();
        } catch (error) {
            toast.error("Failed to delete");
        }
    };

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                        <BookOpen className="h-7 w-7 text-[#004789]" />
                        Knowledge Base
                    </h1>
                    <p className="text-slate-500 mt-1">
                        {articles.length} SOPs available • AI uses these to answer questions
                    </p>
                </div>
                <Button onClick={() => handleOpenDialog()} className="gap-2 bg-[#004789] hover:bg-[#003366]">
                    <Plus className="h-4 w-4" />
                    Add SOP
                </Button>
            </div>

            {/* Search & Filters */}
            <div className="flex items-center gap-4 bg-white rounded-xl p-4 border shadow-sm">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                        placeholder="Search SOPs... (e.g., 'oil change price')"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 h-10"
                    />
                </div>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger className="w-[180px] h-10">
                        <SlidersHorizontal className="h-4 w-4 mr-2 text-slate-400" />
                        <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        {CATEGORIES.map(cat => (
                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Articles Grid */}
            {Object.keys(groupedArticles).length > 0 ? (
                <div className="space-y-8">
                    {Object.entries(groupedArticles).map(([category, items]) => (
                        <div key={category}>
                            <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                                <Badge variant="outline" className={cn("text-xs", categoryColors[category]?.bg, categoryColors[category]?.text)}>
                                    {category}
                                </Badge>
                                <span className="text-slate-400">({items.length})</span>
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {items.map(article => (
                                    <SOPCard
                                        key={article.id}
                                        article={article}
                                        onEdit={handleOpenDialog}
                                        onDelete={handleDelete}
                                    />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-16 bg-white rounded-xl border">
                    <BookOpen className="h-12 w-12 mx-auto text-slate-300 mb-4" />
                    <h3 className="text-lg font-medium text-slate-700 mb-2">No SOPs found</h3>
                    <p className="text-slate-500 mb-4">
                        {searchTerm ? "Try a different search term" : "Add your first SOP to help your AI agent answer questions"}
                    </p>
                    <Button onClick={() => handleOpenDialog()} variant="outline" className="gap-2">
                        <Plus className="h-4 w-4" />
                        Add SOP
                    </Button>
                </div>
            )}

            {/* Add/Edit Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                        <DialogTitle>{editingArticle ? 'Edit SOP' : 'Add New SOP'}</DialogTitle>
                        <DialogDescription>
                            SOPs help your AI agent answer customer questions accurately.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Question / Title</Label>
                            <Input
                                placeholder="e.g., How much for an oil change?"
                                value={formData.title}
                                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Answer / Script</Label>
                            <Textarea
                                placeholder="The script or answer your agent should use..."
                                value={formData.content}
                                onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                                rows={6}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Category</Label>
                            <Select
                                value={formData.category}
                                onValueChange={(v) => setFormData(prev => ({ ...prev, category: v }))}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {CATEGORIES.map(cat => (
                                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleSave} disabled={isLoading} className="bg-[#004789] hover:bg-[#003366]">
                            {isLoading ? 'Saving...' : (editingArticle ? 'Update' : 'Create')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
