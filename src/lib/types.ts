import { ObjectId } from 'mongodb';

// Case status types
export type CaseStatus = "Active" | "Discovery" | "Settled" | "Closed";
export type WarrantyType = "Basic" | "Powertrain" | "Extended";
export type DefendantType = "Manufacturer" | "Dealership";

// Repair order categories
export type RepairCategory = "Engine" | "Transmission" | "Electrical" | "Suspension" | "Brakes" | "HVAC" | "Other";
export type ResolvedStatus = "Yes" | "No" | "Partial";

// Billing types
export type BillingType = "Billable" | "Non-billable";
export type CostCategory = "Filing" | "Service" | "Appearance" | "Expert" | "Deposition" | "Other";

// Motion types
export type MotionType = "FeeMotion" | "CompelArbitrationOpposition" | "CaseManagement" | "Discovery";
export type MotionStatus = "Draft" | "Filed" | "Granted" | "Denied";

// Database document interfaces
export interface Case {
  _id?: ObjectId;
  caseNumber: string;
  clientName: string;
  defendant: string;
  vehicleYear: number;
  vehicleMake: string;
  vehicleModel: string;
  vin: string;
  purchaseDate: string;
  purchasePrice: number;
  status: CaseStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface RepairOrder {
  _id?: ObjectId;
  caseId: ObjectId;
  roNumber: string;
  dealership: string;
  dateIn: Date;
  dateOut: Date;
  mileageIn: number;
  mileageOut: number;
  daysDown: number;
  techNumber?: string;
  category: RepairCategory;
  customerConcern: string;
  workPerformed: string;
  partsReplaced?: string;
  resolved: ResolvedStatus;
  rawText: string;
  sourceFile: string;
  createdAt: Date;
}

export interface BillingEntry {
  _id?: ObjectId;
  caseId: ObjectId;
  date: Date;
  type: BillingType;
  description: string;
  attorney: string;
  hours: number;
  rate: number;
  amount: number;
  isReduced: boolean;
  createdAt: Date;
}

export interface Cost {
  _id?: ObjectId;
  caseId: ObjectId;
  date: Date;
  vendor: string;
  reference?: string;
  description: string;
  category: CostCategory;
  amount: number;
  createdAt: Date;
}

export interface Attorney {
  _id?: ObjectId;
  name: string;
  barNumber?: string;
  yearsOutOfLawSchool: number;
  isParalegal: boolean;
  defaultRate: number;
  createdAt: Date;
}

export interface LaffeyMatrix {
  _id?: ObjectId;
  periodStart: Date;
  periodEnd: Date;
  adjustmentFactor: number;
  paralegalRate: number;
  tier1to3Rate: number;
  tier4to7Rate: number;
  tier8to10Rate: number;
  tier11to19Rate: number;
  tier20PlusRate: number;
}

export interface Motion {
  _id?: ObjectId;
  caseId: ObjectId;
  type: MotionType;
  title: string;
  content: string;
  status: MotionStatus;
  filedDate?: Date;
  exhibits: string[];
  createdAt: Date;
  updatedAt: Date;
}

// API Response types
export interface CaseWithStats extends Case {
  repairOrderCount?: number;
  totalDaysDown?: number;
  totalFees?: number;
  totalCosts?: number;
}

// Form input types (for creating/updating) - same as Case but without auto-generated fields
export type CaseInput = Omit<Case, '_id' | 'createdAt' | 'updatedAt'> & {
  status?: CaseStatus; // optional on create, defaults to "Active"
};

export interface RepairOrderInput {
  caseId: string;
  roNumber: string;
  dealership: string;
  dateIn: string;
  dateOut: string;
  mileageIn: number;
  mileageOut: number;
  daysDown: number;
  techNumber?: string;
  category: RepairCategory;
  customerConcern: string;
  workPerformed: string;
  partsReplaced?: string;
  resolved: ResolvedStatus;
  rawText?: string;
  sourceFile?: string;
}

export interface BillingEntryInput {
  caseId: string;
  date: string;
  type: BillingType;
  description: string;
  attorney: string;
  hours: number;
  rate: number;
  isReduced?: boolean;
}

export interface CostInput {
  caseId: string;
  date: string;
  vendor: string;
  reference?: string;
  description: string;
  category: CostCategory;
  amount: number;
}

// Fee calculation types
export interface FeeSummary {
  totalHours: number;
  totalBilledAmount: number;
  totalLaffeyAmount: number;
  byAttorney: {
    attorney: string;
    hours: number;
    billedAmount: number;
    laffeyAmount: number;
  }[];
}
