"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Loader2 } from "lucide-react";
import { CostInput, CostCategory } from "@/lib/types";

interface Cost {
  _id: string;
  date: string;
  vendor: string;
  reference?: string;
  description: string;
  category: string;
  amount: number;
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

const categoryColors: Record<string, string> = {
  Filing: "bg-blue-500",
  Service: "bg-green-500",
  Appearance: "bg-purple-500",
  Expert: "bg-orange-500",
  Deposition: "bg-red-500",
  Other: "bg-gray-500",
};

export function CostsTab({
  caseId,
  costs,
  onUpdate,
}: {
  caseId: string;
  costs: Cost[];
  onUpdate: () => void;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<CostInput>({
    caseId,
    date: new Date().toISOString().split('T')[0],
    vendor: "",
    reference: "",
    description: "",
    category: "Other",
    amount: 0,
  });

  const resetForm = () => {
    setFormData({
      caseId,
      date: new Date().toISOString().split('T')[0],
      vendor: "",
      reference: "",
      description: "",
      category: "Other",
      amount: 0,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/costs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error("Failed to create cost");

      toast.success("Cost added");
      setDialogOpen(false);
      resetForm();
      onUpdate();
    } catch (error) {
      toast.error("Failed to add cost");
    } finally {
      setLoading(false);
    }
  };

  const totalCosts = costs.reduce((sum, c) => sum + c.amount, 0);

  // Group by category for summary
  const byCategory = costs.reduce((acc, c) => {
    if (!acc[c.category]) {
      acc[c.category] = 0;
    }
    acc[c.category] += c.amount;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle>Cost Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="text-center p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Total Costs</p>
              <p className="text-3xl font-bold">{formatCurrency(totalCosts)}</p>
            </div>
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">By Category</p>
              <div className="space-y-1">
                {Object.entries(byCategory).map(([category, amount]) => (
                  <div key={category} className="flex justify-between text-sm">
                    <span>{category}</span>
                    <span className="font-medium">{formatCurrency(amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Costs Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Litigation Costs</CardTitle>
            <CardDescription>
              {costs.length} cost entries
            </CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Cost
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Cost</DialogTitle>
                <DialogDescription>
                  Record a litigation cost for this case
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Date *</Label>
                    <Input
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Category *</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(value: CostCategory) => setFormData({ ...formData, category: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Filing">Filing</SelectItem>
                        <SelectItem value="Service">Service</SelectItem>
                        <SelectItem value="Appearance">Appearance</SelectItem>
                        <SelectItem value="Expert">Expert</SelectItem>
                        <SelectItem value="Deposition">Deposition</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Vendor *</Label>
                    <Input
                      value={formData.vendor}
                      onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
                      placeholder="e.g., Los Angeles Superior Court"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Amount *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.amount || ""}
                      onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) })}
                      required
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Description *</Label>
                    <Input
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Brief description of the cost"
                      required
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Reference #</Label>
                    <Input
                      value={formData.reference}
                      onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                      placeholder="Invoice or receipt number"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Add Cost
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {costs.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No costs recorded yet. Click &quot;Add Cost&quot; to add one.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {costs.map((cost) => (
                  <TableRow key={cost._id}>
                    <TableCell>{formatDate(cost.date)}</TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={`${categoryColors[cost.category]} text-white`}
                      >
                        {cost.category}
                      </Badge>
                    </TableCell>
                    <TableCell>{cost.vendor}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{cost.description}</TableCell>
                    <TableCell>{cost.reference || "-"}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(cost.amount)}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/50 font-medium">
                  <TableCell colSpan={5}>Total</TableCell>
                  <TableCell className="text-right">{formatCurrency(totalCosts)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
