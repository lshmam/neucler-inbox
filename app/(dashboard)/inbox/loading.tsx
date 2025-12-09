import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function InboxLoading() {
    return (
        <div className="flex h-[calc(100vh-4rem)]">
            {/* Left Panel - Conversation List */}
            <div className="w-80 border-r flex flex-col">
                {/* Search */}
                <div className="p-4 border-b">
                    <Skeleton className="h-10 w-full" />
                </div>
                {/* Tabs */}
                <div className="px-4 py-2 border-b flex gap-2">
                    <Skeleton className="h-8 w-24" />
                    <Skeleton className="h-8 w-24" />
                </div>
                {/* Conversation Items */}
                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <div key={i} className="p-3 rounded-lg border">
                            <div className="flex items-center gap-3">
                                <Skeleton className="h-10 w-10 rounded-full" />
                                <div className="flex-1 space-y-1">
                                    <Skeleton className="h-4 w-[120px]" />
                                    <Skeleton className="h-3 w-full" />
                                </div>
                                <Skeleton className="h-3 w-[50px]" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Right Panel - Message View */}
            <div className="flex-1 flex flex-col">
                {/* Header */}
                <div className="p-4 border-b flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div className="space-y-1">
                            <Skeleton className="h-5 w-[150px]" />
                            <Skeleton className="h-3 w-[100px]" />
                        </div>
                    </div>
                    <Skeleton className="h-8 w-[100px]" />
                </div>
                {/* Messages */}
                <div className="flex-1 p-4 space-y-4">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
                            <Skeleton className={`h-16 ${i % 2 === 0 ? 'w-2/3' : 'w-1/2'} rounded-xl`} />
                        </div>
                    ))}
                </div>
                {/* Input */}
                <div className="p-4 border-t">
                    <Skeleton className="h-12 w-full" />
                </div>
            </div>
        </div>
    );
}
