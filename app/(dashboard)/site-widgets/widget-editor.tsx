"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { MessageSquare, Send, Copy, Check, Save, Loader2 } from "lucide-react";
import { saveWidgetConfig } from "@/app/actions/widgets";
import { toast } from "sonner";

export function WidgetEditor({ merchantId, initialConfig }: any) {
    const [config, setConfig] = useState(initialConfig);
    const [loading, setLoading] = useState(false);
    const [copied, setCopied] = useState(false);

    // The Script Tag
    const scriptCode = `
<script 
  src="${process.env.NEXT_PUBLIC_APP_URL}/widget-loader.js" 
  data-merchant-id="${merchantId}"
  data-color="${config.primaryColor}"
  async
></script>
`.trim();

    const handleSave = async () => {
        setLoading(true);
        try {
            await saveWidgetConfig(merchantId, config);
            toast.success("Widget settings saved!");
        } catch (e) {
            toast.error("Failed to save.");
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(scriptCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        toast.success("Code copied to clipboard");
    };

    return (
        <div className="grid gap-8 lg:grid-cols-2">

            {/* LEFT: SETTINGS & CODE */}
            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Appearance</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>Brand Color</Label>
                            <div className="flex gap-2">
                                <Input
                                    type="color"
                                    className="w-12 h-10 p-1 cursor-pointer"
                                    value={config.primaryColor}
                                    onChange={(e) => setConfig({ ...config, primaryColor: e.target.value })}
                                />
                                <Input
                                    value={config.primaryColor}
                                    onChange={(e) => setConfig({ ...config, primaryColor: e.target.value })}
                                    className="font-mono uppercase"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Header Title</Label>
                            <Input
                                value={config.businessName}
                                onChange={(e) => setConfig({ ...config, businessName: e.target.value })}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Welcome Message</Label>
                            <Input
                                value={config.greeting}
                                onChange={(e) => setConfig({ ...config, greeting: e.target.value })}
                            />
                        </div>

                        <Button onClick={handleSave} disabled={loading} className="w-full">
                            {loading ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2 h-4 w-4" />}
                            Save Changes
                        </Button>
                    </CardContent>
                </Card>

                <Card className="bg-slate-950 border-slate-800">
                    <CardHeader>
                        <CardTitle className="text-white">Installation Code</CardTitle>
                        <CardDescription className="text-slate-400">
                            Paste this before the closing <code className="text-orange-400">&lt;/body&gt;</code> tag on your website.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="relative">
                            <pre className="bg-slate-900 p-4 rounded-lg text-xs text-slate-300 font-mono overflow-x-auto border border-slate-800">
                                {scriptCode}
                            </pre>
                            <Button
                                size="icon"
                                variant="secondary"
                                className="absolute top-2 right-2 h-8 w-8 bg-slate-700 hover:bg-slate-600 border-none text-white"
                                onClick={handleCopy}
                            >
                                {copied ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* RIGHT: PREVIEW */}
            <div className="flex justify-center items-end pb-10 bg-slate-100 rounded-xl border-2 border-dashed relative min-h-[600px] overflow-hidden">
                <div className="absolute inset-0 opacity-5 pointer-events-none"
                    style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
                </div>

                <p className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-slate-400 font-medium">
                    Website Preview Area
                </p>

                {/* THE WIDGET MOCKUP */}
                <div className="relative w-[350px] h-[500px] bg-white rounded-t-xl shadow-2xl flex flex-col border border-slate-200 animate-in slide-in-from-bottom-10 fade-in duration-700">

                    {/* Header */}
                    <div
                        className="p-4 text-white flex items-center gap-3 rounded-t-xl"
                        style={{ backgroundColor: config.primaryColor }}
                    >
                        <div className="bg-white/20 p-2 rounded-full">
                            <MessageSquare className="h-5 w-5" />
                        </div>
                        <div>
                            <div className="font-bold">{config.businessName}</div>
                            <div className="text-xs opacity-90">Online</div>
                        </div>
                    </div>

                    {/* Body */}
                    <div className="flex-1 p-4 bg-slate-50 space-y-4 overflow-y-auto">
                        <div className="flex justify-start">
                            <div className="bg-white border rounded-lg rounded-tl-none p-3 text-sm shadow-sm max-w-[80%]">
                                {config.greeting}
                            </div>
                        </div>
                        <div className="flex justify-end">
                            <div
                                className="text-white rounded-lg rounded-tr-none p-3 text-sm shadow-sm max-w-[80%]"
                                style={{ backgroundColor: config.primaryColor }}
                            >
                                Do you have any availability today?
                            </div>
                        </div>
                        <div className="flex justify-start">
                            <div className="bg-white border rounded-lg rounded-tl-none p-3 text-sm shadow-sm max-w-[80%]">
                                Checking for you... Yes, we have a slot at 3pm!
                            </div>
                        </div>
                    </div>

                    {/* Input */}
                    <div className="p-3 border-t bg-white flex gap-2">
                        <Input placeholder="Type a message..." className="focus-visible:ring-0" readOnly />
                        <div
                            className="h-10 w-10 flex items-center justify-center rounded-md text-white"
                            style={{ backgroundColor: config.primaryColor }}
                        >
                            <Send className="h-4 w-4" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}