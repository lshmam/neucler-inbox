import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

export default function CommunicationsLoading() {
    return (
        <div className="flex-1 space-y-4 p-8 pt-6 h-[calc(100vh-64px)] flex flex-col">

            {/* Header */}
            <div className="flex items-center justify-between shrink-0">
                <div className="space-y-2">
                    <Skeleton className="h-9 w-[250px]" />
                    <Skeleton className="h-4 w-[400px]" />
                </div>
                <Skeleton className="h-10 w-[140px]" />
            </div>

            {/* Tabs */}
            <div className="flex border-b gap-0">
                {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-[150px] mr-1" />
                ))}
            </div>

            {/* Main Content Area (Split Pane Look) */}
            <div className="flex-1 border rounded-lg overflow-hidden grid grid-cols-12 bg-white">

                {/* Left Pane (List) */}
                <div className="col-span-4 border-r p-4 space-y-4">
                    <Skeleton className="h-10 w-full" />
                    <div className="space-y-4 mt-4">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="flex gap-3 items-center">
                                <Skeleton className="h-10 w-10 rounded-full" />
                                <div className="space-y-2 flex-1">
                                    <Skeleton className="h-4 w-[60%]" />
                                    <Skeleton className="h-3 w-[80%]" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right Pane (Chat) */}
                <div className="col-span-8 p-0 flex flex-col">
                    {/* Chat Header */}
                    <div className="h-16 border-b p-4 flex items-center gap-3">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div className="space-y-2">
                            <Skeleton className="h-4 w-[150px]" />
                            <Skeleton className="h-3 w-[100px]" />
                        </div>
                    </div>
                    {/* Chat Body */}
                    <div className="flex-1 p-4 space-y-6">
                        <div className="flex justify-end">
                            <Skeleton className="h-12 w-[200px] rounded-l-xl rounded-tr-xl" />
                        </div>
                        <div className="flex justify-start">
                            <Skeleton className="h-12 w-[250px] rounded-r-xl rounded-tl-xl" />
                        </div>
                        <div className="flex justify-end">
                            <Skeleton className="h-20 w-[300px] rounded-l-xl rounded-tr-xl" />
                        </div>
                    </div>
                    {/* Chat Input */}
                    <div className="h-20 border-t p-4 flex gap-2">
                        <Skeleton className="h-full flex-1" />
                        <Skeleton className="h-full w-12" />
                    </div>
                </div>
            </div>
        </div>
    );
}