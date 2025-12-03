"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FolderOpen,
  DollarSign,
  Clock,
  Car,
  Wrench,
  TrendingUp,
} from "lucide-react";

interface Stats {
  totalCases: number;
  activeCases: number;
  settledCases: number;
  totalRepairs: number;
  totalDaysDown: number;
  totalHours: number;
  totalFees: number;
  casesByStatus: Record<string, number>;
  casesByMake: Record<string, number>;
}

export default function AnalyticsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch all cases and calculate stats
    Promise.all([
      fetch("/api/cases").then((r) => r.json()),
      fetch("/api/repair-orders").then((r) => r.json()),
      fetch("/api/billing").then((r) => r.json()),
    ])
      .then(([cases, repairs, billing]) => {
        const casesByStatus: Record<string, number> = {};
        const casesByMake: Record<string, number> = {};

        cases.forEach((c: { status: string; vehicleMake: string }) => {
          casesByStatus[c.status] = (casesByStatus[c.status] || 0) + 1;
          if (c.vehicleMake) {
            casesByMake[c.vehicleMake] = (casesByMake[c.vehicleMake] || 0) + 1;
          }
        });

        const totalDaysDown = repairs.reduce(
          (sum: number, r: { daysDown?: number }) => sum + (r.daysDown || 0),
          0
        );
        const totalHours = billing.reduce(
          (sum: number, b: { hours?: number }) => sum + (b.hours || 0),
          0
        );
        const totalFees = billing.reduce(
          (sum: number, b: { hours?: number; rate?: number }) =>
            sum + (b.hours || 0) * (b.rate || 0),
          0
        );

        setStats({
          totalCases: cases.length,
          activeCases: casesByStatus["Active"] || 0,
          settledCases: casesByStatus["Settled"] || 0,
          totalRepairs: repairs.length,
          totalDaysDown,
          totalHours,
          totalFees,
          casesByStatus,
          casesByMake,
        });
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching stats:", err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground">Overview of your lemon law practice</p>
      </div>

      {/* Main Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cases</CardTitle>
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalCases || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.activeCases || 0} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Repairs</CardTitle>
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalRepairs || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.totalDaysDown || 0} days down
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hours Billed</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalHours.toFixed(1) || 0}</div>
            <p className="text-xs text-muted-foreground">across all cases</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Fees</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${(stats?.totalFees || 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">attorney fees</p>
          </CardContent>
        </Card>
      </div>

      {/* Breakdowns */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Cases by Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats && Object.keys(stats.casesByStatus).length > 0 ? (
              <div className="space-y-3">
                {Object.entries(stats.casesByStatus).map(([status, count]) => (
                  <div key={status} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className={`h-3 w-3 rounded-full ${
                          status === "Active"
                            ? "bg-green-500"
                            : status === "Settled"
                            ? "bg-purple-500"
                            : status === "Discovery"
                            ? "bg-blue-500"
                            : "bg-gray-500"
                        }`}
                      />
                      <span>{status}</span>
                    </div>
                    <span className="font-medium">{count}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">No cases yet</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Car className="h-5 w-5" />
              Cases by Make
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats && Object.keys(stats.casesByMake).length > 0 ? (
              <div className="space-y-3">
                {Object.entries(stats.casesByMake)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 8)
                  .map(([make, count]) => (
                    <div key={make} className="flex items-center justify-between">
                      <span>{make}</span>
                      <span className="font-medium">{count}</span>
                    </div>
                  ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">No cases yet</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Summary Card */}
      <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
        <CardHeader>
          <CardTitle>Practice Summary</CardTitle>
          <CardDescription>Key metrics at a glance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="text-center p-4 bg-background rounded-lg">
              <p className="text-3xl font-bold">
                {stats?.totalCases
                  ? ((stats.settledCases / stats.totalCases) * 100).toFixed(0)
                  : 0}
                %
              </p>
              <p className="text-sm text-muted-foreground">Settlement Rate</p>
            </div>
            <div className="text-center p-4 bg-background rounded-lg">
              <p className="text-3xl font-bold">
                {stats?.totalCases
                  ? (stats.totalRepairs / stats.totalCases).toFixed(1)
                  : 0}
              </p>
              <p className="text-sm text-muted-foreground">Avg Repairs/Case</p>
            </div>
            <div className="text-center p-4 bg-background rounded-lg">
              <p className="text-3xl font-bold">
                {stats?.totalCases
                  ? (stats.totalDaysDown / stats.totalCases).toFixed(0)
                  : 0}
              </p>
              <p className="text-sm text-muted-foreground">Avg Days Down/Case</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
