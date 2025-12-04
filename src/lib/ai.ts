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

Return a JSON array where each object has EXACTLY these field names and formats:
{
  "roNumber": string or null,        // Repair order number (RO#, Work Order, Invoice, etc.)
  "dealership": string or null,      // Dealership/service center name
  "dateIn": "YYYY-MM-DD" or null,    // Date dropped off - MUST be ISO format (e.g., "2024-03-15")
  "dateOut": "YYYY-MM-DD" or null,   // Date picked up - MUST be ISO format (e.g., "2024-03-22")
  "mileageIn": number or null,       // Odometer at drop-off (integer, no commas)
  "mileageOut": number or null,      // Odometer at pick-up (integer, no commas)
  "daysDown": number or null,        // Days out of service (calculate from dates if not provided)
  "customerConcern": string or null, // The complaint - what customer said was wrong
  "workPerformed": string or null,   // What the dealership/technician did
  "partsReplaced": string or null,   // List of parts replaced (comma-separated if multiple)
  "category": string,                // MUST be one of: Engine, Transmission, Electrical, Suspension, Brakes, HVAC, Battery, Drivetrain, Software, Body, Other
  "resolved": string                 // MUST be one of: Yes, No, Partial
}

CRITICAL FORMAT RULES:
- Dates MUST be converted to YYYY-MM-DD format (e.g., "March 15, 2024" → "2024-03-15", "01/15/2024" → "2024-01-15")
- Mileage MUST be numbers without commas (e.g., "22,450" → 22450)
- Category MUST be exactly one of the listed values
- Resolved MUST be exactly "Yes", "No", or "Partial"
- If a field cannot be determined, use null`;

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

Return a JSON array where each object has EXACTLY these field names and formats:
{
  "date": "YYYY-MM-DD" or null,  // Date of work - MUST be ISO format (e.g., "2024-01-20")
  "attorney": string or null,    // Attorney/timekeeper name
  "hours": number or null,       // Hours worked (decimal, e.g., 2.5)
  "rate": number or null,        // Hourly rate (number only, no $ symbol, e.g., 650)
  "description": string or null, // Description of work performed
  "type": string                 // MUST be "Billable" or "Non-billable"
}

CRITICAL FORMAT RULES:
- Dates MUST be converted to YYYY-MM-DD format (e.g., "01/20/2024" → "2024-01-20")
- Hours MUST be decimal numbers (e.g., 2.5, not "2:30" or "2h 30m")
- Rate MUST be a number without $ or commas (e.g., 650, not "$650")
- Type MUST be exactly "Billable" or "Non-billable"
- If a field cannot be determined, use null`;

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

Return a JSON array where each object has EXACTLY these field names and formats:
{
  "date": "YYYY-MM-DD" or null,  // Date of expense - MUST be ISO format (e.g., "2024-01-20")
  "description": string or null, // Description of what the cost was for
  "amount": number or null,      // Amount (number only, no $ symbol, e.g., 435.00)
  "category": string,            // MUST be one of: Filing, Service, Appearance, Expert, Deposition, Mediation, Transcript, Travel, Other
  "vendor": string or null       // Who was paid
}

CRITICAL FORMAT RULES:
- Dates MUST be converted to YYYY-MM-DD format
- Amount MUST be a number without $ or commas (e.g., 435.00, not "$435.00")
- Category MUST be exactly one of the listed values

Common costs include filing fees, service of process fees, court appearance fees, expert witness fees, deposition costs (court reporter, transcript, videographer), and mediation fees.`;

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

Return a JSON array where each object has EXACTLY these field names and formats:
{
  "roNumber": string or null,        // Repair order number (RO#, Work Order, Invoice, etc.)
  "dealership": string or null,      // Dealership/service center name
  "dateIn": "YYYY-MM-DD" or null,    // Date dropped off - MUST be ISO format (e.g., "2024-03-15")
  "dateOut": "YYYY-MM-DD" or null,   // Date picked up - MUST be ISO format (e.g., "2024-03-22")
  "mileageIn": number or null,       // Odometer at drop-off (integer, no commas)
  "mileageOut": number or null,      // Odometer at pick-up (integer, no commas)
  "daysDown": number or null,        // Days out of service (calculate from dates if not provided)
  "customerConcern": string or null, // The complaint - what customer said was wrong
  "workPerformed": string or null,   // What the dealership/technician did
  "partsReplaced": string or null,   // List of parts replaced (comma-separated if multiple)
  "category": string,                // MUST be one of: Engine, Transmission, Electrical, Suspension, Brakes, HVAC, Battery, Drivetrain, Software, Body, Other
  "resolved": string                 // MUST be one of: Yes, No, Partial
}

CRITICAL FORMAT RULES:
- Dates MUST be converted to YYYY-MM-DD format
- Mileage MUST be numbers without commas
- Category MUST be exactly one of the listed values
- Resolved MUST be exactly "Yes", "No", or "Partial"
- If a field cannot be determined, use null`;

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
