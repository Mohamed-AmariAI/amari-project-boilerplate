import { z } from "zod"

// Zod schema for Ocean Shipment Data with comprehensive validation
export const OceanShipmentDataSchema = z.object({
  // Bill of Lading: Alphanumeric format, 5-50 characters
  billOfLadingNumber: z
    .string()
    .min(5, "Bill of Lading must be at least 5 characters")
    .max(50, "Bill of Lading must not exceed 50 characters")
    .regex(/^[A-Z0-9]+$/i, "Bill of Lading must contain only letters and numbers"),

  // Container Number: Standard ISO format (4 letters + 7 digits)
  containerNumber: z
    .string()
    .min(11, "Container Number must be 11 characters")
    .max(11, "Container Number must be 11 characters")
    .regex(/^[A-Z]{4}\d{7}$/i, "Container Number must be 4 letters followed by 7 digits (e.g., MSCU1234567)"),

  // Consignee Name: Text only, 2-200 characters
  consigneeName: z
    .string()
    .min(2, "Consignee Name must be at least 2 characters")
    .max(200, "Consignee Name must not exceed 200 characters")
    .regex(/^[a-zA-Z0-9\s\-\.]+$/, "Consignee Name can only contain letters, numbers, spaces, hyphens, and periods"),

  // Consignee Address: Free text, 10-500 characters
  consigneeAddress: z
    .string()
    .min(10, "Consignee Address must be at least 10 characters")
    .max(500, "Consignee Address must not exceed 500 characters"),

  // Date of Export: Must be a valid date, not in the future
  dateOfExport: z
    .string()
    .min(1, "Date of Export is required")
    .refine(
      (val) => {
        const date = new Date(val)
        return !isNaN(date.getTime())
      },
      { message: "Date of Export must be a valid date" }
    )
    .refine(
      (val) => {
        const date = new Date(val)
        const today = new Date()
        today.setHours(23, 59, 59, 999)
        return date <= today
      },
      { message: "Date of Export cannot be in the future" }
    ),

  // Line Items Count: Positive integer, 1-10000
  lineItemsCount: z
    .string()
    .min(1, "Line Items Count is required")
    .regex(/^\d+$/, "Line Items Count must be a whole number")
    .refine(
      (val) => {
        const num = parseInt(val, 10)
        return num >= 1 && num <= 10000
      },
      { message: "Line Items Count must be between 1 and 10,000" }
    ),

  // Gross Weight: Positive decimal, 0.01-999999.99 KG
  averageGrossWeight: z
    .string()
    .min(1, "Gross Weight is required")
    .regex(/^\d+(\.\d+)?$/, "Gross Weight must be a positive number")
    .refine(
      (val) => {
        const num = parseFloat(val)
        return num >= 0.01 && num <= 999999.99
      },
      { message: "Gross Weight must be between 0.01 and 999,999.99 KG" }
    ),

  // Average Price: Positive decimal, 0.01-9999999.99
  averagePrice: z
    .string()
    .min(1, "Average Price is required")
    .regex(/^\d+(\.\d+)?$/, "Average Price must be a positive number")
    .refine(
      (val) => {
        const num = parseFloat(val)
        return num >= 0.01 && num <= 9999999.99
      },
      { message: "Average Price must be between 0.01 and 9,999,999.99" }
    ),
})

export type OceanShipmentData = z.infer<typeof OceanShipmentDataSchema>

// Zod schema for Processed Document
export const ProcessedDocumentSchema = z.object({
  id: z.string(),
  fileName: z.string(),
  fileType: z.enum(["pdf", "excel"]),
  uploadedAt: z.date(),
  data: OceanShipmentDataSchema,
  fileUrl: z.string().optional(),
})

export type ProcessedDocument = z.infer<typeof ProcessedDocumentSchema>

// Process Batch - represents a single upload session with multiple files
export interface ProcessBatch {
  id: string
  title: string
  description?: string
  status?: string
  files: ProcessedDocument[]
  uploadedAt: Date
  fileCount: number
  shipmentRequestId?: string // Link to shipment_requests table
}

// API Response types
export interface ProcessDocumentResponse {
  success: boolean
  data?: OceanShipmentData
  error?: string
  message?: string
}
