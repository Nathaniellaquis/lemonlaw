"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, FolderOpen, ChevronRight } from "lucide-react";

interface Case {
  _id: string;
  caseNumber: string;
  clientName: string;
  defendant: string;
  vehicleYear: number;
  vehicleMake: string;
  vehicleModel: string;
  status: string;
  createdAt: string;
  repairOrderCount?: number;
  totalDaysDown?: number;
  totalFees?: number;
}

const statusColors: Record<string, string> = {
  Active: "bg-green-500",
  Discovery: "bg-blue-500",
  Settled: "bg-purple-500",
  Closed: "bg-gray-500",
};

export default function CasesPage() {
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/cases")
      .then((res) => res.json())
      .then((data) => {
        setCases(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching cases:", err);
        setLoading(false);
      });
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Cases</h1>
          <p className="text-muted-foreground">
            All your lemon law cases
          </p>
        </div>
        <Button asChild>
          <Link href="/quick">
            <Plus className="mr-2 h-4 w-4" />
            New Case
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5" />
            All Cases ({cases.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : cases.length === 0 ? (
            <div className="text-center py-12">
              <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">No cases yet</p>
              <Button asChild>
                <Link href="/quick">
                  <Plus className="mr-2 h-4 w-4" />
                  Create your first case
                </Link>
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Case Number</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Defendant</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Repairs</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cases.map((c) => (
                  <TableRow key={c._id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell className="font-medium">{c.caseNumber}</TableCell>
                    <TableCell>{c.clientName}</TableCell>
                    <TableCell>
                      {c.vehicleYear} {c.vehicleMake} {c.vehicleModel}
                    </TableCell>
                    <TableCell>{c.defendant || "-"}</TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={`${statusColors[c.status] || "bg-gray-500"} text-white`}
                      >
                        {c.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {c.repairOrderCount || 0}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/cases/${c._id}`}>
                          <ChevronRight className="h-4 w-4" />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
