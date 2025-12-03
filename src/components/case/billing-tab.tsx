"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { toast } from "sonner";
import { Plus, Loader2, Calculator } from "lucide-react";
import { BillingEntryInput, BillingType, Attorney } from "@/lib/types";

interface BillingEntry {
  _id: string;
  date: string;
  type: string;
  description: string;
  attorney: string;
  hours: number;
  rate: number;
  amount: number;
  isReduced: boolean;
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

export function BillingTab({
  caseId,
  billing,
  onUpdate,
}: {
  caseId: string;
  billing: BillingEntry[];
  onUpdate: () => void;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [attorneys, setAttorneys] = useState<Attorney[]>([]);
  const [formData, setFormData] = useState<BillingEntryInput>({
    caseId,
    date: new Date().toISOString().split('T')[0],
    type: "Billable",
    description: "",
    attorney: "",
    hours: 0,
    rate: 0,
    isReduced: false,
  });

  useEffect(() => {
    fetch("/api/attorneys")
      .then((res) => res.json())
      .then((data) => setAttorneys(data))
      .catch(console.error);
  }, []);

  const resetForm = () => {
    setFormData({
      caseId,
      date: new Date().toISOString().split('T')[0],
      type: "Billable",
      description: "",
      attorney: "",
      hours: 0,
      rate: 0,
      isReduced: false,
    });
  };

  const handleAttorneyChange = (name: string) => {
    const attorney = attorneys.find((a) => a.name === name);
    setFormData({
      ...formData,
      attorney: name,
      rate: attorney?.defaultRate || formData.rate,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/billing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error("Failed to create billing entry");

      toast.success("Billing entry added");
      setDialogOpen(false);
      resetForm();
      onUpdate();
    } catch (error) {
      toast.error("Failed to add billing entry");
    } finally {
      setLoading(false);
    }
  };

  const totalHours = billing.filter((b) => b.type === "Billable").reduce((sum, b) => sum + b.hours, 0);
  const totalAmount = billing.filter((b) => b.type === "Billable").reduce((sum, b) => sum + b.amount, 0);

  // Group by attorney for summary
  const byAttorney = billing
    .filter((b) => b.type === "Billable")
    .reduce((acc, b) => {
      if (!acc[b.attorney]) {
        acc[b.attorney] = { hours: 0, amount: 0 };
      }
      acc[b.attorney].hours += b.hours;
      acc[b.attorney].amount += b.amount;
      return acc;
    }, {} as Record<string, { hours: number; amount: number }>);

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Fee Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="text-center p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Total Hours</p>
              <p className="text-3xl font-bold">{totalHours.toFixed(1)}</p>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Total Fees</p>
              <p className="text-3xl font-bold">{formatCurrency(totalAmount)}</p>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Avg. Rate</p>
              <p className="text-3xl font-bold">
                {totalHours > 0 ? formatCurrency(totalAmount / totalHours) : "$0"}
              </p>
            </div>
          </div>

          {Object.keys(byAttorney).length > 0 && (
            <div className="mt-4">
              <p className="text-sm font-medium mb-2">By Attorney</p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Attorney</TableHead>
                    <TableHead className="text-right">Hours</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Avg. Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(byAttorney).map(([attorney, data]) => (
                    <TableRow key={attorney}>
                      <TableCell className="font-medium">{attorney}</TableCell>
                      <TableCell className="text-right">{data.hours.toFixed(1)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(data.amount)}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(data.amount / data.hours)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Billing Entries */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Billing Entries</CardTitle>
            <CardDescription>
              {billing.length} entries
            </CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Entry
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Billing Entry</DialogTitle>
                <DialogDescription>
                  Record time spent on this case
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
                    <Label>Type *</Label>
                    <Select
                      value={formData.type}
                      onValueChange={(value: BillingType) => setFormData({ ...formData, type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Billable">Billable</SelectItem>
                        <SelectItem value="Non-billable">Non-billable</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Attorney *</Label>
                    <Select
                      value={formData.attorney}
                      onValueChange={handleAttorneyChange}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select attorney" />
                      </SelectTrigger>
                      <SelectContent>
                        {attorneys.map((a) => (
                          <SelectItem key={a._id?.toString()} value={a.name}>
                            {a.name} {a.isParalegal && "(Paralegal)"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Hours *</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={formData.hours || ""}
                      onChange={(e) => setFormData({ ...formData, hours: parseFloat(e.target.value) })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Rate ($/hr) *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.rate || ""}
                      onChange={(e) => setFormData({ ...formData, rate: parseFloat(e.target.value) })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Amount</Label>
                    <Input
                      type="text"
                      value={formatCurrency(formData.hours * formData.rate)}
                      disabled
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Description *</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    placeholder="Describe the work performed"
                    required
                  />
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Add Entry
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {billing.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No billing entries yet. Click &quot;Add Entry&quot; to record time.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Attorney</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Hours</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {billing.map((entry) => (
                  <TableRow key={entry._id} className={entry.type === "Non-billable" ? "opacity-60" : ""}>
                    <TableCell>{formatDate(entry.date)}</TableCell>
                    <TableCell>{entry.attorney}</TableCell>
                    <TableCell className="max-w-[300px] truncate">{entry.description}</TableCell>
                    <TableCell className="text-right">{entry.hours.toFixed(1)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(entry.rate)}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(entry.amount)}</TableCell>
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
