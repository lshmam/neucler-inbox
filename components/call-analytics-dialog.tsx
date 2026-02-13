"use client";

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    VibeCheckHeader,
    EmotionalTranscript,
    SmartScorecard,
} from "@/app/(dashboard)/call-analytics/call-review-dashboard";
import {
    useMockCallData,
} from "@/app/(dashboard)/call-analytics/useMockCallData";
import { BarChart3 } from "lucide-react";

interface CallAnalyticsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    customerName?: string;
    customerPhone?: string;
    callTimestamp?: string;
}

export function CallAnalyticsDialog({
    open,
    onOpenChange,
    customerName,
    customerPhone,
    callTimestamp,
}: CallAnalyticsDialogProps) {
    const {
        MOCK_OverallScore,
        MOCK_CallMetadata,
        MOCK_Transcript,
        MOCK_Scorecard,
        MOCK_SentimentTimeline,
    } = useMockCallData();

    // Override metadata with actual conversation data when available
    const metadata = {
        ...MOCK_CallMetadata,
        customerName: customerName || MOCK_CallMetadata.customerName,
        customerPhone: customerPhone || MOCK_CallMetadata.customerPhone,
        callDate: callTimestamp || MOCK_CallMetadata.callDate,
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-5xl h-[90vh] flex flex-col p-0 gap-0">
                <DialogHeader className="shrink-0 px-6 pt-6 pb-4 border-b border-slate-200">
                    <DialogTitle className="flex items-center gap-2 text-lg">
                        <BarChart3 className="h-5 w-5 text-blue-600" />
                        Call Analytics
                    </DialogTitle>
                </DialogHeader>
                <ScrollArea className="flex-1 min-h-0">
                    <div className="p-6 space-y-6">
                        {/* Vibe Check Header — score + sentiment wave */}
                        <VibeCheckHeader
                            score={MOCK_OverallScore}
                            metadata={metadata}
                            sentimentData={MOCK_SentimentTimeline}
                        />

                        {/* Main Content: Scorecard + Transcript */}
                        <div className="flex flex-col lg:flex-row gap-6">
                            <SmartScorecard scorecard={MOCK_Scorecard} />
                            <EmotionalTranscript transcript={MOCK_Transcript} />
                        </div>
                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}
