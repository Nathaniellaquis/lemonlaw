// AI Extraction using OpenRouter API (Claude)

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";

interface AIMessage {
  role: "system" | "user" | "assistant";
  content: string | { type: string; text?: string; image_url?: { url: string } }[];
}

interface AIResponse {
  choices: {
    message: {
      content: string;
    };
  }[];
}

export async function callAI(
  messages: AIMessage[],
  options?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
  }
): Promise<string> {
  if (!OPENROUTER_API_KEY) {
    throw new Error("OPENROUTER_API_KEY not configured");
  }

  const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://lemonlaw.ai",
      "X-Title": "Lemon Law AI",
    },
    body: JSON.stringify({
      model: options?.model || "anthropic/claude-sonnet-4",
      messages,
      temperature: options?.temperature ?? 0.1,
      max_tokens: options?.maxTokens ?? 4096,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`AI API error: ${error}`);
  }

  const data: AIResponse = await response.json();
  return data.choices[0].message.content;
}

// Extract repair order data from text
export async function extractRepairOrders(text: string): Promise<ExtractedRepairOrder[]> {
  const systemPrompt = `You are a legal document extraction specialist for California lemon law cases.
Your task is to extract repair order information from dealership service documents with 100% accuracy.

IMPORTANT: Extract ALL repair visits found in the document. Each time the vehicle was brought in for service is a separate repair order.

For each repair visit, extract:
- RO Number (repair order number, may be labeled as "RO#", "Work Order", "Invoice", etc.)
- Dealership name
- Date In (when vehicle was dropped off)
- Date Out (when vehicle was picked up)
- Mileage In
- Mileage Out (if available)
- Days Down (calculate from dates, or use provided value)
- Customer Concern (the complaint - what the customer said was wrong)
- Work Performed (what the dealership did)
- Parts Replaced (list any parts)
- Category (Engine, Transmission, Electrical, Suspension, Brakes, HVAC, or Other)
- Resolved (Yes, No, or Partial - based on whether the issue was actually fixed)

Return a JSON array of objects. If a field is not found, use null.`;

  const response = await callAI([
    { role: "system", content: systemPrompt },
    {
      role: "user",
      content: `Extract all repair orders from this document:\n\n${text}\n\nReturn ONLY a JSON array, no other text.`,
    },
  ]);

  // Parse JSON from response
  try {
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return JSON.parse(response);
  } catch {
    console.error("Failed to parse AI response:", response);
    return [];
  }
}

// Extract billing entries from text
export async function extractBillingEntries(text: string): Promise<ExtractedBillingEntry[]> {
  const systemPrompt = `You are extracting attorney billing records for a lemon law case.

For each billing entry, extract:
- Date (YYYY-MM-DD format)
- Attorney name
- Hours (decimal number)
- Rate (hourly rate in dollars)
- Description (what work was performed)
- Type (Billable or Non-billable)

Return a JSON array of objects. If a field is not found, use null.`;

  const response = await callAI([
    { role: "system", content: systemPrompt },
    {
      role: "user",
      content: `Extract all billing entries from this document:\n\n${text}\n\nReturn ONLY a JSON array, no other text.`,
    },
  ]);

  try {
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return JSON.parse(response);
  } catch {
    console.error("Failed to parse AI response:", response);
    return [];
  }
}

// Extract costs from text
export async function extractCosts(text: string): Promise<ExtractedCost[]> {
  const systemPrompt = `You are extracting litigation costs for a lemon law case.

For each cost entry, extract:
- Date (YYYY-MM-DD format)
- Description (what the cost was for)
- Amount (in dollars)
- Category (Filing, Service, Appearance, Expert, Deposition, or Other)
- Vendor (who was paid)

Common costs include:
- Filing fees
- Service of process fees
- Court appearance fees
- Expert witness fees
- Deposition costs (court reporter, transcript, videographer)
- Mediation fees

Return a JSON array of objects. If a field is not found, use null.`;

  const response = await callAI([
    { role: "system", content: systemPrompt },
    {
      role: "user",
      content: `Extract all costs from this document:\n\n${text}\n\nReturn ONLY a JSON array, no other text.`,
    },
  ]);

  try {
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return JSON.parse(response);
  } catch {
    console.error("Failed to parse AI response:", response);
    return [];
  }
}

// Extract from image using vision
export async function extractFromImage(base64Image: string, mimeType: string): Promise<ExtractedRepairOrder[]> {
  const systemPrompt = `You are a legal document extraction specialist for California lemon law cases.
Extract repair order information from this dealership service document image.

For each repair visit visible, extract:
- RO Number
- Dealership name
- Date In / Date Out
- Mileage In / Mileage Out
- Customer Concern
- Work Performed
- Parts Replaced
- Category (Engine, Transmission, Electrical, Suspension, Brakes, HVAC, or Other)
- Resolved (Yes, No, or Partial)

Return a JSON array of objects.`;

  const response = await callAI([
    { role: "system", content: systemPrompt },
    {
      role: "user",
      content: [
        {
          type: "image_url",
          image_url: {
            url: `data:${mimeType};base64,${base64Image}`,
          },
        },
        {
          type: "text",
          text: "Extract all repair order information from this document. Return ONLY a JSON array.",
        },
      ],
    },
  ]);

  try {
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return JSON.parse(response);
  } catch {
    console.error("Failed to parse AI response:", response);
    return [];
  }
}

// Generate motion content
export async function generateMotionContent(caseData: CaseDataForMotion): Promise<string> {
  const systemPrompt = `You are a California lemon law attorney drafting a Motion for Attorney's Fees and Costs.

Use proper legal formatting and cite relevant California law including:
- Song-Beverly Consumer Warranty Act (Civil Code § 1790 et seq.)
- Civil Code § 1794(d) for attorney fee recovery
- Relevant case law for fee-shifting

The motion should be professional, thorough, and ready for filing.`;

  const prompt = `Generate a Motion for Attorney's Fees and Costs for:

CASE: ${caseData.caseNumber}
PLAINTIFF: ${caseData.clientName}
DEFENDANT: ${caseData.defendant}
VEHICLE: ${caseData.vehicleYear} ${caseData.vehicleMake} ${caseData.vehicleModel}
VIN: ${caseData.vin}
PURCHASE DATE: ${caseData.purchaseDate}
PURCHASE PRICE: $${caseData.purchasePrice}

REPAIR HISTORY:
${caseData.repairOrders.map((ro, i) => `
${i + 1}. Date: ${ro.dateIn} - ${ro.dateOut}
   Mileage: ${ro.mileageIn}
   Complaint: ${ro.customerConcern}
   Work: ${ro.workPerformed}
   Resolved: ${ro.resolved}
   Days Down: ${ro.daysDown}
`).join('\n')}

TOTAL REPAIR VISITS: ${caseData.repairOrders.length}
TOTAL DAYS DOWN: ${caseData.totalDaysDown}

ATTORNEY FEES:
Total Hours: ${caseData.totalHours}
Total Fees: $${caseData.totalFees}

COSTS:
Total Costs: $${caseData.totalCosts}

Generate the full motion text.`;

  return await callAI([
    { role: "system", content: systemPrompt },
    { role: "user", content: prompt },
  ], { maxTokens: 8000 });
}

// Types
export interface ExtractedRepairOrder {
  roNumber: string | null;
  dealership: string | null;
  dateIn: string | null;
  dateOut: string | null;
  mileageIn: number | null;
  mileageOut: number | null;
  daysDown: number | null;
  customerConcern: string | null;
  workPerformed: string | null;
  partsReplaced: string | null;
  category: string | null;
  resolved: string | null;
}

export interface ExtractedBillingEntry {
  date: string | null;
  attorney: string | null;
  hours: number | null;
  rate: number | null;
  description: string | null;
  type: string | null;
}

export interface ExtractedCost {
  date: string | null;
  description: string | null;
  amount: number | null;
  category: string | null;
  vendor: string | null;
}

export interface CaseDataForMotion {
  caseNumber: string;
  clientName: string;
  defendant: string;
  vehicleYear: number;
  vehicleMake: string;
  vehicleModel: string;
  vin: string;
  purchaseDate: string;
  purchasePrice: number;
  repairOrders: ExtractedRepairOrder[];
  totalDaysDown: number;
  totalHours: number;
  totalFees: number;
  totalCosts: number;
}
