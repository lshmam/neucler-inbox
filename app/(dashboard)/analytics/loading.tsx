import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function AnalyticsLoading() {
    return (
        <div className="flex-1 space-y-6 p-8 pt-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="space-y-2">
                    <Skeleton className="h-9 w-[180px]" />
                    <Skeleton className="h-4 w-[280px]" />
                </div>
                <Skeleton className="h-10 w-[120px]" />
            </div>

            {/* KPI Cards */}
            <div className="grid gap-4 md:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <Card key={i}>
                        <CardHeader className="pb-2">
                            <Skeleton className="h-4 w-[80px]" />
                        </CardHeader>
                        <CardContent>
                            <Skeleton className="h-8 w-[60px] mb-1" />
                            <Skeleton className="h-3 w-[100px]" />
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Chart */}
            <Card>
                <CardHeader>
                    <Skeleton className="h-6 w-[200px]" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-[350px] w-full rounded-lg" />
                </CardContent>
            </Card>
        </div>
    );
}
