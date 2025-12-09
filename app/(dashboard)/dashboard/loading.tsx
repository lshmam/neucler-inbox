import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function DashboardLoading() {
    return (
        <div className="flex-1 space-y-6 p-8 pt-6">

            {/* HEADER SKELETON */}
            <div className="flex flex-col space-y-2">
                <Skeleton className="h-9 w-[180px]" />
                <Skeleton className="h-4 w-[320px]" />
            </div>

            {/* ROW 1: 3 VALUE CARDS */}
            <div className="grid gap-4 md:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => (
                    <Card key={i} className="relative overflow-hidden">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <Skeleton className="h-4 w-[100px]" />
                            <Skeleton className="h-10 w-10 rounded-full" />
                        </CardHeader>
                        <CardContent>
                            <Skeleton className="h-10 w-[60px] mb-2" />
                            <Skeleton className="h-4 w-[120px] mb-2" />
                            <Skeleton className="h-3 w-[140px]" />
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* ROW 2: CHART & PIPELINE (2/3 + 1/3) */}
            <div className="grid gap-6 lg:grid-cols-3">
                {/* Chart Card */}
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <Skeleton className="h-6 w-[200px]" />
                    </CardHeader>
                    <CardContent>
                        <Skeleton className="h-[300px] w-full rounded-lg" />
                    </CardContent>
                </Card>

                {/* Pipeline Card */}
                <Card>
                    <CardHeader>
                        <Skeleton className="h-6 w-[140px]" />
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="flex items-center justify-between p-3 rounded-lg border">
                                <div className="flex items-center gap-3">
                                    <Skeleton className="h-3 w-3 rounded-full" />
                                    <div className="space-y-1">
                                        <Skeleton className="h-4 w-[100px]" />
                                        <Skeleton className="h-3 w-[80px]" />
                                    </div>
                                </div>
                                <Skeleton className="h-8 w-[30px]" />
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}