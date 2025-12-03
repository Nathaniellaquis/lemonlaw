"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Upload,
  FileText,
  Loader2,
  Check,
  X,
  Download,
  Trash2,
  Sparkles,
  Car,
  FileSpreadsheet,
  Save,
} from "lucide-react";

interface UploadedFile {
  id: string;
  name: string;
  status: "uploading" | "processing" | "done" | "error";
  type?: "repair_orders" | "billing" | "costs" | "unknown";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data?: any[];
  error?: string;
}

interface CaseInfo {
  caseNumber: string;
  clientName: string;
  defendant: string;
  vehicleYear: string;
  vehicleMake: string;
  vehicleModel: string;
  vin: string;
  purchaseDate: string;
  purchasePrice: string;
}

export default function QuickPage() {
  const router = useRouter();
  const [caseInfo, setCaseInfo] = useState<CaseInfo>({
    caseNumber: "",
    clientName: "",
    defendant: "",
    vehicleYear: "",
    vehicleMake: "",
    vehicleModel: "",
    vin: "",
    purchaseDate: "",
    purchasePrice: "",
  });

  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedCaseId, setSavedCaseId] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // Extract stats from processed files
  const repairOrders = files
    .filter((f) => f.status === "done" && f.type === "repair_orders")
    .flatMap((f) => f.data || []);

  const billingEntries = files
    .filter((f) => f.status === "done" && f.type === "billing")
    .flatMap((f) => f.data || []);

  const costEntries = files
    .filter((f) => f.status === "done" && f.type === "costs")
    .flatMap((f) => f.data || []);

  const totalDaysDown = repairOrders.reduce((sum, ro) => sum + (ro.daysDown || 0), 0);
  const totalHours = billingEntries.reduce((sum, b) => sum + (b.hours || 0), 0);
  const totalFees = billingEntries.reduce((sum, b) => sum + (b.hours || 0) * (b.rate || 0), 0);
  const totalCosts = costEntries.reduce((sum, c) => sum + (c.amount || 0), 0);

  const handleFileDrop = useCallback(async (droppedFiles: FileList | File[]) => {
    const fileArray = Array.from(droppedFiles);

    if (fileArray.length === 0) return;

    toast.info(`Processing ${fileArray.length} file${fileArray.length > 1 ? 's' : ''}...`);

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
          const typeLabels = { repair_orders: "repair orders", billing: "billing entries", costs: "cost entries" };
          toast.success(`Extracted ${result.data.length} ${typeLabels[result.type as keyof typeof typeLabels] || "items"}`);
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
  }, []);

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

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files?.length) {
        handleFileDrop(e.target.files);
      }
    },
    [handleFileDrop]
  );

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  // Save case to database
  const saveCase = async () => {
    if (!caseInfo.caseNumber || !caseInfo.clientName) {
      toast.error("Please fill in case number and client name");
      return;
    }

    setSaving(true);

    try {
      // 1. Create the case
      const caseResponse = await fetch("/api/cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caseNumber: caseInfo.caseNumber,
          clientName: caseInfo.clientName,
          defendant: caseInfo.defendant,
          vehicleYear: parseInt(caseInfo.vehicleYear) || 0,
          vehicleMake: caseInfo.vehicleMake,
          vehicleModel: caseInfo.vehicleModel,
          vin: caseInfo.vin,
          purchaseDate: caseInfo.purchaseDate,
          purchasePrice: parseFloat(caseInfo.purchasePrice) || 0,
        }),
      });

      const caseResult = await caseResponse.json();

      if (!caseResponse.ok) {
        throw new Error(caseResult.error || "Failed to create case");
      }

      const caseId = caseResult._id;

      // 2. Save repair orders
      if (repairOrders.length > 0) {
        await fetch("/api/repair-orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            caseId,
            repairOrders: repairOrders.map(ro => ({
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
      }

      // 3. Save billing entries
      if (billingEntries.length > 0) {
        await fetch("/api/billing", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            caseId,
            billingEntries: billingEntries.map(b => ({
              date: b.date || "",
              attorney: b.attorney || "",
              hours: b.hours || 0,
              rate: b.rate || 0,
              description: b.description || "",
              type: b.type || "Billable",
            })),
          }),
        });
      }

      setSavedCaseId(caseId);
      toast.success("Case saved successfully!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save case");
    } finally {
      setSaving(false);
    }
  };

  const generateDocument = async (type: "motion" | "repair_summary" | "billing_summary" | "full_package") => {
    if (!caseInfo.caseNumber || !caseInfo.clientName) {
      toast.error("Please fill in case number and client name");
      return;
    }

    setGenerating(true);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          caseData: {
            ...caseInfo,
            vehicleYear: parseInt(caseInfo.vehicleYear) || 2024,
            purchasePrice: parseFloat(caseInfo.purchasePrice) || 0,
          },
          repairOrders,
          billing: {
            entries: billingEntries,
            totalHours,
            totalFees,
          },
          costs: {
            entries: costEntries,
            totalCosts,
          },
        }),
      });

      if (!response.ok) {
        throw new Error("Generation failed");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const fileNames = {
        motion: `Motion_${caseInfo.clientName.replace(/\s+/g, "_")}.docx`,
        repair_summary: `Exhibit_A_Repair_Summary_${caseInfo.clientName.replace(/\s+/g, "_")}.docx`,
        billing_summary: `Exhibit_B_Billing_Summary_${caseInfo.clientName.replace(/\s+/g, "_")}.docx`,
        full_package: `Fee_Motion_Package_${caseInfo.clientName.replace(/\s+/g, "_")}.docx`,
      };
      a.download = fileNames[type];
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("Document generated and downloaded!");
    } catch {
      toast.error("Failed to generate document");
    } finally {
      setGenerating(false);
    }
  };

  const isReady = files.some((f) => f.status === "done") && caseInfo.caseNumber && caseInfo.clientName;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold flex items-center justify-center gap-3">
          <span className="text-5xl">🍋</span> Lemon Law AI
        </h1>
        <p className="text-muted-foreground text-lg">
          Upload docs → AI extracts → Generate motion
        </p>
      </div>

      {/* Case Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Car className="h-5 w-5" />
            Case Information
          </CardTitle>
          <CardDescription>Basic info for the generated documents</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Case Number *</Label>
              <Input
                value={caseInfo.caseNumber}
                onChange={(e) => setCaseInfo({ ...caseInfo, caseNumber: e.target.value })}
                placeholder="24CHCV01234"
                disabled={!!savedCaseId}
              />
            </div>
            <div className="space-y-2">
              <Label>Client Name *</Label>
              <Input
                value={caseInfo.clientName}
                onChange={(e) => setCaseInfo({ ...caseInfo, clientName: e.target.value })}
                placeholder="John Smith"
                disabled={!!savedCaseId}
              />
            </div>
            <div className="space-y-2">
              <Label>Defendant</Label>
              <Input
                value={caseInfo.defendant}
                onChange={(e) => setCaseInfo({ ...caseInfo, defendant: e.target.value })}
                placeholder="Tesla, Inc."
                disabled={!!savedCaseId}
              />
            </div>
            <div className="space-y-2">
              <Label>Vehicle Year</Label>
              <Input
                value={caseInfo.vehicleYear}
                onChange={(e) => setCaseInfo({ ...caseInfo, vehicleYear: e.target.value })}
                placeholder="2023"
                disabled={!!savedCaseId}
              />
            </div>
            <div className="space-y-2">
              <Label>Make</Label>
              <Input
                value={caseInfo.vehicleMake}
                onChange={(e) => setCaseInfo({ ...caseInfo, vehicleMake: e.target.value })}
                placeholder="Tesla"
                disabled={!!savedCaseId}
              />
            </div>
            <div className="space-y-2">
              <Label>Model</Label>
              <Input
                value={caseInfo.vehicleModel}
                onChange={(e) => setCaseInfo({ ...caseInfo, vehicleModel: e.target.value })}
                placeholder="Model 3"
                disabled={!!savedCaseId}
              />
            </div>
            <div className="space-y-2">
              <Label>VIN</Label>
              <Input
                value={caseInfo.vin}
                onChange={(e) => setCaseInfo({ ...caseInfo, vin: e.target.value.toUpperCase() })}
                placeholder="5YJ3E1EA1NF123456"
                maxLength={17}
                disabled={!!savedCaseId}
              />
            </div>
            <div className="space-y-2">
              <Label>Purchase Date</Label>
              <Input
                type="date"
                value={caseInfo.purchaseDate}
                onChange={(e) => setCaseInfo({ ...caseInfo, purchaseDate: e.target.value })}
                disabled={!!savedCaseId}
              />
            </div>
            <div className="space-y-2">
              <Label>Purchase Price</Label>
              <Input
                type="number"
                value={caseInfo.purchasePrice}
                onChange={(e) => setCaseInfo({ ...caseInfo, purchasePrice: e.target.value })}
                placeholder="45000"
                disabled={!!savedCaseId}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Upload Zone */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload Documents
          </CardTitle>
          <CardDescription>Drop repair orders, billing records, or any case documents</CardDescription>
        </CardHeader>
        <CardContent>
          <div
            onDrop={handleDrop}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            className={`
              border-2 border-dashed rounded-lg p-12 text-center transition-all cursor-pointer
              ${isDragOver ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-muted-foreground/50"}
            `}
            onClick={() => document.getElementById("file-input")?.click()}
          >
            <Upload className={`h-12 w-12 mx-auto mb-4 ${isDragOver ? "text-primary" : "text-muted-foreground"}`} />
            <p className="text-lg font-medium mb-2">
              {isDragOver ? "Drop files here!" : "Drop all your files here"}
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              PDF, DOCX, Images, CSV - Repair Orders, Billing, Costs
            </p>
            <div className="flex justify-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <FileText className="h-4 w-4" />
                PDF
              </div>
              <div className="flex items-center gap-1">
                <FileText className="h-4 w-4" />
                DOCX
              </div>
              <div className="flex items-center gap-1">
                <FileSpreadsheet className="h-4 w-4" />
                CSV
              </div>
              <div className="flex items-center gap-1">
                <FileText className="h-4 w-4" />
                Images
              </div>
            </div>
            <input
              id="file-input"
              type="file"
              multiple
              accept=".pdf,.docx,.jpg,.jpeg,.png,.csv,.txt,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={handleFileInput}
              className="hidden"
            />
          </div>

          {/* File List */}
          {files.length > 0 && (
            <div className="mt-6 space-y-2">
              <h4 className="font-medium">Uploaded Files</h4>
              {files.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center justify-between p-3 bg-muted rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{file.name}</p>
                      {file.status === "done" && file.data && (
                        <p className="text-xs text-muted-foreground">
                          {file.data.length} {file.type === "repair_orders" ? "repair orders" : file.type === "billing" ? "billing entries" : file.type === "costs" ? "cost entries" : "items"} extracted
                        </p>
                      )}
                      {file.status === "error" && (
                        <p className="text-xs text-red-500">{file.error}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {file.status === "uploading" && <Loader2 className="h-4 w-4 animate-spin" />}
                    {file.status === "processing" && (
                      <Badge variant="secondary" className="gap-1">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Processing
                      </Badge>
                    )}
                    {file.status === "done" && (
                      <Badge className="bg-green-500 gap-1">
                        <Check className="h-3 w-3" />
                        Done
                      </Badge>
                    )}
                    {file.status === "error" && (
                      <Badge variant="destructive" className="gap-1">
                        <X className="h-3 w-3" />
                        Error
                      </Badge>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => removeFile(file.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI Summary */}
      {files.some((f) => f.status === "done") && (
        <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              AI Extraction Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-5">
              <div className="text-center p-4 bg-background rounded-lg">
                <p className="text-3xl font-bold">{repairOrders.length}</p>
                <p className="text-sm text-muted-foreground">Repair Visits</p>
              </div>
              <div className="text-center p-4 bg-background rounded-lg">
                <p className="text-3xl font-bold">{totalDaysDown}</p>
                <p className="text-sm text-muted-foreground">Days Down</p>
              </div>
              <div className="text-center p-4 bg-background rounded-lg">
                <p className="text-3xl font-bold">{totalHours.toFixed(1)}</p>
                <p className="text-sm text-muted-foreground">Hours Billed</p>
              </div>
              <div className="text-center p-4 bg-background rounded-lg">
                <p className="text-3xl font-bold">${totalFees.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Total Fees</p>
              </div>
              <div className="text-center p-4 bg-background rounded-lg">
                <p className="text-3xl font-bold">${totalCosts.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Total Costs</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Save & Generate Buttons */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Save & Generate Documents
          </CardTitle>
          <CardDescription>
            Save case to database and generate court-ready documents
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Save Button */}
          {!savedCaseId ? (
            <Button
              size="lg"
              variant="outline"
              onClick={saveCase}
              disabled={!isReady || saving}
              className="w-full"
            >
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save Case to Database
            </Button>
          ) : (
            <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
              <div className="flex items-center gap-2">
                <Check className="h-5 w-5 text-green-600" />
                <span className="font-medium text-green-700 dark:text-green-300">Case saved!</span>
              </div>
              <Button
                variant="link"
                onClick={() => router.push(`/cases/${savedCaseId}`)}
                className="text-green-700 dark:text-green-300"
              >
                View Case →
              </Button>
            </div>
          )}

          {/* Generate Buttons */}
          <div className="space-y-4">
            {/* Full Package - Primary Action */}
            <Button
              size="lg"
              onClick={() => generateDocument("full_package")}
              disabled={!isReady || generating}
              className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
            >
              {generating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              Generate Full Package (Motion + All Exhibits)
            </Button>

            {/* Individual Documents */}
            <div className="flex flex-wrap gap-4">
              <Button
                size="lg"
                variant="outline"
                onClick={() => generateDocument("motion")}
                disabled={!isReady || generating}
                className="flex-1"
              >
                <Sparkles className="mr-2 h-4 w-4" />
                Motion Only
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => generateDocument("repair_summary")}
                disabled={!isReady || generating || repairOrders.length === 0}
              >
                <FileText className="mr-2 h-4 w-4" />
                Exhibit A
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => generateDocument("billing_summary")}
                disabled={!isReady || generating || billingEntries.length === 0}
              >
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Exhibit B
              </Button>
            </div>
          </div>
          {!isReady && (
            <p className="text-sm text-muted-foreground mt-4">
              Fill in case info and upload at least one document to generate.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
