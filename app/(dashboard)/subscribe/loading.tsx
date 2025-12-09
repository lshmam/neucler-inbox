import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function SubscribeLoading() {
    return (
        <div className="flex-1 flex items-center justify-center p-8">
            <Card className="w-full max-w-lg">
                <CardHeader className="text-center">
                    <Skeleton className="h-8 w-[200px] mx-auto mb-2" />
                    <Skeleton className="h-4 w-[280px] mx-auto" />
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-[60px]" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-[80px]" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                    <Skeleton className="h-12 w-full mt-4" />
                </CardContent>
            </Card>
        </div>
    );
}
