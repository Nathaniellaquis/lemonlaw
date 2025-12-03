"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

interface CaseData {
  _id: string;
  caseNumber: string;
  clientName: string;
  vehicleVIN: string;
  vehicleMake: string;
  vehicleModel: string;
  vehicleYear: number;
  purchaseDate: string;
  purchasePrice: number;
  warrantyType: string;
  warrantyExpires: string;
  status: string;
  defendant?: {
    name: string;
    type: string;
  };
  createdAt: string;
  updatedAt: string;
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("en-US", {
    month: "long",
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

export function OverviewTab({ caseData }: { caseData: CaseData }) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Client Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground">Client Name</p>
            <p className="font-medium">{caseData.clientName}</p>
          </div>
          <Separator />
          <div>
            <p className="text-sm text-muted-foreground">Case Number</p>
            <p className="font-medium">{caseData.caseNumber}</p>
          </div>
          <Separator />
          <div>
            <p className="text-sm text-muted-foreground">Status</p>
            <p className="font-medium">{caseData.status}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Defendant Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground">Defendant Name</p>
            <p className="font-medium">{caseData.defendant?.name || "Not specified"}</p>
          </div>
          <Separator />
          <div>
            <p className="text-sm text-muted-foreground">Defendant Type</p>
            <p className="font-medium">{caseData.defendant?.type || "Not specified"}</p>
          </div>
        </CardContent>
      </Card>

      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>Vehicle Information</CardTitle>
          <CardDescription>Details about the subject vehicle</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div>
              <p className="text-sm text-muted-foreground">VIN</p>
              <p className="font-mono font-medium">{caseData.vehicleVIN}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Year</p>
              <p className="font-medium">{caseData.vehicleYear}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Make</p>
              <p className="font-medium">{caseData.vehicleMake}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Model</p>
              <p className="font-medium">{caseData.vehicleModel}</p>
            </div>
          </div>
          <Separator className="my-4" />
          <div className="grid gap-4 md:grid-cols-4">
            <div>
              <p className="text-sm text-muted-foreground">Purchase Date</p>
              <p className="font-medium">{formatDate(caseData.purchaseDate)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Purchase Price</p>
              <p className="font-medium">{formatCurrency(caseData.purchasePrice)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Warranty Type</p>
              <p className="font-medium">{caseData.warrantyType}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Warranty Expires</p>
              <p className="font-medium">{formatDate(caseData.warrantyExpires)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>Case Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground">Created</p>
              <p className="font-medium">{formatDate(caseData.createdAt)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Last Updated</p>
              <p className="font-medium">{formatDate(caseData.updatedAt)}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
