"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Settings2 } from "lucide-react";
import { toggleAutomation, saveAutomationConfig } from "@/app/actions/automations";
import { toast } from "sonner";

// 1. IMPORT ALL ICONS USED
import {
    PhoneMissed, CalendarX, History, Star, Gift, CalendarClock,
    MessageSquare, UserPlus, Megaphone, ListRestart, Info,
    Receipt, BrainCircuit, Sparkles
} from "lucide-react";

// 2. CREATE A MAP
const ICON_MAP: Record<string, any> = {
    PhoneMissed, CalendarX, History, Star, Gift, CalendarClock,
    MessageSquare, UserPlus, Megaphone, ListRestart, Info,
    Receipt, BrainCircuit, Sparkles
};

interface AutomationProps {
    merchantId: string;
    data: {
        id: string;
        title: string;
        description: string;
        iconName: string; // CHANGED: Expect a string name
        defaultMessage?: string;
        inputs?: { label: string, key: string, type: string, placeholder?: string }[];
    };
    existingState?: any;
}

export function AutomationCard({ merchantId, data, existingState }: AutomationProps) {
    const [isActive, setIsActive] = useState(existingState?.is_active || false);
    const [config, setConfig] = useState(existingState?.config || { message: data.defaultMessage || "" });
    const [loading, setLoading] = useState(false);
    const [dialogOpen, setDialogOpen] = useState(false);

    const handleToggle = async () => {
        setIsActive(!isActive);
        try {
            await toggleAutomation(merchantId, data.id, isActive);
            toast.success(isActive ? "Automation Paused" : "Automation Activated");
        } catch (e) {
            setIsActive(isActive);
            toast.error("Failed to update status");
        }
    };

    const handleSaveConfig = async () => {
        setLoading(true);
        try {
            await saveAutomationConfig(merchantId, data.id, config);
            setIsActive(true);
            setDialogOpen(false);
            toast.success("Settings saved & activated");
        } catch (e) {
            toast.error("Failed to save settings");
        } finally {
            setLoading(false);
        }
    };

    // 3. RESOLVE THE ICON
    const Icon = ICON_MAP[data.iconName] || Sparkles;

    return (
        <Card className={`transition-all ${isActive ? 'border-primary shadow-md bg-primary/5' : 'hover:border-slate-300'}`}>
            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-lg ${isActive ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                        <Icon className="h-5 w-5" />
                    </div>
                    {isActive && <span className="text-xs font-medium text-primary px-2 py-0.5 bg-white rounded-full border border-primary/20">Active</span>}
                </div>
                <Switch checked={isActive} onCheckedChange={handleToggle} />
            </CardHeader>

            <CardContent className="pt-4">
                <CardTitle className="text-lg mb-2">{data.title}</CardTitle>
                <CardDescription className="line-clamp-2 h-10">
                    {data.description}
                </CardDescription>
            </CardContent>

            <CardFooter className="pt-0">
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                        <Button variant="outline" className="w-full">
                            <Settings2 className="w-4 h-4 mr-2" /> Configure
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{data.title}</DialogTitle>
                            <DialogDescription>Customize how this automation behaves.</DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4 py-4">
                            {data.inputs?.map((input) => (
                                <div key={input.key} className="space-y-2">
                                    <Label>{input.label}</Label>
                                    <Input
                                        type={input.type}
                                        placeholder={input.placeholder}
                                        value={config[input.key] || ""}
                                        onChange={(e) => setConfig({ ...config, [input.key]: e.target.value })}
                                    />
                                </div>
                            ))}

                            <div className="space-y-2">
                                <Label>SMS Template</Label>
                                <Textarea
                                    className="min-h-[100px]"
                                    value={config.message}
                                    onChange={(e) => setConfig({ ...config, message: e.target.value })}
                                    placeholder="Enter the message to send..."
                                />
                                <p className="text-xs text-muted-foreground">This message will be sent via Twilio.</p>
                            </div>
                        </div>

                        <DialogFooter>
                            <Button onClick={handleSaveConfig} disabled={loading}>
                                {loading ? "Saving..." : "Save & Activate"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </CardFooter>
        </Card>
    );
}