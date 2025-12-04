"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  ArrowLeft,
  Save,
  Car,
  FileText,
  Upload,
  Download,
  Loader2,
  Sparkles,
  FileSpreadsheet,
  Trash2,
  Check,
  X,
} from "lucide-react";
import Link from "next/link";

interface CaseData {
  _id: string;
  caseNumber: string;
  clientName: string;
  defendant: string;
  vehicleYear: number;
  vehicleMake: string;
  vehicleModel: string;
  vin: string;
  purchaseDate: string;
  purchasePrice: number;
  status: string;
  createdAt: string;
}

interface RepairOrder {
  _id?: string;
  roNumber?: string;
  dateIn?: string;
  dateOut?: string;
  mileageIn?: number;
  mileageOut?: number;
  dealership?: string;
  customerConcern?: string;
  workPerformed?: string;
  partsReplaced?: string;
  category?: string;
  daysDown?: number;
  resolved?: string;
}

interface BillingEntry {
  attorney?: string;
  hours?: number;
  rate?: number;
  description?: string;
  date?: string;
}

interface UploadedFile {
  id: string;
  name: string;
  status: "uploading" | "processing" | "done" | "error";
  type?: "repair_orders" | "billing" | "unknown";
  data?: RepairOrder[] | BillingEntry[];
  error?: string;
}

export default function CaseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const caseId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [caseData, setCaseData] = useState<CaseData | null>(null);
  const [repairOrders, setRepairOrders] = useState<RepairOrder[]>([]);
  const [billingEntries, setBillingEntries] = useState<BillingEntry[]>([]);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);

  // Load case data
  useEffect(() => {
    Promise.all([
      fetch(`/api/cases/${caseId}`).then((r) => r.json()),
      fetch(`/api/repair-orders?caseId=${caseId}`).then((r) => r.json()),
      fetch(`/api/billing?caseId=${caseId}`).then((r) => r.json()),
    ])
      .then(([caseRes, repairsRes, billingRes]) => {
        setCaseData(caseRes);
        setRepairOrders(repairsRes || []);
        setBillingEntries(billingRes || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error loading case:", err);
        toast.error("Failed to load case");
        setLoading(false);
      });
  }, [caseId]);

  // Calculate totals
  const totalDaysDown = repairOrders.reduce((sum, ro) => sum + (ro.daysDown || 0), 0);
  const totalHours = billingEntries.reduce((sum, b) => sum + (b.hours || 0), 0);
  const totalFees = billingEntries.reduce((sum, b) => sum + (b.hours || 0) * (b.rate || 0), 0);

  // Save case info
  const saveCase = async () => {
    if (!caseData) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/cases/${caseId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(caseData),
      });
      if (!response.ok) throw new Error("Save failed");
      toast.success("Case saved!");
    } catch {
      toast.error("Failed to save case");
    } finally {
      setSaving(false);
    }
  };

  // File upload handler
  const handleFileDrop = useCallback(async (droppedFiles: FileList | File[]) => {
    const fileArray = Array.from(droppedFiles);

    for (const file of fileArray) {
      const fileId = Math.random().toString(36).substring(7);
      const newFile: UploadedFile = {
        id: fileId,
        name: file.name,
        status: "uploading",
      };

      setFiles((prev) => [...prev, newFile]);

      try {
        setFiles((prev) =>
          prev.map((f) => (f.id === fileId ? { ...f, status: "processing" } : f))
        );

        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch("/api/extract", {
          method: "POST",
          body: formData,
        });

        const result = await response.json();

        if (result.success) {
          setFiles((prev) =>
            prev.map((f) =>
              f.id === fileId
                ? { ...f, status: "done", type: result.type, data: result.data }
                : f
            )
          );

          // Save to database AND update local state
          if (result.type === "repair_orders" && result.data.length > 0) {
            // Save to database
            const saveResponse = await fetch("/api/repair-orders", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                caseId,
                repairOrders: result.data.map((ro: RepairOrder) => ({
                  roNumber: ro.roNumber || "",
                  dealership: ro.dealership || "",
                  dateIn: ro.dateIn || "",
                  dateOut: ro.dateOut || "",
                  mileageIn: ro.mileageIn || 0,
                  mileageOut: ro.mileageOut || 0,
                  daysDown: ro.daysDown || 0,
                  category: ro.category || "Other",
                  customerConcern: ro.customerConcern || "",
                  workPerformed: ro.workPerformed || "",
                  partsReplaced: ro.partsReplaced || "",
                  resolved: ro.resolved || "No",
                })),
              }),
            });

            if (saveResponse.ok) {
              // Refresh from database to get IDs
              const freshData = await fetch(`/api/repair-orders?caseId=${caseId}`).then(r => r.json());
              setRepairOrders(freshData || []);
            } else {
              // Fallback to local state only
              setRepairOrders((prev) => [...prev, ...result.data]);
            }
          } else if (result.type === "billing" && result.data.length > 0) {
            // Save to database
            const saveResponse = await fetch("/api/billing", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                caseId,
                billingEntries: result.data.map((b: BillingEntry) => ({
                  date: b.date || "",
                  attorney: b.attorney || "",
                  hours: b.hours || 0,
                  rate: b.rate || 0,
                  description: b.description || "",
                  type: "Billable",
                })),
              }),
            });

            if (saveResponse.ok) {
              // Refresh from database to get IDs
              const freshData = await fetch(`/api/billing?caseId=${caseId}`).then(r => r.json());
              setBillingEntries(freshData || []);
            } else {
              // Fallback to local state only
              setBillingEntries((prev) => [...prev, ...result.data]);
            }
          }

          toast.success(`Extracted ${result.data.length} ${result.type === "repair_orders" ? "repair orders" : "billing entries"}`);
        } else {
          throw new Error(result.error || "Extraction failed");
        }
      } catch (error) {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === fileId
              ? { ...f, status: "error", error: error instanceof Error ? error.message : "Failed" }
              : f
          )
        );
        toast.error(`Failed to process ${file.name}`);
      }
    }
  }, [caseId]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      if (e.dataTransfer.files.length) {
        handleFileDrop(e.dataTransfer.files);
      }
    },
    [handleFileDrop]
  );

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  // Generate document
  const generateDocument = async (type: "motion" | "repair_summary" | "billing_summary") => {
    if (!caseData) return;
    setGenerating(true);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          caseData: {
            caseNumber: caseData.caseNumber,
            clientName: caseData.clientName,
            defendant: caseData.defendant,
            vehicleYear: caseData.vehicleYear,
            vehicleMake: caseData.vehicleMake,
            vehicleModel: caseData.vehicleModel,
            vin: caseData.vin,
            purchaseDate: caseData.purchaseDate,
            purchasePrice: caseData.purchasePrice,
          },
          repairOrders,
          billing: {
            entries: billingEntries,
            totalHours,
            totalFees,
          },
        }),
      });

      if (!response.ok) throw new Error("Generation failed");

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download =
        type === "motion"
          ? `Motion_${caseData.clientName.replace(/\s+/g, "_")}.docx`
          : type === "repair_summary"
          ? `Repair_Summary_${caseData.clientName.replace(/\s+/g, "_")}.docx`
          : `Billing_Summary_${caseData.clientName.replace(/\s+/g, "_")}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("Document generated!");
    } catch {
      toast.error("Failed to generate document");
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!caseData) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground mb-4">Case not found</p>
        <Button asChild>
          <Link href="/cases">Back to Cases</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/cases">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{caseData.caseNumber}</h1>
            <p className="text-muted-foreground">{caseData.clientName} v. {caseData.defendant}</p>
          </div>
        </div>
        <Button onClick={saveCase} disabled={saving}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Save Changes
        </Button>
      </div>

      <Tabs defaultValue="info" className="space-y-4">
        <TabsList>
          <TabsTrigger value="info">Case Info</TabsTrigger>
          <TabsTrigger value="repairs">Repairs ({repairOrders.length})</TabsTrigger>
          <TabsTrigger value="billing">Billing ({billingEntries.length})</TabsTrigger>
          <TabsTrigger value="generate">Generate Docs</TabsTrigger>
        </TabsList>

        {/* Case Info Tab */}
        <TabsContent value="info">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Car className="h-5 w-5" />
                Case Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>Case Number</Label>
                  <Input
                    value={caseData.caseNumber}
                    onChange={(e) => setCaseData({ ...caseData, caseNumber: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Client Name</Label>
                  <Input
                    value={caseData.clientName}
                    onChange={(e) => setCaseData({ ...caseData, clientName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Defendant</Label>
                  <Input
                    value={caseData.defendant}
                    onChange={(e) => setCaseData({ ...caseData, defendant: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Vehicle Year</Label>
                  <Input
                    type="number"
                    value={caseData.vehicleYear}
                    onChange={(e) => setCaseData({ ...caseData, vehicleYear: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Make</Label>
                  <Input
                    value={caseData.vehicleMake}
                    onChange={(e) => setCaseData({ ...caseData, vehicleMake: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Model</Label>
                  <Input
                    value={caseData.vehicleModel}
                    onChange={(e) => setCaseData({ ...caseData, vehicleModel: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>VIN</Label>
                  <Input
                    value={caseData.vin}
                    onChange={(e) => setCaseData({ ...caseData, vin: e.target.value.toUpperCase() })}
                    maxLength={17}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Purchase Date</Label>
                  <Input
                    type="date"
                    value={caseData.purchaseDate?.split("T")[0] || ""}
                    onChange={(e) => setCaseData({ ...caseData, purchaseDate: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Purchase Price</Label>
                  <Input
                    type="number"
                    value={caseData.purchasePrice}
                    onChange={(e) => setCaseData({ ...caseData, purchasePrice: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Repairs Tab */}
        <TabsContent value="repairs">
          <Card>
            <CardHeader>
              <CardTitle>Repair Orders</CardTitle>
              <CardDescription>
                {repairOrders.length} repairs • {totalDaysDown} total days down
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Upload Zone */}
              <div
                onDrop={handleDrop}
                onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                onDragLeave={() => setIsDragOver(false)}
                className={`border-2 border-dashed rounded-lg p-8 text-center mb-6 transition-all cursor-pointer
                  ${isDragOver ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-muted-foreground/50"}`}
                onClick={() => document.getElementById("repair-file-input")?.click()}
              >
                <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Drop repair order PDFs here</p>
                <input
                  id="repair-file-input"
                  type="file"
                  multiple
                  accept=".pdf,.docx,.jpg,.jpeg,.png"
                  onChange={(e) => e.target.files && handleFileDrop(e.target.files)}
                  className="hidden"
                />
              </div>

              {/* Processing Files */}
              {files.filter(f => f.type === "repair_orders" || f.status === "processing").length > 0 && (
                <div className="space-y-2 mb-6">
                  {files.filter(f => f.type === "repair_orders" || f.status === "processing").map((file) => (
                    <div key={file.id} className="flex items-center justify-between p-2 bg-muted rounded">
                      <span className="text-sm">{file.name}</span>
                      <div className="flex items-center gap-2">
                        {file.status === "processing" && <Loader2 className="h-4 w-4 animate-spin" />}
                        {file.status === "done" && <Check className="h-4 w-4 text-green-500" />}
                        {file.status === "error" && <X className="h-4 w-4 text-red-500" />}
                        <Button variant="ghost" size="icon" onClick={() => removeFile(file.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Repair Orders List */}
              {repairOrders.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No repair orders yet</p>
              ) : (
                <div className="space-y-4">
                  {repairOrders.map((ro, i) => (
                    <div key={i} className="p-4 border rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-medium">#{ro.roNumber || i + 1} - {ro.dateIn || "No date"}</p>
                          <p className="text-sm text-muted-foreground">{ro.dealership}</p>
                        </div>
                        <Badge variant="outline">{ro.daysDown || 0} days</Badge>
                      </div>
                      <p className="text-sm"><strong>Concern:</strong> {ro.customerConcern || "-"}</p>
                      <p className="text-sm"><strong>Work:</strong> {ro.workPerformed || "-"}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Billing Tab */}
        <TabsContent value="billing">
          <Card>
            <CardHeader>
              <CardTitle>Billing Entries</CardTitle>
              <CardDescription>
                {totalHours.toFixed(1)} hours • ${totalFees.toLocaleString()} total fees
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Upload Zone */}
              <div
                onDrop={handleDrop}
                onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                onDragLeave={() => setIsDragOver(false)}
                className={`border-2 border-dashed rounded-lg p-8 text-center mb-6 transition-all cursor-pointer
                  ${isDragOver ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-muted-foreground/50"}`}
                onClick={() => document.getElementById("billing-file-input")?.click()}
              >
                <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Drop billing CSVs or PDFs here</p>
                <input
                  id="billing-file-input"
                  type="file"
                  multiple
                  accept=".pdf,.csv,.txt,.docx"
                  onChange={(e) => e.target.files && handleFileDrop(e.target.files)}
                  className="hidden"
                />
              </div>

              {/* Billing List */}
              {billingEntries.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No billing entries yet</p>
              ) : (
                <div className="space-y-2">
                  {billingEntries.map((entry, i) => (
                    <div key={i} className="flex justify-between items-center p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{entry.attorney || "Attorney"}</p>
                        <p className="text-sm text-muted-foreground">{entry.description}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{entry.hours}h @ ${entry.rate}</p>
                        <p className="text-sm text-muted-foreground">
                          ${((entry.hours || 0) * (entry.rate || 0)).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Generate Tab */}
        <TabsContent value="generate">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5" />
                Generate Documents
              </CardTitle>
              <CardDescription>Generate court-ready Word documents</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Summary Stats */}
              <div className="grid gap-4 md:grid-cols-4 mb-6">
                <div className="text-center p-4 bg-muted rounded-lg">
                  <p className="text-2xl font-bold">{repairOrders.length}</p>
                  <p className="text-sm text-muted-foreground">Repair Visits</p>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <p className="text-2xl font-bold">{totalDaysDown}</p>
                  <p className="text-sm text-muted-foreground">Days Down</p>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <p className="text-2xl font-bold">{totalHours.toFixed(1)}</p>
                  <p className="text-sm text-muted-foreground">Hours Billed</p>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <p className="text-2xl font-bold">${totalFees.toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">Total Fees</p>
                </div>
              </div>

              {/* Generate Buttons */}
              <div className="flex flex-wrap gap-4">
                <Button
                  size="lg"
                  onClick={() => generateDocument("motion")}
                  disabled={generating}
                  className="flex-1"
                >
                  {generating ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="mr-2 h-4 w-4" />
                  )}
                  Generate Fee Motion
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => generateDocument("repair_summary")}
                  disabled={generating || repairOrders.length === 0}
                >
                  <FileText className="mr-2 h-4 w-4" />
                  Repair Summary
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => generateDocument("billing_summary")}
                  disabled={generating || billingEntries.length === 0}
                >
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  Billing Summary
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
