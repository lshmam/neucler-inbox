import { CallReviewDashboard } from "../call-review-dashboard";

export default function CallDetailPage({ params }: { params: { id: string } }) {
    return (
        <div className="h-full p-6">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-slate-900">Call Analysis</h1>
                <p className="text-slate-500 text-sm mt-1">
                    Detailed breakdown for Call #{params.id}
                </p>
            </div>
            <CallReviewDashboard callId={params.id} />
        </div>
    );
}
