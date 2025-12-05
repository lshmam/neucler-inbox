import { supabaseAdmin } from "@/lib/supabase";
import { getMerchantId } from "@/lib/auth-helpers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Star, ThumbsUp, ThumbsDown, MessageSquare } from "lucide-react";

export default async function ReviewsPage() {
    const merchantId = await getMerchantId();

    // 1. Fetch Reviews
    const { data: reviews } = await supabaseAdmin
        .from("review_requests")
        .select("*")
        .eq("merchant_id", merchantId)
        .not("rating", "is", null) // Only show completed ratings
        .order("created_at", { ascending: false });

    // 2. Calculate Stats
    const total = reviews?.length || 0;
    const positive = reviews?.filter(r => r.rating >= 4).length || 0;
    const negative = total - positive;
    const saved = reviews?.filter(r => r.rating < 4 && r.feedback_text).length || 0;

    return (
        <div className="flex-1 space-y-6 p-8 pt-6">
            <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold tracking-tight">Reputation Manager</h2>
            </div>

            {/* STATS ROW */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Review Funnel</CardTitle>
                        <Star className="h-4 w-4 text-yellow-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{total}</div>
                        <p className="text-xs text-muted-foreground">Total ratings captured</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Redirected to Google</CardTitle>
                        <ThumbsUp className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{positive}</div>
                        <p className="text-xs text-muted-foreground">4 or 5 Star Ratings</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Reputation Saved</CardTitle>
                        <MessageSquare className="h-4 w-4 text-orange-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{saved}</div>
                        <p className="text-xs text-muted-foreground">Negative reviews intercepted (Private)</p>
                    </CardContent>
                </Card>
            </div>

            {/* RECENT FEEDBACK TABLE */}
            <Card>
                <CardHeader>
                    <CardTitle>Recent Feedback</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Customer</TableHead>
                                <TableHead>Rating</TableHead>
                                <TableHead>Feedback / Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {reviews?.map((r) => (
                                <TableRow key={r.id}>
                                    <TableCell>{new Date(r.created_at).toLocaleDateString()}</TableCell>
                                    <TableCell className="font-mono text-xs">{r.customer_phone}</TableCell>
                                    <TableCell>
                                        <div className="flex gap-0.5">
                                            {[1, 2, 3, 4, 5].map(star => (
                                                <Star key={star} className={`h-3 w-3 ${r.rating >= star ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'}`} />
                                            ))}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {r.feedback_text ? (
                                            <div className="bg-orange-50 text-orange-800 p-2 rounded text-sm border border-orange-100">
                                                "{r.feedback_text}"
                                            </div>
                                        ) : (
                                            <span className="text-muted-foreground text-xs italic">
                                                {r.rating >= 4 ? "Sent to Google" : "No comment left"}
                                            </span>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                            {(!reviews || reviews.length === 0) && (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center text-muted-foreground h-24">
                                        No reviews yet. Wait for your next transaction!
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}