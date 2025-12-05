"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createLoyaltyProgram } from "@/app/actions/loyalty";
import {
    Card, CardContent, CardFooter, CardHeader, CardTitle
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Star, Coins, CheckCircle, Plus, Trash2, ArrowLeft, ArrowRight, X } from "lucide-react";

// Added prop: hasExisting (to show/hide Cancel button)
export function LoyaltySetupWizard({ merchantId, hasExisting }: { merchantId: string, hasExisting: boolean }) {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);

    const [program, setProgram] = useState({
        terminology: "Points",
        accrualType: "amount_spent",
        spendAmount: "1.00",
        earnAmount: "1",
    });

    const [rewards, setRewards] = useState<any[]>([
        { name: "$5.00 off entire sale", type: "amount", value: 5.00, points: 50 }
    ]);

    const addReward = () => setRewards([...rewards, { name: "", type: "amount", value: 0, points: 0 }]);
    const removeReward = (index: number) => setRewards(rewards.filter((_, i) => i !== index));
    const updateReward = (index: number, field: string, value: any) => {
        const newRewards = [...rewards];
        newRewards[index][field] = value;
        if (field === "value" || field === "type") {
            const typeLabel = newRewards[index].type === 'amount' ? '$' : '%';
            newRewards[index].name = `${typeLabel}${newRewards[index].value} off entire sale`;
        }
        setRewards(newRewards);
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            await createLoyaltyProgram(merchantId, program, rewards);
            router.push("/loyalty"); // Redirect to main dashboard
            router.refresh();
        } catch (error) {
            console.error("Failed to save loyalty program", error);
        } finally {
            setLoading(false);
        }
    };

    // HEADER WITH CANCEL BUTTON
    const WizardHeader = ({ title, subtitle }: { title: string, subtitle: string }) => (
        <div className="mb-6 flex justify-between items-start">
            <div>
                <p className="text-sm text-muted-foreground uppercase tracking-wider">Step {step} of 4</p>
                <h1 className="text-3xl font-bold">{title}</h1>
                <p className="text-muted-foreground">{subtitle}</p>
            </div>
            {hasExisting && (
                <Button variant="ghost" size="sm" asChild>
                    <a href="/loyalty"><X className="mr-2 h-4 w-4" /> Cancel</a>
                </Button>
            )}
        </div>
    );

    if (step === 1) {
        return (
            <div className="max-w-2xl mx-auto mt-10">
                <WizardHeader title="Customize your program" subtitle="Specify if you want customers to earn Points or Stars." />

                <RadioGroup defaultValue={program.terminology} onValueChange={(v) => setProgram({ ...program, terminology: v })} className="grid gap-4">
                    {['Points', 'Stars', 'Custom'].map((item) => (
                        <div key={item}>
                            <RadioGroupItem value={item} id={item} className="peer sr-only" />
                            <Label htmlFor={item} className="flex items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer">
                                <span className="text-lg font-medium">{item}</span>
                                {item === 'Points' && <Coins className="h-5 w-5 text-muted-foreground" />}
                                {item === 'Stars' && <Star className="h-5 w-5 text-muted-foreground" />}
                            </Label>
                        </div>
                    ))}
                </RadioGroup>
                <div className="mt-8 flex justify-end">
                    <Button onClick={() => setStep(2)}>Next Step <ArrowRight className="ml-2 h-4 w-4" /></Button>
                </div>
            </div>
        );
    }

    if (step === 2) {
        return (
            <div className="max-w-2xl mx-auto mt-10">
                <WizardHeader title="Select a program type" subtitle="Determine how your customers will earn rewards." />

                <div className="space-y-4">
                    <div onClick={() => setProgram({ ...program, accrualType: 'amount_spent' })} className={`border-2 rounded-lg p-6 cursor-pointer ${program.accrualType === 'amount_spent' ? 'border-primary bg-primary/5' : 'border-muted'}`}>
                        <h3 className="font-semibold">Amount spent</h3>
                        <p className="text-sm text-muted-foreground mb-4">Earn points for every dollar spent.</p>
                        {program.accrualType === 'amount_spent' && (
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2"><Label>Spend ($)</Label><Input value={program.spendAmount} onChange={(e) => setProgram({ ...program, spendAmount: e.target.value })} /></div>
                                <div className="space-y-2"><Label>Earn</Label><Input value={program.earnAmount} onChange={(e) => setProgram({ ...program, earnAmount: e.target.value })} /></div>
                            </div>
                        )}
                    </div>
                    <div onClick={() => setProgram({ ...program, accrualType: 'visit_based' })} className={`border-2 rounded-lg p-6 cursor-pointer ${program.accrualType === 'visit_based' ? 'border-primary bg-primary/5' : 'border-muted'}`}>
                        <h3 className="font-semibold">Visit based</h3>
                        <p className="text-sm text-muted-foreground">Earn points for every separate visit.</p>
                    </div>
                </div>

                <div className="mt-8 flex justify-between">
                    <Button variant="outline" onClick={() => setStep(1)}><ArrowLeft className="mr-2 h-4 w-4" /> Back</Button>
                    <Button onClick={() => setStep(3)}>Next Step <ArrowRight className="ml-2 h-4 w-4" /></Button>
                </div>
            </div>
        );
    }

    if (step === 3) {
        return (
            <div className="max-w-2xl mx-auto mt-10">
                <WizardHeader title="Set up rewards" subtitle="What can they get with their points?" />

                <div className="space-y-4">
                    {rewards.map((reward, idx) => (
                        <Card key={idx} className="relative">
                            <CardContent className="pt-6 grid gap-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Type</Label>
                                        <Select value={reward.type} onValueChange={(v) => updateReward(idx, 'type', v)}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent><SelectItem value="amount">Fixed ($)</SelectItem><SelectItem value="percentage">Percent (%)</SelectItem></SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2"><Label>Value</Label><Input type="number" value={reward.value} onChange={(e) => updateReward(idx, 'value', e.target.value)} /></div>
                                </div>
                                <div className="space-y-2"><Label>Points Cost</Label><Input type="number" value={reward.points} onChange={(e) => updateReward(idx, 'points', e.target.value)} /></div>
                                {rewards.length > 1 && <Button variant="ghost" size="sm" className="absolute top-2 right-2 text-destructive" onClick={() => removeReward(idx)}><Trash2 className="h-4 w-4" /></Button>}
                            </CardContent>
                        </Card>
                    ))}
                    <Button variant="outline" className="w-full border-dashed" onClick={addReward}><Plus className="mr-2 h-4 w-4" /> Add Reward</Button>
                </div>

                <div className="mt-8 flex justify-between">
                    <Button variant="outline" onClick={() => setStep(2)}><ArrowLeft className="mr-2 h-4 w-4" /> Back</Button>
                    <Button onClick={() => setStep(4)}>Next Step <ArrowRight className="ml-2 h-4 w-4" /></Button>
                </div>
            </div>
        );
    }

    if (step === 4) {
        return (
            <div className="max-w-2xl mx-auto mt-10">
                <WizardHeader title="Review & Launch" subtitle="Ready to start tracking loyalty?" />
                <Card>
                    <CardContent className="pt-6 space-y-4">
                        <div className="flex justify-between border-b pb-2"><span className="text-muted-foreground">Terminology</span><span className="font-medium">{program.terminology}</span></div>
                        <div className="flex justify-between border-b pb-2"><span className="text-muted-foreground">Structure</span><span className="font-medium">{program.accrualType}</span></div>
                    </CardContent>
                    <CardFooter className="bg-muted/30 p-6">
                        <Button size="lg" className="w-full" onClick={handleSave} disabled={loading}>{loading ? "Creating..." : "Launch Program"}</Button>
                    </CardFooter>
                </Card>
                <div className="mt-4 flex justify-start">
                    <Button variant="ghost" onClick={() => setStep(3)}><ArrowLeft className="mr-2 h-4 w-4" /> Back</Button>
                </div>
            </div>
        );
    }
    return null;
}