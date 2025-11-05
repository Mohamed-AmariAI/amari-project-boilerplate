import type { OceanShipmentData } from "./types"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

// Helper function to clean numeric values from unit suffixes
function cleanNumericValue(value: string | undefined | null): string {
  if (!value) return ""
  // Remove common unit suffixes (KG, kg, lbs, etc.) and trim whitespace
  return value.toString().replace(/\s*(kg|KG|lbs|LBS|g|G)\s*$/i, "").trim()
}

export async function processDocument(files: File[]): Promise<{
  success: boolean
  data?: OceanShipmentData
  error?: string
}> {
  try {
    // Create FormData and append all files with the same key "files"
    // This sends multiple files to the backend which accepts List[UploadFile]
    const formData = new FormData()
    files.forEach((file) => {
      formData.append("files", file)
    })

    const response = await fetch(`${API_BASE_URL}/process-documents`, {
      method: "POST",
      body: formData,
    })

    console.log(response)
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`)
    }

    const result = await response.json()
    console.log(result)

    const data = {
      billOfLadingNumber: result.bill_of_lading_number,
      containerNumber: result.container_number,
      consigneeName: result.consignee_name,
      consigneeAddress: result.consignee_address,
      dateOfExport: result.date_of_export,
      lineItemsCount: result.line_items_count,
      averageGrossWeight: cleanNumericValue(result.average_gross_weight),
      averagePrice: result.average_price
    };
    console.log(result.data)

    return {
      success: true,
      data,
    }
  } catch (error) {
    console.error("[v0] Error processing document:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to process document",
    }
  }
}
