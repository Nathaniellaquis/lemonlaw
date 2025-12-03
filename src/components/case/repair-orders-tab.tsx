"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { toast } from "sonner";
import { Plus, Loader2, Trash2 } from "lucide-react";
import { RepairOrderInput, RepairCategory, ResolvedStatus } from "@/lib/types";

interface RepairOrder {
  _id: string;
  roNumber: string;
  dealership: string;
  dateIn: string;
  dateOut: string;
  mileageIn: number;
  mileageOut: number;
  daysDown: number;
  techNumber?: string;
  category: string;
  customerConcern: string;
  workPerformed: string;
  partsReplaced?: string;
  resolved: string;
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const categoryColors: Record<string, string> = {
  Engine: "bg-red-500",
  Transmission: "bg-orange-500",
  Electrical: "bg-yellow-500",
  Suspension: "bg-green-500",
  Brakes: "bg-blue-500",
  HVAC: "bg-purple-500",
  Other: "bg-gray-500",
};

const resolvedColors: Record<string, string> = {
  Yes: "bg-green-500",
  No: "bg-red-500",
  Partial: "bg-yellow-500",
};

export function RepairOrdersTab({
  caseId,
  repairOrders,
  onUpdate,
}: {
  caseId: string;
  repairOrders: RepairOrder[];
  onUpdate: () => void;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<RepairOrderInput>({
    caseId,
    roNumber: "",
    dealership: "",
    dateIn: "",
    dateOut: "",
    mileageIn: 0,
    mileageOut: 0,
    daysDown: 0,
    techNumber: "",
    category: "Other",
    customerConcern: "",
    workPerformed: "",
    partsReplaced: "",
    resolved: "No",
  });

  const resetForm = () => {
    setFormData({
      caseId,
      roNumber: "",
      dealership: "",
      dateIn: "",
      dateOut: "",
      mileageIn: 0,
      mileageOut: 0,
      daysDown: 0,
      techNumber: "",
      category: "Other",
      customerConcern: "",
      workPerformed: "",
      partsReplaced: "",
      resolved: "No",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/repair-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error("Failed to create repair order");

      toast.success("Repair order added");
      setDialogOpen(false);
      resetForm();
      onUpdate();
    } catch (error) {
      toast.error("Failed to add repair order");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this repair order?")) return;

    try {
      const response = await fetch(`/api/repair-orders/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete");

      toast.success("Repair order deleted");
      onUpdate();
    } catch (error) {
      toast.error("Failed to delete repair order");
    }
  };

  const totalDaysDown = repairOrders.reduce((sum, ro) => sum + ro.daysDown, 0);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Repair Orders</CardTitle>
          <CardDescription>
            {repairOrders.length} visits | {totalDaysDown} total days down
          </CardDescription>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Repair Order
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add Repair Order</DialogTitle>
              <DialogDescription>
                Enter the details from the dealership repair order
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>RO Number *</Label>
                  <Input
                    value={formData.roNumber}
                    onChange={(e) => setFormData({ ...formData, roNumber: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Dealership *</Label>
                  <Input
                    value={formData.dealership}
                    onChange={(e) => setFormData({ ...formData, dealership: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Date In *</Label>
                  <Input
                    type="date"
                    value={formData.dateIn}
                    onChange={(e) => setFormData({ ...formData, dateIn: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Date Out *</Label>
                  <Input
                    type="date"
                    value={formData.dateOut}
                    onChange={(e) => setFormData({ ...formData, dateOut: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Mileage In *</Label>
                  <Input
                    type="number"
                    value={formData.mileageIn || ""}
                    onChange={(e) => setFormData({ ...formData, mileageIn: parseInt(e.target.value) })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Mileage Out *</Label>
                  <Input
                    type="number"
                    value={formData.mileageOut || ""}
                    onChange={(e) => setFormData({ ...formData, mileageOut: parseInt(e.target.value) })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Days Down</Label>
                  <Input
                    type="number"
                    value={formData.daysDown || ""}
                    onChange={(e) => setFormData({ ...formData, daysDown: parseInt(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tech Number</Label>
                  <Input
                    value={formData.techNumber}
                    onChange={(e) => setFormData({ ...formData, techNumber: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Category *</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value: RepairCategory) => setFormData({ ...formData, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Engine">Engine</SelectItem>
                      <SelectItem value="Transmission">Transmission</SelectItem>
                      <SelectItem value="Electrical">Electrical</SelectItem>
                      <SelectItem value="Suspension">Suspension</SelectItem>
                      <SelectItem value="Brakes">Brakes</SelectItem>
                      <SelectItem value="HVAC">HVAC</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Resolved?</Label>
                  <Select
                    value={formData.resolved}
                    onValueChange={(value: ResolvedStatus) => setFormData({ ...formData, resolved: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Yes">Yes</SelectItem>
                      <SelectItem value="No">No</SelectItem>
                      <SelectItem value="Partial">Partial</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Customer Concern *</Label>
                <Textarea
                  value={formData.customerConcern}
                  onChange={(e) => setFormData({ ...formData, customerConcern: e.target.value })}
                  rows={3}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Work Performed *</Label>
                <Textarea
                  value={formData.workPerformed}
                  onChange={(e) => setFormData({ ...formData, workPerformed: e.target.value })}
                  rows={3}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Parts Replaced</Label>
                <Textarea
                  value={formData.partsReplaced}
                  onChange={(e) => setFormData({ ...formData, partsReplaced: e.target.value })}
                  rows={2}
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Add Repair Order
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {repairOrders.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            No repair orders yet. Click &quot;Add Repair Order&quot; to add one.
          </p>
        ) : (
          <Accordion type="single" collapsible className="w-full">
            {repairOrders.map((ro, index) => (
              <AccordionItem key={ro._id} value={ro._id}>
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-4 text-left">
                    <span className="font-mono text-muted-foreground">#{index + 1}</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{formatDate(ro.dateIn)}</span>
                        <Badge variant="secondary" className={`${categoryColors[ro.category]} text-white text-xs`}>
                          {ro.category}
                        </Badge>
                        <Badge variant="secondary" className={`${resolvedColors[ro.resolved]} text-white text-xs`}>
                          {ro.resolved}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {ro.dealership} | {ro.daysDown} days | {ro.mileageIn.toLocaleString()} mi
                      </p>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4 pt-4">
                    <div className="grid gap-4 md:grid-cols-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">RO Number</p>
                        <p className="font-medium">{ro.roNumber}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Date Range</p>
                        <p className="font-medium">{formatDate(ro.dateIn)} - {formatDate(ro.dateOut)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Mileage</p>
                        <p className="font-medium">{ro.mileageIn.toLocaleString()} - {ro.mileageOut.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Tech #</p>
                        <p className="font-medium">{ro.techNumber || "-"}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-sm mb-1">Customer Concern</p>
                      <p className="text-sm bg-muted p-3 rounded">{ro.customerConcern}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-sm mb-1">Work Performed</p>
                      <p className="text-sm bg-muted p-3 rounded">{ro.workPerformed}</p>
                    </div>
                    {ro.partsReplaced && (
                      <div>
                        <p className="text-muted-foreground text-sm mb-1">Parts Replaced</p>
                        <p className="text-sm bg-muted p-3 rounded">{ro.partsReplaced}</p>
                      </div>
                    )}
                    <div className="flex justify-end">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(ro._id)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </CardContent>
    </Card>
  );
}
