"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Settings2, Tag } from "lucide-react";
import { toggleAutomation, saveAutomationConfig } from "@/app/actions/automations";
import { toast } from "sonner";

// Import all icons used
import {
    PhoneMissed, CalendarX, History, Star, Gift, CalendarClock,
    MessageSquare, UserPlus, Megaphone, ListRestart, Info,
    Receipt, BrainCircuit, Sparkles, Bot, Moon, MousePointerClick, FileText
} from "lucide-react";

// Icon map
const ICON_MAP: Record<string, any> = {
    PhoneMissed, CalendarX, History, Star, Gift, CalendarClock,
    MessageSquare, UserPlus, Megaphone, ListRestart, Info,
    Receipt, BrainCircuit, Sparkles, Bot, Moon, MousePointerClick, FileText
};

interface AutomationProps {
    merchantId: string;
    data: {
        id: string;
        title: string;
        description: string;
        iconName: string;
        defaultMessage?: string;
        triggerType?: 'event' | 'tag' | 'schedule' | 'ai';
        triggerTag?: string;
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

    const Icon = ICON_MAP[data.iconName] || Sparkles;

    const getTriggerBadge = () => {
        if (data.triggerType === 'tag' && data.triggerTag) {
            return (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-1 bg-purple-50 text-purple-700 border-purple-200">
                    <Tag className="h-2.5 w-2.5" />
                    Triggered by Tag
                </Badge>
            );
        }
        if (data.triggerType === 'schedule') {
            return (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-blue-50 text-blue-700 border-blue-200">
                    Schedule Based
                </Badge>
            );
        }
        if (data.triggerType === 'ai') {
            return (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-gradient-to-r from-purple-50 to-blue-50 text-purple-700 border-purple-200">
                    AI Powered
                </Badge>
            );
        }
        return null;
    };

    return (
        <Card className={`transition-all flex flex-col ${isActive ? 'border-primary shadow-md bg-primary/5' : 'hover:border-slate-300'}`}>
            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-lg ${isActive ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                        <Icon className="h-5 w-5" />
                    </div>
                    {isActive && (
                        <span className="text-xs font-medium text-primary px-2 py-0.5 bg-white rounded-full border border-primary/20">
                            Active
                        </span>
                    )}
                </div>
                <Switch checked={isActive} onCheckedChange={handleToggle} />
            </CardHeader>

            <CardContent className="pt-4 flex-1">
                <CardTitle className="text-lg mb-2">{data.title}</CardTitle>
                <CardDescription className="line-clamp-2 mb-2">
                    {data.description}
                </CardDescription>
                {getTriggerBadge()}
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
                            <DialogDescription>
                                Customize how this automation behaves.
                                {data.triggerTag && (
                                    <span className="block mt-2 text-purple-600 font-medium">
                                        Triggered when a customer is tagged as "{data.triggerTag}"
                                    </span>
                                )}
                            </DialogDescription>
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
                                <p className="text-xs text-muted-foreground">
                                    Use [Link] as a placeholder for booking/review links.
                                </p>
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