import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function SubscriptionLoading() {
    return (
        <div className="flex-1 space-y-6 p-8 pt-6">
            {/* Header */}
            <div className="flex flex-col space-y-2">
                <Skeleton className="h-9 w-[200px]" />
                <Skeleton className="h-4 w-[320px]" />
            </div>

            {/* Plan Cards */}
            <div className="grid gap-6 md:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => (
                    <Card key={i} className={i === 1 ? "border-2 border-primary" : ""}>
                        <CardHeader>
                            <Skeleton className="h-6 w-[100px] mb-2" />
                            <div className="flex items-baseline gap-1">
                                <Skeleton className="h-10 w-[60px]" />
                                <Skeleton className="h-4 w-[40px]" />
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {Array.from({ length: 5 }).map((_, j) => (
                                <div key={j} className="flex items-center gap-2">
                                    <Skeleton className="h-4 w-4 rounded-full" />
                                    <Skeleton className="h-4 w-full" />
                                </div>
                            ))}
                            <Skeleton className="h-10 w-full mt-4" />
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
