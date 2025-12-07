'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2, Save, Clock, Briefcase } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { updateBusinessProfileSettings } from '@/app/actions/knowledge-base';

interface BusinessInfoManagerProps {
    initialServices: string;
    initialHours: any;
    initialTone: string;
    initialAiName: string;
}

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

// Helper to convert 12-hour to 24-hour format
function convertTo24Hour(timeStr: string): string {
    if (!timeStr) return "09:00";

    // Already in 24-hour format like "09:00"
    if (/^\d{2}:\d{2}$/.test(timeStr.trim())) {
        return timeStr.trim();
    }

    // Handle formats like "9:00 AM", "10:30 PM", "9 AM"
    const match = timeStr.match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM|am|pm)?/i);
    if (!match) return "09:00";

    let hours = parseInt(match[1], 10);
    const minutes = match[2] || "00";
    const period = match[3]?.toUpperCase();

    if (period === "PM" && hours < 12) hours += 12;
    if (period === "AM" && hours === 12) hours = 0;

    return `${hours.toString().padStart(2, '0')}:${minutes}`;
}

export function BusinessInfoManager({ initialServices, initialHours, initialTone, initialAiName }: BusinessInfoManagerProps) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);

    // Services State
    const [servicesSummary, setServicesSummary] = useState(initialServices);
    const [aiTone, setAiTone] = useState(initialTone);
    const [aiName, setAiName] = useState(initialAiName);

    // Parse initial hours from various formats
    const parseInitialHours = (hoursData: any) => {
        const defaultState: Record<string, { open: boolean, start: string, end: string }> = {};

        DAYS.forEach(day => {
            defaultState[day] = { open: false, start: "09:00", end: "17:00" };
        });

        if (!hoursData) return defaultState;

        // Handle Array format ["Monday: 9:00 AM – 5:00 PM", "Tuesday: Closed"]
        if (Array.isArray(hoursData)) {
            hoursData.forEach((str: string) => {
                // Split on first colon only
                const colonIndex = str.indexOf(':');
                if (colonIndex === -1) return;

                const day = str.substring(0, colonIndex).trim();
                const timeRange = str.substring(colonIndex + 1).trim();

                if (!defaultState[day]) return;

                if (timeRange.toLowerCase() === 'closed') {
                    defaultState[day].open = false;
                } else {
                    // Handle various separators: "-", "–", "—", " to "
                    const times = timeRange.split(/\s*[-–—]\s*|\s+to\s+/i);
                    if (times.length >= 2) {
                        defaultState[day].open = true;
                        defaultState[day].start = convertTo24Hour(times[0]);
                        defaultState[day].end = convertTo24Hour(times[1]);
                    } else {
                        // If we can't parse, assume open with default hours
                        defaultState[day].open = true;
                    }
                }
            });
        }

        return defaultState;
    };

    const [hoursState, setHoursState] = useState(parseInitialHours(initialHours));

    const handleHoursChange = (day: string, field: 'open' | 'start' | 'end', value: any) => {
        setHoursState(prev => ({
            ...prev,
            [day]: { ...prev[day], [field]: value }
        }));
    };

    const handleSave = async () => {
        setIsLoading(true);
        try {
            // Convert hoursState back to string array
            const formattedHours = DAYS.map(day => {
                const config = hoursState[day];
                if (!config.open) return `${day}: Closed`;
                return `${day}: ${config.start}-${config.end}`;
            });

            await updateBusinessProfileSettings({
                services_summary: servicesSummary,
                business_hours: formattedHours,
                ai_tone: aiTone,
                ai_name: aiName
            });

            toast.success("Business settings saved");
            router.refresh();
        } catch (error) {
            toast.error("Failed to save settings");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="grid gap-6 md:grid-cols-2">
            {/* LEFT COLUMN: Service Info & AI Persona */}
            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Briefcase className="h-5 w-5 text-blue-500" />
                            Business Identity
                        </CardTitle>
                        <CardDescription>
                            Define what you do and how your AI should sound.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>AI Agent Name</Label>
                            <Input
                                value={aiName}
                                onChange={(e) => setAiName(e.target.value)}
                                placeholder="e.g. Alex"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>AI Tone / Personality</Label>
                            <Input
                                value={aiTone}
                                onChange={(e) => setAiTone(e.target.value)}
                                placeholder="e.g. Professional, Friendly, Witty"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Services Summary</Label>
                            <Textarea
                                value={servicesSummary}
                                onChange={(e) => setServicesSummary(e.target.value)}
                                placeholder="Describe your services, pricing, and key offerings..."
                                className="min-h-[200px]"
                            />
                            <p className="text-xs text-muted-foreground">
                                This is the primary context your AI will use to explain what you do.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* RIGHT COLUMN: Hours */}
            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Clock className="h-5 w-5 text-blue-500" />
                            Business Hours
                        </CardTitle>
                        <CardDescription>
                            When are you available? The AI will use this to confirm appointments or open status.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {DAYS.map((day) => (
                            <div key={day} className="flex items-center justify-between p-2 rounded hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-colors">
                                <div className="flex items-center gap-3 w-1/3">
                                    <Switch
                                        checked={hoursState[day].open}
                                        onCheckedChange={(val) => handleHoursChange(day, 'open', val)}
                                    />
                                    <span className={`text-sm font-medium ${!hoursState[day].open ? 'text-muted-foreground' : ''}`}>
                                        {day}
                                    </span>
                                </div>

                                {hoursState[day].open ? (
                                    <div className="flex items-center gap-2">
                                        <Input
                                            type="time"
                                            className="w-24 h-8 text-xs"
                                            value={hoursState[day].start}
                                            onChange={(e) => handleHoursChange(day, 'start', e.target.value)}
                                        />
                                        <span className="text-muted-foreground text-xs">to</span>
                                        <Input
                                            type="time"
                                            className="w-24 h-8 text-xs"
                                            value={hoursState[day].end}
                                            onChange={(e) => handleHoursChange(day, 'end', e.target.value)}
                                        />
                                    </div>
                                ) : (
                                    <span className="text-sm text-muted-foreground italic w-24 text-center">Closed</span>
                                )}
                            </div>
                        ))}
                    </CardContent>
                </Card>

                <Button onClick={handleSave} disabled={isLoading} className="w-full">
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save All Changes
                </Button>
            </div>
        </div>
    );
}
