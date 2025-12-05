"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Send, Loader2, ArrowLeft, Smartphone, Info } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

export default function NewSMSCampaign() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [name, setName] = useState("");
    const [audience, setAudience] = useState("all");
    const [message, setMessage] = useState("");

    // SMS Compliance
    const SUFFIX = "\n\nReply STOP to opt out.";
    const totalLength = message.length + SUFFIX.length;
    const segments = Math.ceil(totalLength / 160);

    const handleSend = async () => {
        if (!message || !name) return toast.error("Please fill out all fields");

        setLoading(true);
        try {
            const res = await fetch("/api/sms/broadcast", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, audience, message })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            toast.success(`Sent to ${data.count} people!`);
            router.push("/sms");
            router.refresh();
        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex-1 max-w-5xl mx-auto p-8 pt-6 space-y-6">
            <div className="flex items-center gap-4 mb-6">
                <Link href="/sms">
                    <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
                </Link>
                <h2 className="text-3xl font-bold tracking-tight">New SMS Blast</h2>
            </div>

            <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
                {/* LEFT: FORM */}
                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <CardHeader><CardTitle>Campaign Details</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Campaign Name</Label>
                                    <Input placeholder="e.g. Flash Sale" value={name} onChange={e => setName(e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Audience</Label>
                                    <Select defaultValue="all" onValueChange={setAudience}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Customers</SelectItem>
                                            <SelectItem value="vip">VIPs ($500+ Spend)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Message</Label>
                                <Textarea
                                    className="min-h-[150px] text-base"
                                    placeholder="Hey! We have 2 slots open today at 3pm..."
                                    value={message}
                                    onChange={e => setMessage(e.target.value)}
                                />
                                <div className="flex justify-between text-xs text-muted-foreground">
                                    <span>~{totalLength} characters (Includes opt-out)</span>
                                    <span className={segments > 1 ? "text-orange-600 font-bold" : "text-green-600"}>
                                        {segments} Segment{segments !== 1 ? 's' : ''} Cost
                                    </span>
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter className="bg-slate-50/50 border-t p-4 flex justify-between">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Info className="h-3 w-3" /> Cost depends on segments per user.
                            </div>
                            <Button onClick={handleSend} disabled={loading} className="bg-green-600 hover:bg-green-700">
                                {loading ? <Loader2 className="animate-spin mr-2" /> : <Send className="mr-2 h-4 w-4" />}
                                Send Text Blast
                            </Button>
                        </CardFooter>
                    </Card>
                </div>

                {/* RIGHT: PREVIEW */}
                <div className="space-y-6">
                    <h3 className="font-medium text-sm text-muted-foreground">Mobile Preview</h3>
                    <div className="mx-auto border-4 border-slate-800 rounded-[2rem] overflow-hidden bg-slate-100 w-[280px] h-[500px] relative shadow-xl">
                        <div className="absolute top-0 left-0 right-0 h-6 bg-slate-800 z-10 flex justify-center">
                            <div className="w-16 h-4 bg-black rounded-b-xl" />
                        </div>
                        <div className="mt-20 px-4 space-y-3">
                            <div className="bg-white p-3 rounded-xl rounded-tl-none shadow-sm text-sm text-slate-800">
                                {message || "Draft your message..."}
                                <br /><br />
                                <span className="text-slate-400 text-xs">Reply STOP to opt out.</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}