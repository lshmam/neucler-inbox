"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Check, Loader2, Bot, Building, CalendarCheck } from "lucide-react";

// Define the available personas
const PERSONAS = [
    { id: 'receptionist', title: 'Friendly Receptionist', icon: Bot, description: "Greets callers, answers general questions, and forwards calls. Best for general use." },
    { id: 'scheduler', title: 'Appointment Booker', icon: CalendarCheck, description: "Focuses on checking availability and scheduling appointments directly. Highly goal-oriented." },
    { id: 'info_desk', title: 'Business Info Desk', icon: Building, description: "Provides detailed business information like hours, location, and services. Does not book appointments." }
];

export function PersonaSelector({ merchantId }: { merchantId: string, initialData?: any }) {
    const router = useRouter();
    const [selectedPersona, setSelectedPersona] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleSavePersona = async () => {
        if (!selectedPersona) {
            toast.warning("Please select a persona to continue.");
            return;
        }

        setIsLoading(true);
        const loadingToast = toast.loading("Configuring your new agent...");

        try {
            const res = await fetch("/api/agent/select-persona", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ persona: selectedPersona })
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Failed to save persona.");
            }

            toast.dismiss(loadingToast);
            toast.success("Agent persona selected!", {
                description: "You will now be taken to the main dashboard.",
            });

            // Refresh the page. The server will now see `is_configured` is true
            // and render the main AIAgentClientView dashboard.
            router.refresh();

        } catch (error: any) {
            toast.dismiss(loadingToast);
            toast.error("Setup Failed", { description: error.message });
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-slate-50">
            <div className="max-w-3xl w-full text-center">
                <h1 className="text-4xl font-bold tracking-tight">Deploy Your First AI Agent</h1>
                <p className="text-muted-foreground mt-2">Choose a starting personality for your AI receptionist. You can customize it later.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-10 max-w-5xl w-full">
                {PERSONAS.map((persona) => {
                    const isSelected = selectedPersona === persona.id;
                    return (
                        <Card
                            key={persona.id}
                            onClick={() => setSelectedPersona(persona.id)}
                            className={`cursor-pointer transition-all hover:shadow-lg ${isSelected ? 'border-primary ring-2 ring-primary' : 'hover:border-slate-300'}`}
                        >
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <persona.icon className="h-6 w-6 text-muted-foreground" />
                                    {isSelected && <Check className="h-5 w-5 text-primary" />}
                                </div>
                                <CardTitle>{persona.title}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <CardDescription>{persona.description}</CardDescription>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            <Button
                size="lg"
                className="mt-10"
                onClick={handleSavePersona}
                disabled={isLoading}
            >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save and Continue
            </Button>
        </div>
    );
}