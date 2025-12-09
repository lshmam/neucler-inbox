import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function SettingsLoading() {
    return (
        <div className="flex-1 space-y-6 p-8 pt-6">
            {/* Header */}
            <div className="flex flex-col space-y-2">
                <Skeleton className="h-9 w-[160px]" />
                <Skeleton className="h-4 w-[280px]" />
            </div>

            {/* Settings Sections */}
            <div className="space-y-6">
                {Array.from({ length: 3 }).map((_, sectionIdx) => (
                    <Card key={sectionIdx}>
                        <CardHeader>
                            <Skeleton className="h-6 w-[180px] mb-2" />
                            <Skeleton className="h-4 w-[300px]" />
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {Array.from({ length: 3 }).map((_, fieldIdx) => (
                                <div key={fieldIdx} className="space-y-2">
                                    <Skeleton className="h-4 w-[100px]" />
                                    <Skeleton className="h-10 w-full" />
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
