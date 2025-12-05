import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function CustomerProfileLoading() {
    return (
        <div className="flex-1 bg-gray-50/50 min-h-screen flex flex-col">

            {/* Top Nav Skeleton */}
            <div className="bg-white border-b px-8 py-4 sticky top-0 z-10">
                <Skeleton className="h-6 w-[200px]" />
            </div>

            <div className="p-8 max-w-7xl mx-auto w-full space-y-8">

                {/* Banner & Avatar Skeleton */}
                <Card className="overflow-hidden border-none shadow-md bg-white relative">
                    <Skeleton className="h-40 w-full bg-slate-200" />
                    <div className="px-8 pb-8">
                        <div className="flex flex-col md:flex-row gap-6 items-start">
                            <div className="-mt-14 relative">
                                <Skeleton className="h-28 w-28 rounded-full border-[5px] border-white" />
                            </div>
                            <div className="flex-1 pt-3 min-w-0 space-y-4">
                                <div className="flex justify-between">
                                    <div className="space-y-2">
                                        <Skeleton className="h-8 w-[300px]" />
                                        <div className="flex gap-4">
                                            <Skeleton className="h-4 w-[100px]" />
                                            <Skeleton className="h-4 w-[100px]" />
                                        </div>
                                    </div>
                                    <div className="flex gap-3">
                                        <Skeleton className="h-10 w-[100px]" />
                                        <Skeleton className="h-10 w-[140px]" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </Card>

                {/* Stats Grid Skeleton */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <Card key={i} className="h-24 flex flex-col justify-center p-4 space-y-2">
                            <Skeleton className="h-4 w-[80px]" />
                            <Skeleton className="h-8 w-[60px]" />
                        </Card>
                    ))}
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column */}
                    <div className="space-y-6">
                        <Card className="h-[300px] p-6 space-y-4">
                            <Skeleton className="h-6 w-[150px]" />
                            <Skeleton className="h-20 w-full" />
                            <Skeleton className="h-20 w-full" />
                        </Card>
                        <Card className="h-[200px] p-6 space-y-4">
                            <Skeleton className="h-6 w-[150px]" />
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-full" />
                        </Card>
                    </div>

                    {/* Right Column */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="flex gap-0 border-b">
                            <Skeleton className="h-12 w-[120px]" />
                            <Skeleton className="h-12 w-[120px]" />
                            <Skeleton className="h-12 w-[120px]" />
                        </div>
                        <Card className="h-[400px] p-6">
                            <div className="space-y-8">
                                {Array.from({ length: 4 }).map((_, i) => (
                                    <div key={i} className="flex gap-4">
                                        <Skeleton className="h-10 w-10 rounded-full" />
                                        <div className="space-y-2 flex-1">
                                            <Skeleton className="h-4 w-[200px]" />
                                            <Skeleton className="h-3 w-[150px]" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    </div>
                </div>

            </div>
        </div>
    );
}