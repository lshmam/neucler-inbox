import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function CustomersLoading() {
    return (
        <div className="flex-1 space-y-8 p-8 pt-6 bg-gray-50/50 min-h-screen">

            {/* Header Skeleton */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Skeleton className="h-12 w-12 rounded-xl" />
                    <div className="space-y-2">
                        <Skeleton className="h-8 w-[200px]" />
                        <Skeleton className="h-4 w-[300px]" />
                    </div>
                </div>
                <div className="flex gap-2">
                    <Skeleton className="h-10 w-[100px]" />
                    <Skeleton className="h-10 w-[140px]" />
                </div>
            </div>

            {/* CRM Snapshot Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <Card key={i} className="shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <Skeleton className="h-4 w-[100px]" />
                            <Skeleton className="h-4 w-4 rounded-full" />
                        </CardHeader>
                        <CardContent>
                            <Skeleton className="h-8 w-[60px]" />
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Filters Bar */}
            <div className="flex items-center justify-between gap-4">
                <Skeleton className="h-10 w-[400px]" />
                <div className="flex gap-2">
                    <Skeleton className="h-10 w-[250px]" />
                    <Skeleton className="h-10 w-10" />
                </div>
            </div>

            {/* Table Skeleton */}
            <div className="rounded-md border bg-white shadow-sm">
                <div className="p-4 border-b">
                    <div className="flex gap-4">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <Skeleton key={i} className="h-4 w-full" />
                        ))}
                    </div>
                </div>
                <div className="p-4 space-y-6">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <div key={i} className="flex items-center gap-4">
                            <Skeleton className="h-4 w-4" />
                            <div className="space-y-2 flex-1">
                                <Skeleton className="h-4 w-[150px]" />
                                <Skeleton className="h-3 w-[100px]" />
                            </div>
                            <Skeleton className="h-6 w-[80px] rounded-full" />
                            <Skeleton className="h-4 w-[100px]" />
                            <Skeleton className="h-4 w-[50px]" />
                            <Skeleton className="h-4 w-[80px]" />
                            <Skeleton className="h-4 w-[40px]" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}