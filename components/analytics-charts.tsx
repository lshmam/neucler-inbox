"use client";

import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    AreaChart, Area, PieChart, Pie, Cell
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function AnalyticsCharts({ data }: { data: any }) {
    const pieData = [
        { name: 'Positive', value: data.sentiment.positive, color: '#22c55e' },
        { name: 'Neutral', value: data.sentiment.neutral, color: '#94a3b8' },
        { name: 'Negative', value: data.sentiment.negative, color: '#ef4444' },
    ];

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">

            {/* MAIN CHART: Calls vs Revenue */}
            <Card className="col-span-4">
                <CardHeader>
                    <CardTitle>Activity Overview</CardTitle>
                </CardHeader>
                <CardContent className="pl-2">
                    <ResponsiveContainer width="100%" height={350}>
                        <BarChart data={data.dailyActivity}>
                            <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                            <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
                            <Tooltip
                                cursor={{ fill: 'transparent' }}
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                            />
                            <Bar dataKey="sales" fill="#0ea5e9" radius={[4, 4, 0, 0]} name="Sales ($)" />
                            {/* You can add a Line here for Calls if you want a composed chart */}
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            {/* SECONDARY CHART: Call Sentiment */}
            <Card className="col-span-3">
                <CardHeader>
                    <CardTitle>Call Sentiment AI Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={350}>
                        <PieChart>
                            <Pie
                                data={pieData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {pieData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip />
                            <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle">
                                {data.totalCalls} Calls
                            </text>
                        </PieChart>
                    </ResponsiveContainer>
                    <div className="flex justify-center gap-4 mt-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1"><div className="w-3 h-3 bg-green-500 rounded-full"></div> Positive</div>
                        <div className="flex items-center gap-1"><div className="w-3 h-3 bg-slate-400 rounded-full"></div> Neutral</div>
                        <div className="flex items-center gap-1"><div className="w-3 h-3 bg-red-500 rounded-full"></div> Negative</div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}