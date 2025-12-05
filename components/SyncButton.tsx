"use client"; // This is a client component

import { Button } from "./ui/button";
import { RefreshCw } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function SyncButton() {
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleSync = async () => {
        setLoading(true);
        try {
            await fetch("/api/sync", { method: "POST" });
            router.refresh(); // Reloads the page data
            alert("Sync Complete!");
        } catch (e) {
            alert("Sync Failed");
        }
        setLoading(false);
    };

    return (
        <Button onClick={handleSync} disabled={loading} variant="outline" size="sm">
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            {loading ? "Syncing..." : "Sync Data"}
        </Button>
    );
}