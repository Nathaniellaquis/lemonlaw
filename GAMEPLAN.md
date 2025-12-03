# Lemon Law AI - SIMPLIFIED GAMEPLAN

## The Core Problem

You have:
- A stack of PDFs (repair orders, billing records, client docs)
- Need to create a legal document for court

You want:
- Upload everything
- AI processes it
- Get a court-ready document

**That's it. Nothing else matters.**

---

## THE SIMPLE FLOW

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│   STEP 1: UPLOAD              STEP 2: AI MAGIC           STEP 3: OUTPUT │
│                                                                         │
│   ┌─────────────┐            ┌─────────────┐            ┌─────────────┐ │
│   │             │            │             │            │             │ │
│   │  Drop PDFs  │ ────────▶  │  AI Reads   │ ────────▶  │  Download   │ │
│   │  Here       │            │  Everything │            │  .docx      │ │
│   │             │            │             │            │             │ │
│   └─────────────┘            └─────────────┘            └─────────────┘ │
│                                                                         │
│   - Repair orders            - Extracts dates           - Fee motion    │
│   - Billing exports          - Extracts issues          - With exhibits │
│   - Cost receipts            - Calculates fees          - Ready to file │
│   - Client intake            - Finds patterns           │               │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## WHAT THE AI NEEDS TO DO

### From Repair Order PDFs:
```
INPUT: Messy dealership PDF with handwriting, codes, etc.

AI EXTRACTS:
- Date in / Date out
- Mileage
- Customer complaint (what they said was wrong)
- What the dealership did
- Was it fixed? (usually no, that's why it's a lemon)
- Days the car was unavailable
```

### From Billing Records:
```
INPUT: CSV export or PDF of time entries

AI EXTRACTS:
- Attorney name
- Date
- Hours
- Description of work
- Rate
```

### From Everything:
```
AI GENERATES:
1. Repair History Summary (Exhibit)
2. Fee Calculation with Laffey Matrix (Exhibit)
3. Cost Summary (Exhibit)
4. THE MOTION ITSELF - with all the legal language
```

---

## SINGLE PAGE APP CONCEPT

Forget all those tabs and pages. One screen:

```
┌──────────────────────────────────────────────────────────────────────────┐
│  🍋 LEMON LAW AI                                                         │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  CASE: _________________  CLIENT: _________________  VEHICLE: __________ │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │                                                                    │  │
│  │                     📄 DROP ALL YOUR FILES HERE                    │  │
│  │                                                                    │  │
│  │              Repair Orders • Billing • Costs • Whatever            │  │
│  │                                                                    │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  UPLOADED FILES:                              AI STATUS:                 │
│  ├── repair_order_001.pdf  ✓ Extracted       ┌────────────────────────┐ │
│  ├── repair_order_002.pdf  ✓ Extracted       │ Found 7 repair visits  │ │
│  ├── repair_order_003.pdf  ⟳ Processing      │ 33 total days down     │ │
│  ├── billing_export.csv    ✓ 47 entries      │ Pattern: Engine issues │ │
│  └── costs.pdf             ✓ $2,340          │ Fees: $14,766.50       │ │
│                                              └────────────────────────┘ │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │                                                                    │  │
│  │  [  GENERATE FEE MOTION  ]     [  GENERATE REPAIR SUMMARY  ]      │  │
│  │                                                                    │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  OUTPUT:                                                                 │
│  📄 Motion_for_Fees_Smith_v_Tesla.docx              [ DOWNLOAD ]        │
│  📄 Exhibit_A_Repair_Summary.docx                   [ DOWNLOAD ]        │
│  📄 Exhibit_B_Billing_Records.xlsx                  [ DOWNLOAD ]        │
│  📄 Exhibit_C_Laffey_Matrix.pdf                     [ DOWNLOAD ]        │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## IMPLEMENTATION PLAN (PRIORITY ORDER)

### Phase 1: The AI Pipeline (THIS IS THE CORE)

**1.1 PDF/Image Text Extraction**
- Use Claude's vision capability OR
- pdf-parse for text PDFs
- Send raw text/images to AI for structured extraction

**1.2 AI Extraction Prompt**
```
You are extracting repair order information from dealership documents.

For each document, extract:
- RO Number
- Dealership name
- Date vehicle dropped off
- Date vehicle picked up
- Mileage at drop-off
- Customer's stated complaint
- Work performed by dealership
- Parts replaced (if any)
- Was the problem fixed? (Yes/No/Unclear)

Return as JSON array.
```

**1.3 Document Generation**
- Use `docx` library to create Word documents
- Pre-built templates for:
  - Motion for Attorney's Fees
  - Repair Order Summary Exhibit
  - Billing Exhibit
- AI fills in the case-specific content

### Phase 2: Minimal UI

**2.1 Single Upload Page**
- Drag & drop zone
- Shows processing status
- Download buttons for outputs

**2.2 Basic Case Info Input**
- Case number
- Client name
- Vehicle info (VIN, make, model, year)
- Defendant name

That's literally it.

### Phase 3: Polish (Later)

- Save cases to database for re-use
- Edit extracted data before generation
- Multiple document templates
- Batch processing

---

## TECH STACK (SIMPLIFIED)

```
Frontend:       Next.js + shadcn/ui (already have this)
AI:             OpenRouter API → Claude 3.5 Sonnet (vision + text)
PDF Processing: pdf-parse (text) + Claude vision (scanned docs)
Doc Generation: docx (Word files), xlsx (Excel)
Storage:        MongoDB (already connected)
```

**Key API Endpoints Needed:**

```
POST /api/upload          - Handle file uploads
POST /api/extract         - Send to AI, get structured data
POST /api/generate/motion - Generate the fee motion
POST /api/generate/exhibit - Generate exhibits
GET  /api/download/:id    - Download generated docs
```

---

## WHAT WE ALREADY HAVE vs WHAT WE NEED

### Already Built (the "extra stuff"):
- [x] Dashboard with stats
- [x] Case CRUD
- [x] Manual repair order entry
- [x] Manual billing entry
- [x] Manual cost entry
- [x] Attorneys management
- [x] Laffey Matrix reference

### Still Need (the actual core):
- [ ] **File upload handling**
- [ ] **AI extraction pipeline**
- [ ] **Document generation**
- [ ] **Download system**

---

## NEXT STEP

Build the **AI extraction pipeline**:

1. Create `/api/extract` endpoint
2. Accept PDF upload
3. Send to Claude with extraction prompt
4. Return structured JSON
5. Display extracted data
6. Generate downloadable documents

---

## THE DREAM WORKFLOW

```
1. Attorney gets new lemon law case
2. Opens app, enters case number + client + vehicle
3. Drags in all the repair order PDFs from client
4. Drags in billing CSV export from their system
5. Drags in cost receipts
6. Clicks "GENERATE MOTION"
7. Downloads Word doc ready for court filing
8. Done in 5 minutes instead of 5 hours
```

---

*That's the app. Everything else is bonus.*
