import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function DashboardLoading() {
    return (
        <div className="flex-1 space-y-4 p-8 pt-6">

            {/* 1. HEADER SKELETON */}
            <div className="flex items-center justify-between space-y-2">
                <div className="space-y-2">
                    {/* Title Skeleton */}
                    <Skeleton className="h-9 w-[200px] bg-slate-200" />
                    {/* Subtitle Skeleton */}
                    <Skeleton className="h-4 w-[300px] bg-slate-200" />
                </div>
                <div className="flex items-center space-x-2">
                    {/* Date Pill Skeleton */}
                    <Skeleton className="h-8 w-[140px] bg-slate-200" />
                </div>
            </div>

            {/* 2. KPI GRID SKELETON (4 Cards) */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mt-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <Card key={i}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <Skeleton className="h-4 w-[100px]" />
                            <Skeleton className="h-4 w-4 rounded-full" />
                        </CardHeader>
                        <CardContent>
                            <Skeleton className="h-8 w-[60px] mb-2" />
                            <Skeleton className="h-3 w-[120px]" />
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* 3. MAIN CONTENT GRID SKELETON */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7 mt-4">

                {/* Left Column (Action Center) */}
                <Card className="col-span-4 lg:col-span-3">
                    <CardHeader>
                        <Skeleton className="h-6 w-[150px] mb-2" />
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Mocking 3 Action Items */}
                        <Skeleton className="h-20 w-full rounded-lg" />
                        <Skeleton className="h-20 w-full rounded-lg" />
                        <Skeleton className="h-20 w-full rounded-lg" />
                    </CardContent>
                </Card>

                {/* Right Column (Activity Feed) */}
                <Card className="col-span-4 lg:col-span-4">
                    <CardHeader>
                        <Skeleton className="h-6 w-[150px] mb-2" />
                        <Skeleton className="h-4 w-[250px]" />
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Mocking 4 Feed Items */}
                        {Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="flex items-center space-x-4">
                                <Skeleton className="h-10 w-10 rounded-full" />
                                <div className="space-y-2">
                                    <Skeleton className="h-4 w-[200px]" />
                                    <Skeleton className="h-3 w-[150px]" />
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>

            </div>
        </div>
    );
}