"use client";

import { Button } from "@/components/ui/button";
import {
    Card, CardContent, CardDescription, CardHeader, CardTitle
} from "@/components/ui/card";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { archiveProgram } from "@/app/actions/loyalty";
import { AlertTriangle, Clock, Archive } from "lucide-react";
import { useRouter } from "next/navigation";

export function ProgramSettings({ programId, history = [] }: { programId: string, history: any[] }) {
    const router = useRouter();

    const handleArchive = async () => {
        if (confirm("Are you sure? This will deactivate the current program. You will be redirected to create a new one.")) {
            await archiveProgram(programId);
            router.refresh();
        }
    }

    return (
        <div className="space-y-6">
            {/* DANGER ZONE */}
            <Card className="border-destructive/50">
                <CardHeader>
                    <CardTitle className="text-destructive flex items-center">
                        <AlertTriangle className="mr-2 h-5 w-5" /> Active Program Settings
                    </CardTitle>
                    <CardDescription>
                        Manage the lifecycle of your current loyalty program.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-between">
                        <div>
                            <h4 className="font-medium">End Program & Start New</h4>
                            <p className="text-sm text-muted-foreground">
                                Archive this program. This allows you to start the setup wizard again.
                            </p>
                        </div>
                        <Button variant="destructive" onClick={handleArchive}>
                            <Archive className="mr-2 h-4 w-4" /> Archive Current
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* HISTORY TABLE */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center">
                        <Clock className="mr-2 h-5 w-5" /> Program History
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {history.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No previous programs found.</p>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date Created</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Terminology</TableHead>
                                    <TableHead>Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {history.map((prog) => (
                                    <TableRow key={prog.id} className="opacity-60">
                                        <TableCell>{new Date(prog.created_at).toLocaleDateString()}</TableCell>
                                        <TableCell className="capitalize">{prog.accrual_type.replace('_', ' ')}</TableCell>
                                        <TableCell>{prog.terminology}</TableCell>
                                        <TableCell>
                                            <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                                                Archived
                                            </span>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}