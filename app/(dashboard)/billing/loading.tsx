import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function BillingLoading() {
    return (
        <div className="flex-1 space-y-6 p-8 pt-6">
            {/* Header */}
            <div className="flex flex-col space-y-2">
                <Skeleton className="h-9 w-[140px]" />
                <Skeleton className="h-4 w-[260px]" />
            </div>

            {/* Current Plan Card */}
            <Card>
                <CardHeader>
                    <Skeleton className="h-6 w-[150px] mb-2" />
                    <Skeleton className="h-4 w-[200px]" />
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-baseline gap-2">
                        <Skeleton className="h-12 w-[80px]" />
                        <Skeleton className="h-4 w-[60px]" />
                    </div>
                    <Skeleton className="h-10 w-[140px]" />
                </CardContent>
            </Card>

            {/* Payment Method */}
            <Card>
                <CardHeader>
                    <Skeleton className="h-6 w-[180px]" />
                </CardHeader>
                <CardContent className="flex items-center gap-4">
                    <Skeleton className="h-12 w-16 rounded" />
                    <div className="space-y-1">
                        <Skeleton className="h-4 w-[140px]" />
                        <Skeleton className="h-3 w-[100px]" />
                    </div>
                </CardContent>
            </Card>

            {/* Invoice History */}
            <Card>
                <CardHeader>
                    <Skeleton className="h-6 w-[160px]" />
                </CardHeader>
                <CardContent className="space-y-3">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
                            <Skeleton className="h-4 w-[100px]" />
                            <Skeleton className="h-4 w-[60px]" />
                            <Skeleton className="h-6 w-[80px]" />
                        </div>
                    ))}
                </CardContent>
            </Card>
        </div>
    );
}
