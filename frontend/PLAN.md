# Frontend Development Plan

## Project Overview
A Next.js-based document processing frontend for Ocean Shipment Forms. Users can upload documents (PDF/Excel), view extracted data in an editable table, see their upload history, and export results.

## Tech Stack
- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui (light mode)
- **Validation**: Zod
- **State Management**: React hooks (useState, useContext)
- **API Communication**: Fetch API with TypeScript

## API Integration
- **Base URL**: `http://localhost:8000`
- **Endpoint**: `POST /process-documents`
- **Request Format**: FormData with `files` field (array)
- **Response Format**: Direct JSON object (no wrapping)
- **CORS**: Already configured on backend
- **No authentication required**

### Exact API Response Structure:
```json
{
  "bill_of_lading_number": "string",
  "container_number": "string",
  "consignee_name": "string",
  "consignee_address": "string",
  "date_of_export": "string",
  "line_items_count": 0,
  "average_gross_weight": "string",
  "average_price": "string"
}
```

## Data Models (Zod Schemas)

### OceanShipmentData
```typescript
import { z } from 'zod';

export const oceanShipmentDataSchema = z.object({
  bill_of_lading_number: z.string(),
  container_number: z.string(),
  consignee_name: z.string(),
  consignee_address: z.string(),
  date_of_export: z.string(), // mm/dd/yyyy format
  line_items_count: z.number().int(),
  average_gross_weight: z.string(),
  average_price: z.string(),
});

export type OceanShipmentData = z.infer<typeof oceanShipmentDataSchema>;
```

### ProcessedDocument
```typescript
export const processedDocumentSchema = z.object({
  id: z.string(), // UUID generated on frontend
  fileName: z.string(),
  fileType: z.string(), // 'application/pdf' or 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  uploadedAt: z.date(),
  data: oceanShipmentDataSchema,
  fileBlob: z.string().optional(), // Blob URL created from File object (for PDF display only)
});

export type ProcessedDocument = z.infer<typeof processedDocumentSchema>;
```

## Application Structure

### File Organization
```
frontend/
├── src/
│   ├── app/
│   │   ├── layout.tsx          # Root layout
│   │   ├── page.tsx            # Main page (single page app)
│   │   └── globals.css         # Global styles
│   ├── components/
│   │   ├── ui/                 # shadcn components
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── input.tsx
│   │   │   ├── table.tsx
│   │   │   ├── tabs.tsx
│   │   │   ├── toast.tsx
│   │   │   └── ...
│   │   ├── FileUploader.tsx    # File upload component
│   │   ├── DataTable.tsx       # Editable table for extracted data
│   │   ├── HistoryList.tsx     # List of processed documents
│   │   ├── DocumentViewer.tsx  # Display original document
│   │   └── ExportButtons.tsx   # Export/download functionality
│   ├── lib/
│   │   ├── api.ts              # API client functions
│   │   ├── storage.ts          # In-memory storage utilities
│   │   └── utils.ts            # Utility functions
│   ├── types/
│   │   └── schemas.ts          # Zod schemas
│   └── hooks/
│       └── useDocuments.ts     # Custom hook for document management
├── public/
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.js
└── plan.md
```

## Component Breakdown

### 1. Main Page (`app/page.tsx`)
**Purpose**: Single-page layout orchestrating all components

**Layout**:
```
┌─────────────────────────────────────────────┐
│           Header with Title                 │
├─────────────────────────────────────────────┤
│                                             │
│  File Uploader Component                    │
│                                             │
├─────────────────────────────────────────────┤
│                                             │
│  Current Document View (if any)             │
│  ┌────────────┬──────────────────────────┐  │
│  │  Document  │   Editable Data Table    │  │
│  │   Viewer   │                          │  │
│  │            │   [Export Buttons]       │  │
│  └────────────┴──────────────────────────┘  │
│                                             │
├─────────────────────────────────────────────┤
│                                             │
│  Upload History                             │
│  (List of previous uploads)                 │
│                                             │
└─────────────────────────────────────────────┘
```

**State**:
- Current selected document
- List of all processed documents
- Loading states
- Error states

### 2. FileUploader Component
**Features**:
- Drag & drop zone
- Click to browse file picker
- File type validation (PDF, Excel only)
- Single file upload
- Upload progress indication
- Error handling with toast notifications

**UI Elements**:
- Dashed border drop zone
- Upload icon
- File type hints
- Upload button

### 3. DataTable Component
**Features**:
- Display extracted data in editable rows
- Each field is an input/textarea
- Save changes button
- Reset to original button
- Form validation with Zod

**Columns**:
- Field Name
- Value (editable)

**Fields to Display**:
1. Bill of Lading Number
2. Container Number
3. Consignee Name
4. Consignee Address
5. Date of Export
6. Line Items Count
7. Average Gross Weight
8. Average Price

**Actions**:
- Edit inline
- Save changes (updates in-memory storage)
- Cancel/Reset

### 4. DocumentViewer Component
**Features**:
- Display original PDF documents only
- For PDF: Embed using `<iframe>` with blob URL
- For Excel: Show card with filename and file icon (no preview)

**Implementation**:
- PDF: `<iframe src={blobUrl} />`
- Excel: Simple card showing "Excel file: [filename]"
- Blob URL created using `URL.createObjectURL(file)` when file is uploaded
- Remember to revoke blob URLs when documents are deleted to prevent memory leaks

### 5. HistoryList Component
**Features**:
- List all processed documents
- Show: filename, upload date, status
- Click to view/edit
- Delete button for each item
- Sort by date (newest first)

**UI**:
- Card-based or table-based list
- Each item clickable to load into main view
- Clear all history button

### 6. ExportButtons Component
**Features**:
- Export as JSON
- Export as CSV
- Download original file

**Implementation**:
- Generate download links dynamically
- Use Blob API for file downloads

## State Management Strategy

### Context Provider: DocumentsProvider
```typescript
interface DocumentsContextType {
  documents: ProcessedDocument[];
  currentDocument: ProcessedDocument | null;
  addDocument: (doc: ProcessedDocument) => void;
  updateDocument: (id: string, data: Partial<OceanShipmentData>) => void;
  deleteDocument: (id: string) => void;
  setCurrentDocument: (id: string | null) => void;
  clearHistory: () => void;
}
```

**Storage**: In-memory array (resets on page refresh)

## API Integration (`lib/api.ts`)

### Functions:
```typescript
// Upload and process document
async function processDocument(file: File): Promise<OceanShipmentData> {
  const formData = new FormData();
  formData.append('files', file); // Note: 'files' field expects array

  const response = await fetch('http://localhost:8000/process-documents', {
    method: 'POST',
    body: formData,
    // No headers needed - browser sets correct Content-Type for FormData
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  const data = await response.json();
  return oceanShipmentDataSchema.parse(data); // Validate with Zod
}

// Error handling with typed responses
type ApiError = {
  message: string;
  details?: unknown;
}
```

**Error Handling**:
- Network errors
- API errors (4xx, 5xx)
- Validation errors (Zod parse errors)
- File type errors (client-side validation before upload)

## User Flow

### Happy Path:
1. User lands on page
2. Drags/selects a PDF or Excel file
3. File uploads to API
4. Loading indicator shows
5. API returns extracted data
6. Document viewer shows original file on left
7. Editable table shows extracted data on right
8. User can edit fields
9. User clicks "Save Changes"
10. User can export as JSON/CSV
11. Document appears in history below
12. User can click history items to review

### Error Path:
1. User uploads invalid file type → Toast error
2. API returns error → Toast error with message
3. Network failure → Toast error with retry option
4. Validation fails → Inline error messages

## Styling Guidelines

### shadcn/ui Components to Install:
- button
- card
- input
- label
- table
- tabs
- toast (sonner)
- dialog
- separator
- badge

### Color Scheme (Light Mode):
- Use default shadcn theme
- Neutral grays for backgrounds
- Blue accent for primary actions
- Red for errors
- Green for success

### Responsive Design:
- Desktop-first (primary use case)
- Mobile: Stack document viewer and table vertically
- Breakpoints: Tailwind defaults

## Development Phases

### Phase 1: Project Setup
- [ ] Initialize Next.js project with TypeScript
- [ ] Install dependencies (shadcn, zod, tailwind)
- [ ] Set up shadcn/ui
- [ ] Configure tailwind
- [ ] Create basic file structure

### Phase 2: Core Components
- [ ] Create Zod schemas in `types/schemas.ts`
- [ ] Build FileUploader component
- [ ] Build DataTable component
- [ ] Implement API client in `lib/api.ts`
- [ ] Create DocumentsProvider context

### Phase 3: Document Processing
- [ ] Integrate file upload with API
- [ ] Handle API responses
- [ ] Store processed documents in memory
- [ ] Implement error handling and toasts

### Phase 4: Display & Interaction
- [ ] Build DocumentViewer component
- [ ] Make DataTable editable
- [ ] Implement save/reset functionality
- [ ] Add form validation

### Phase 5: History & Export
- [ ] Build HistoryList component
- [ ] Implement document selection from history
- [ ] Build ExportButtons component
- [ ] Add JSON/CSV export functionality
- [ ] Add delete/clear history

### Phase 6: Polish & Testing
- [ ] Add loading states
- [ ] Improve error messages
- [ ] Test all flows
- [ ] Add keyboard shortcuts (optional)
- [ ] Performance optimization

## Dependencies

### Core:
```json
{
  "next": "^14.2.0",
  "react": "^18.3.0",
  "react-dom": "^18.3.0",
  "typescript": "^5.4.0"
}
```

### UI & Styling:
```json
{
  "tailwindcss": "^3.4.0",
  "@radix-ui/react-*": "latest", // shadcn peer deps
  "class-variance-authority": "latest",
  "clsx": "latest",
  "tailwind-merge": "latest"
}
```

### Validation & Types:
```json
{
  "zod": "^3.23.0"
}
```

### Utilities:
```json
{
  "sonner": "latest", // Toast notifications
  "lucide-react": "latest", // Icons
  "date-fns": "^3.0.0" // Date formatting
}
```

### Optional (for PDF viewing):
```json
{
  "react-pdf": "^7.7.0" // If needed for better PDF rendering
}
```

## Key Features Summary

✅ Single-page application
✅ Upload Ocean Shipment Forms (PDF/Excel)
✅ Extract data via API
✅ Display original document
✅ Show extracted data in editable table
✅ Edit and save changes
✅ Export as JSON/CSV
✅ Upload history (in-memory)
✅ Error handling with user-friendly messages
✅ Clean, modern UI with shadcn/ui
✅ TypeScript with Zod validation
✅ No authentication required

## Future Enhancements (Out of Scope for Now)
- Persistent storage (database/localStorage)
- User authentication
- Batch processing
- Real-time progress updates
- Document comparison
- Search/filter history
- Dark mode toggle
- Advanced PDF annotations
- OCR for scanned documents
- Export to other formats (XML, Excel)

## Notes
- All data stored in browser memory (clears on refresh)
- API must be running at `http://localhost:8000`
- File uploads use FormData API
- No backend database needed for frontend
- Consider adding localStorage backup in future for persistence
