"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bot, MessageSquare, FileText, Calendar, Code, Save, Copy, Loader2, Smartphone, Monitor } from "lucide-react";
import { toast } from "sonner"; // If you have sonner installed, or use alert

interface WidgetProps {
    widgets: any[];
    merchantId: string;
}

export function WebIntegrationClient({ widgets, merchantId }: WidgetProps) {
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState("chat");

    // --- STATE MANAGEMENT ---
    // 1. Chatbot State
    const [chatConfig, setChatConfig] = useState(widgets.find(w => w.widget_type === 'chat')?.config || {
        botName: "Support AI",
        welcomeMessage: "Hi! How can I help you today?",
        primaryColor: "#906CDD",
        position: "bottom-right"
    });

    // 2. Form State
    const [formConfig, setFormConfig] = useState(widgets.find(w => w.widget_type === 'form')?.config || {
        title: "Contact Us",
        buttonText: "Send Message",
        fields: { name: true, email: true, phone: true, message: true }
    });

    // Helper to save settings
    const handleSave = async (type: string, config: any) => {
        setSaving(true);
        try {
            const res = await fetch("/api/widgets/save", {
                method: "POST",
                body: JSON.stringify({ type, config, is_active: true })
            });
            if (res.ok) {
                alert("Widget Settings Saved!"); // Replace with toast if available
            }
        } catch (e) { console.error(e); }
        setSaving(false);
    };

    // Helper to generate embed code
    const getEmbedCode = (type: string) => {
        return `<script src="https://cdn.Neucler.com/loader.js" \n  data-merchant-id="${merchantId}" \n  data-widget="${type}"></script>`;
    };

    return (
        <div className="flex-1 space-y-6 p-8 pt-6 bg-gray-50/50 min-h-screen">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Web Integration</h2>
                    <p className="text-muted-foreground">Generate widgets to embed on your website.</p>
                </div>
            </div>

            <Tabs defaultValue="chat" value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
                    <TabsTrigger value="chat"><Bot className="w-4 h-4 mr-2" /> AI Chatbot</TabsTrigger>
                    <TabsTrigger value="form"><FileText className="w-4 h-4 mr-2" /> Lead Form</TabsTrigger>
                    <TabsTrigger value="booking"><Calendar className="w-4 h-4 mr-2" /> Booking</TabsTrigger>
                </TabsList>

                {/* --- CHATBOT CONFIG --- */}
                <TabsContent value="chat" className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Left: Settings */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Chatbot Settings</CardTitle>
                                <CardDescription>Customize the look and feel of your AI assistant.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Bot Name</Label>
                                    <Input value={chatConfig.botName} onChange={e => setChatConfig({ ...chatConfig, botName: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Welcome Message</Label>
                                    <Textarea value={chatConfig.welcomeMessage} onChange={e => setChatConfig({ ...chatConfig, welcomeMessage: e.target.value })} />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Primary Color</Label>
                                        <div className="flex gap-2">
                                            <Input type="color" value={chatConfig.primaryColor} onChange={e => setChatConfig({ ...chatConfig, primaryColor: e.target.value })} className="w-12 h-10 p-1 px-1" />
                                            <Input value={chatConfig.primaryColor} onChange={e => setChatConfig({ ...chatConfig, primaryColor: e.target.value })} />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Position</Label>
                                        <Select value={chatConfig.position} onValueChange={v => setChatConfig({ ...chatConfig, position: v })}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="bottom-right">Bottom Right</SelectItem>
                                                <SelectItem value="bottom-left">Bottom Left</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <Button onClick={() => handleSave('chat', chatConfig)} disabled={saving} className="w-full bg-[#906CDD]">
                                    {saving ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2 h-4 w-4" />} Save Settings
                                </Button>
                            </CardContent>
                        </Card>

                        {/* Right: Preview */}
                        <div className="space-y-6">
                            <Card className="bg-slate-100 border-dashed border-2 h-[400px] flex items-end justify-center relative overflow-hidden">
                                <div className="absolute top-4 left-4 text-xs text-muted-foreground flex items-center">
                                    <Monitor className="w-4 h-4 mr-1" /> Website Preview
                                </div>

                                {/* The Fake Chat Widget */}
                                <div className={`absolute m-6 flex flex-col items-end space-y-2 ${chatConfig.position === 'bottom-left' ? 'left-0 items-start' : 'right-0 items-end'}`}>

                                    {/* Message Bubble */}
                                    <div className="bg-white p-4 rounded-xl rounded-br-none shadow-lg border max-w-[250px] mb-2 animate-in fade-in slide-in-from-bottom-2">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-bold text-xs">{chatConfig.botName}</span>
                                            <span className="text-[10px] text-muted-foreground">Just now</span>
                                        </div>
                                        <p className="text-sm text-slate-600">{chatConfig.welcomeMessage}</p>
                                    </div>

                                    {/* Launcher Button */}
                                    <div
                                        className="h-14 w-14 rounded-full flex items-center justify-center text-white shadow-xl hover:scale-105 transition-transform cursor-pointer"
                                        style={{ backgroundColor: chatConfig.primaryColor }}
                                    >
                                        <MessageSquare className="h-7 w-7" />
                                    </div>
                                </div>
                            </Card>

                            <Card className="bg-slate-900 text-white">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-mono flex items-center gap-2">
                                        <Code className="h-4 w-4 text-green-400" /> Installation Code
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="bg-black/50 p-4 rounded-md font-mono text-xs text-slate-300 overflow-x-auto whitespace-pre-wrap border border-white/10">
                                        {getEmbedCode('chat')}
                                    </div>
                                    <Button variant="secondary" size="sm" className="mt-4 w-full" onClick={() => navigator.clipboard.writeText(getEmbedCode('chat'))}>
                                        <Copy className="mr-2 h-4 w-4" /> Copy Code
                                    </Button>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </TabsContent>

                {/* --- FORM CONFIG --- */}
                <TabsContent value="form" className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <Card>
                            <CardHeader>
                                <CardTitle>Lead Form Settings</CardTitle>
                                <CardDescription>A form for users to request appointments or quotes.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Form Title</Label>
                                    <Input value={formConfig.title} onChange={e => setFormConfig({ ...formConfig, title: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Button Text</Label>
                                    <Input value={formConfig.buttonText} onChange={e => setFormConfig({ ...formConfig, buttonText: e.target.value })} />
                                </div>
                                <div className="space-y-2 pt-2">
                                    <Label>Visible Fields</Label>
                                    <div className="grid grid-cols-2 gap-4 pt-2">
                                        <div className="flex items-center space-x-2">
                                            <Switch checked={formConfig.fields.name} onCheckedChange={c => setFormConfig({ ...formConfig, fields: { ...formConfig.fields, name: c } })} />
                                            <Label>Name</Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <Switch checked={formConfig.fields.phone} onCheckedChange={c => setFormConfig({ ...formConfig, fields: { ...formConfig.fields, phone: c } })} />
                                            <Label>Phone</Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <Switch checked={formConfig.fields.email} onCheckedChange={c => setFormConfig({ ...formConfig, fields: { ...formConfig.fields, email: c } })} />
                                            <Label>Email</Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <Switch checked={formConfig.fields.message} onCheckedChange={c => setFormConfig({ ...formConfig, fields: { ...formConfig.fields, message: c } })} />
                                            <Label>Message</Label>
                                        </div>
                                    </div>
                                </div>
                                <Button onClick={() => handleSave('form', formConfig)} disabled={saving} className="w-full bg-[#906CDD] mt-4">
                                    {saving ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2 h-4 w-4" />} Save Settings
                                </Button>
                            </CardContent>
                        </Card>

                        <div className="space-y-6">
                            <Card className="bg-white border-2 h-auto p-8 flex items-center justify-center relative overflow-hidden shadow-sm">
                                <div className="w-full max-w-md space-y-4 border p-6 rounded-lg shadow-lg">
                                    <h3 className="text-xl font-bold text-center">{formConfig.title}</h3>
                                    {formConfig.fields.name && <Input placeholder="Your Name" />}
                                    {formConfig.fields.email && <Input placeholder="Email Address" />}
                                    {formConfig.fields.phone && <Input placeholder="Phone Number" />}
                                    {formConfig.fields.message && <Textarea placeholder="How can we help?" />}
                                    <Button className="w-full">{formConfig.buttonText}</Button>
                                    <p className="text-xs text-center text-muted-foreground">Powered by Neucler</p>
                                </div>
                            </Card>

                            <Card className="bg-slate-900 text-white">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-mono flex items-center gap-2">
                                        <Code className="h-4 w-4 text-green-400" /> Installation Code
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="bg-black/50 p-4 rounded-md font-mono text-xs text-slate-300 overflow-x-auto whitespace-pre-wrap border border-white/10">
                                        {getEmbedCode('form')}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </TabsContent>

                {/* --- BOOKING BUTTON --- */}
                <TabsContent value="booking">
                    <Card>
                        <CardHeader>
                            <CardTitle>Booking Widget</CardTitle>
                            <CardDescription>A simple floating button that links to your Square Booking page.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground mb-4">
                                This widget will create a sticky "Book Now" button on your website that redirects customers to your configured Square Booking URL.
                            </p>
                            <Button variant="outline" onClick={() => handleSave('booking', { enabled: true })}>Enable Booking Widget</Button>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}