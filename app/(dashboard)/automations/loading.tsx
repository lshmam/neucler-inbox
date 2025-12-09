import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function AutomationsLoading() {
    return (
        <div className="flex-1 space-y-8 p-8 pt-6">
            {/* Header */}
            <div className="flex flex-col space-y-2">
                <Skeleton className="h-9 w-[250px]" />
                <Skeleton className="h-4 w-[400px]" />
            </div>

            {/* 3 Category Sections */}
            {Array.from({ length: 3 }).map((_, sectionIdx) => (
                <div key={sectionIdx} className="space-y-4">
                    {/* Section Header */}
                    <div className="flex items-center gap-3">
                        <Skeleton className="h-10 w-10 rounded-xl" />
                        <div className="flex-1">
                            <Skeleton className="h-6 w-[200px] mb-1" />
                            <Skeleton className="h-4 w-[280px]" />
                        </div>
                    </div>

                    {/* 3 Automation Cards */}
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {Array.from({ length: 3 }).map((_, cardIdx) => (
                            <Card key={cardIdx}>
                                <CardHeader className="flex flex-row items-start justify-between space-y-0">
                                    <div className="space-y-2 flex-1">
                                        <Skeleton className="h-5 w-[160px]" />
                                        <Skeleton className="h-4 w-full" />
                                    </div>
                                    <Skeleton className="h-10 w-10 rounded-lg" />
                                </CardHeader>
                                <CardContent>
                                    <Skeleton className="h-6 w-[80px]" />
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}
