import { CallReviewDashboard } from "./call-review-dashboard";

export default function CallAnalyticsPage() {
    return (
        <div className="h-full p-6">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-slate-900">Call Analytics</h1>
                <p className="text-slate-500 text-sm mt-1">
                    Post-call performance review with AI emotional analysis
                </p>
            </div>
            <CallReviewDashboard />
        </div>
    );
}
