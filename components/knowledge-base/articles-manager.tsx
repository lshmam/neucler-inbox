'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Search, BookOpen, Loader2 } from 'lucide-react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { createKnowledgeBaseArticle, updateKnowledgeBaseArticle, deleteKnowledgeBaseArticle, KnowledgeBaseArticle } from '@/app/actions/knowledge-base';

interface ArticlesManagerProps {
    initialArticles: KnowledgeBaseArticle[];
}

export function ArticlesManager({ initialArticles }: ArticlesManagerProps) {
    const router = useRouter();
    const [articles, setArticles] = useState<KnowledgeBaseArticle[]>(initialArticles);
    const [isLoading, setIsLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // Dialog State
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isConvertDialogOpen, setIsConvertDialogOpen] = useState(false); // If we add ticket conversion later
    const [editingArticle, setEditingArticle] = useState<KnowledgeBaseArticle | null>(null);

    // Form State
    const [formData, setFormData] = useState({
        title: '',
        content: '',
        category: 'General'
    });

    const filteredArticles = articles.filter(article =>
        article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        article.content.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleOpenDialog = (article?: KnowledgeBaseArticle) => {
        if (article) {
            setEditingArticle(article);
            setFormData({
                title: article.title,
                content: article.content,
                category: article.category || 'General'
            });
        } else {
            setEditingArticle(null);
            setFormData({
                title: '',
                content: '',
                category: 'General'
            });
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
                toast.success("Article updated successfully");
            } else {
                await createKnowledgeBaseArticle(formData);
                toast.success("Article created successfully");
            }

            router.refresh();
            setIsDialogOpen(false);
        } catch (error) {
            toast.error("Failed to save article");
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this article?")) return;

        setIsLoading(true);
        try {
            await deleteKnowledgeBaseArticle(id);
            toast.success("Article deleted");
            router.refresh();
        } catch (error) {
            toast.error("Failed to delete article");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="relative w-72">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search articles..."
                        className="pl-8"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <Button onClick={() => handleOpenDialog()}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Article
                </Button>
            </div>

            <div className="border rounded-md">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Title</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredArticles.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                                    No articles found. Add one to help your AI agent.
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredArticles.map((article) => (
                                <TableRow key={article.id}>
                                    <TableCell className="font-medium">
                                        <div className="flex items-start gap-2">
                                            <BookOpen className="h-4 w-4 mt-1 text-blue-500 shrink-0" />
                                            <div>
                                                {article.title}
                                                <p className="text-xs text-muted-foreground truncate max-w-[300px]">
                                                    {article.content.substring(0, 60)}...
                                                </p>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline">{article.category || 'General'}</Badge>
                                    </TableCell>
                                    <TableCell>
                                        <span className="flex items-center gap-1.5 text-xs text-green-600 font-medium bg-green-500/10 px-2 py-1 rounded w-fit">
                                            <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                                            Active
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(article)}>
                                                <Pencil className="h-4 w-4 text-muted-foreground" />
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => handleDelete(article.id)}>
                                                <Trash2 className="h-4 w-4 text-red-500" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                        <DialogTitle>{editingArticle ? 'Edit Article' : 'Create Article'}</DialogTitle>
                        <DialogDescription>
                            Add information here for your AI agent to reference when answering customer questions.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="category">Category</Label>
                            <Select
                                value={formData.category}
                                onValueChange={(val) => setFormData({ ...formData, category: val })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select category" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="General">General</SelectItem>
                                    <SelectItem value="Pricing">Pricing</SelectItem>
                                    <SelectItem value="Services">Services</SelectItem>
                                    <SelectItem value="Policies">Policies</SelectItem>
                                    <SelectItem value="Technical">Technical</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="title">Question / Topic</Label>
                            <Input
                                id="title"
                                placeholder="e.g., What is your return policy?"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="content">Answer / Content</Label>
                            <Textarea
                                id="content"
                                placeholder="e.g., You can return items within 30 days..."
                                className="min-h-[150px]"
                                value={formData.content}
                                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleSave} disabled={isLoading}>
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save Article
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
