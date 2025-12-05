"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Send, Loader2, ArrowLeft, Users } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

export default function NewCampaignPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        title: "",
        subject: "",
        audience: "all",
        content: ""
    });

    const handleSend = async () => {
        if (!formData.subject || !formData.content) {
            toast.error("Please fill out all fields.");
            return;
        }

        setLoading(true);
        try {
            const res = await fetch("/api/campaigns/send", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData)
            });

            const data = await res.json();

            if (!res.ok) throw new Error(data.error || "Failed to send");

            toast.success(`Success! Sent to ${data.count} customers.`);
            router.push("/email");
            router.refresh();

        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex-1 max-w-5xl mx-auto p-8 pt-6 space-y-6">
            <div className="flex items-center gap-4 mb-6">
                <Link href="/email">
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                </Link>
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">New Email Campaign</h2>
                    <p className="text-muted-foreground">Draft your message and blast it to your customers.</p>
                </div>
            </div>

            <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">

                {/* LEFT COLUMN: THE FORM */}
                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Compose Message</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Campaign Name (Internal)</Label>
                                    <Input
                                        placeholder="e.g. October Newsletter"
                                        value={formData.title}
                                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Audience</Label>
                                    <Select
                                        defaultValue="all"
                                        onValueChange={(v) => setFormData({ ...formData, audience: v })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Customers</SelectItem>
                                            <SelectItem value="vip">VIPs (High Spenders)</SelectItem>
                                            <SelectItem value="new">New Customers</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Email Subject Line</Label>
                                <Input
                                    placeholder="Don't miss this deal!"
                                    value={formData.subject}
                                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Email Body</Label>
                                <Textarea
                                    className="min-h-[300px] font-sans text-base"
                                    placeholder="Write your message here..."
                                    value={formData.content}
                                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                                />
                            </div>
                        </CardContent>

                        {/* BUTTON MOVED HERE: Bottom of the main card */}
                        <CardFooter className="bg-slate-50/50 border-t p-4 flex justify-between items-center">
                            <p className="text-xs text-muted-foreground">
                                Sent via Mailgun • <span className="font-semibold text-green-600">Secure</span>
                            </p>
                            <Button size="lg" onClick={handleSend} disabled={loading} className="w-full sm:w-auto">
                                {loading ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Send className="mr-2 h-4 w-4" />}
                                Send Blast Now
                            </Button>
                        </CardFooter>
                    </Card>
                </div>

                {/* RIGHT COLUMN: PREVIEW */}
                <div className="space-y-6">
                    <div className="sticky top-6">
                        <h3 className="font-medium text-sm text-muted-foreground mb-4">Customer Preview</h3>
                        <Card className="border-2 border-slate-100 shadow-none">
                            <CardContent className="p-0">
                                {/* Email Client Header Simulation */}
                                <div className="bg-slate-100 p-4 border-b text-sm space-y-2">
                                    <div className="flex justify-between text-slate-500 text-xs">
                                        <span>From: Neucler</span>
                                        <span>Just now</span>
                                    </div>
                                    <div className="font-semibold text-slate-900 truncate">
                                        {formData.subject || "(No Subject)"}
                                    </div>
                                </div>

                                {/* Email Body Simulation */}
                                <div className="p-6 space-y-6 bg-white min-h-[300px]">
                                    <p className="text-sm">Hi <strong>[Customer Name]</strong>,</p>
                                    <div className="whitespace-pre-wrap text-sm text-slate-700 leading-relaxed">
                                        {formData.content || <span className="text-slate-300 italic">Start typing to preview content...</span>}
                                    </div>
                                    <div className="pt-6 border-t mt-4 text-xs text-slate-400">
                                        Your Business Name • <span className="underline">Unsubscribe</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>

            </div>
        </div>
    );
}