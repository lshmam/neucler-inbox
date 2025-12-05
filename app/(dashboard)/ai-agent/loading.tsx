import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function LoadingAgent() {
    return (
        <div className="flex-1 space-y-6 p-8 pt-6 h-full flex flex-col bg-gray-50/50">
            <div className="flex items-center justify-between">
                <div className="space-y-2">
                    <Skeleton className="h-8 w-[200px]" />
                    <Skeleton className="h-4 w-[300px]" />
                </div>
                <Skeleton className="h-10 w-[140px]" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Col */}
                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <CardHeader><Skeleton className="h-6 w-[150px]" /></CardHeader>
                        <CardContent className="space-y-4">
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-[200px] w-full" />
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader><Skeleton className="h-6 w-[150px]" /></CardHeader>
                        <CardContent className="space-y-4">
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-20 w-full" />
                        </CardContent>
                    </Card>
                </div>
                {/* Right Col */}
                <div className="space-y-6">
                    <Card>
                        <CardHeader><Skeleton className="h-6 w-[100px]" /></CardHeader>
                        <CardContent className="space-y-4">
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-10 w-full" />
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}