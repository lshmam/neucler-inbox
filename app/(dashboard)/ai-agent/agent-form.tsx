"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Bot, Mic, Save, Phone, Sparkles, Loader2, Search } from "lucide-react";

// Assuming you have a type for the initial data
interface AgentData {
    id: string;
    name: string;
    system_prompt: string;
    voice_id: string;
    type: 'inbound' | 'outbound';
    // Add other fields as necessary
}

interface BusinessProfile {
    merchant_id?: string;
    business_name?: string;
    [key: string]: any;
}

interface AgentConfigFormProps {
    initialData: AgentData;
    agentId: string;
    merchantId: string;
    businessProfile: BusinessProfile;
}

// Assuming you fetch voices somewhere
const voices = [
    { voice_id: '1', voice_name: 'Jenny (Standard)', provider: 'Retell' },
    { voice_id: '2', voice_name: 'Adam (Deep)', provider: 'Retell' }
];

export function AgentConfigForm({ initialData, agentId, merchantId, businessProfile }: AgentConfigFormProps) {
    const router = useRouter();
    const [saving, setSaving] = useState(false);
    const [calling, setCalling] = useState(false);
    const [testPhone, setTestPhone] = useState("");

    // Form State
    const [name, setName] = useState(initialData?.name || "Front Desk AI");
    const [prompt, setPrompt] = useState(initialData?.system_prompt || "You are a helpful receptionist...");
    const [voice, setVoice] = useState(initialData?.voice_id || voices[0]?.voice_id);
    const [type, setType] = useState(initialData?.type || "inbound");

    // --- STATE FOR PHONE NUMBER ---
    const [areaCode, setAreaCode] = useState<string>(""); // Explicitly a string
    const [availableNumbers, setAvailableNumbers] = useState<any[]>([]);
    const [selectedNumber, setSelectedNumber] = useState<string | null>(null);

    const handleSave = async () => {
        setSaving(true);
        const saveToast = toast.loading("Saving agent...");
        try {
            const res = await fetch("/api/agent/save", {
                method: "POST",
                body: JSON.stringify({
                    agentId: agentId, // Make sure to send the ID for updates
                    name,
                    system_prompt: prompt,
                    voice_id: voice,
                    type,
                    phone_number: selectedNumber // Save the chosen number
                })
            });

            if (!res.ok) throw new Error("Failed to save agent.");

            toast.dismiss(saveToast);
            toast.success("Agent Saved Successfully!");
            router.refresh();

        } catch (e: any) {
            toast.dismiss(saveToast);
            toast.error("Save Failed", { description: e.message });
        }
        setSaving(false);
    };

    const handleCallMe = async () => {
        // ... (your existing call me logic)
    };

    const findNumbers = async () => {
        // In a real app, you'd fetch this from a /api/numbers/find route
        // For now, we'll mock the result.
        console.log(`Searching for numbers in area code: ${areaCode}`);
        setAvailableNumbers([
            { friendly_name: `(${areaCode}) 555-0100`, phone_number: `+1${areaCode}5550100` },
            { friendly_name: `(${areaCode}) 555-0101`, phone_number: `+1${areaCode}5550101` },
            { friendly_name: `(${areaCode}) 555-0102`, phone_number: `+1${areaCode}5550102` },
        ]);
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

            {/* LEFT COLUMN: Configuration */}
            <div className="lg:col-span-2 space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Bot /> Agent Identity</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>Agent Name</Label>
                            <Input value={name} onChange={(e) => setName(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label>System Prompt</Label>
                            <Textarea className="min-h-[200px]" value={prompt} onChange={(e) => setPrompt(e.target.value)} />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Mic /> Voice & Phone</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-2">
                            <Label>Voice</Label>
                            <Select value={voice} onValueChange={setVoice}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {voices.map((v) => <SelectItem key={v.voice_id} value={v.voice_id}>{v.voice_name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* --- PHONE NUMBER SELECTION --- */}
                        <div className="space-y-2 border-t pt-6">
                            <Label>Phone Number</Label>
                            <CardDescription>Assign a dedicated number to this agent.</CardDescription>
                            <div className="flex gap-2 items-end">
                                <div className="flex-1 space-y-1">
                                    <Label htmlFor="areaCode" className="text-xs">Area Code</Label>
                                    <Input
                                        id="areaCode"
                                        placeholder="e.g., 805"
                                        type="number" // The input can be a number type for user convenience
                                        value={areaCode}
                                        // --- THE FIX IS HERE ---
                                        // e.target.value from ANY input is always a string.
                                        // We just use that directly. This avoids the number conversion issue.
                                        onChange={(e) => setAreaCode(e.target.value)}
                                    />
                                </div>
                                <Button variant="outline" onClick={findNumbers}><Search className="mr-2 h-4 w-4" /> Find</Button>
                            </div>

                            {availableNumbers.length > 0 && (
                                <RadioGroup onValueChange={setSelectedNumber} className="space-y-2 pt-2">
                                    {availableNumbers.map(num => (
                                        <div key={num.phone_number} className="flex items-center space-x-2 border p-3 rounded-md cursor-pointer hover:bg-slate-50">
                                            <RadioGroupItem value={num.phone_number} id={num.phone_number} />
                                            <Label htmlFor={num.phone_number} className="font-mono cursor-pointer">{num.friendly_name}</Label>
                                        </div>
                                    ))}
                                </RadioGroup>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* RIGHT COLUMN: Save & Test */}
            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Actions</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Button onClick={handleSave} disabled={saving} size="lg" className="w-full bg-[#906CDD] hover:bg-[#7a5bb5]">
                            {saving ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2" />} Save Agent
                        </Button>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Test Your Agent</CardTitle>
                        <CardDescription>Receive a test call from this agent.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Input placeholder="+1..." value={testPhone} onChange={(e) => setTestPhone(e.target.value)} />
                        <Button onClick={handleCallMe} disabled={calling} className="w-full">
                            {calling ? <Loader2 className="animate-spin mr-2" /> : <Phone className="mr-2" />} Call Me
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}