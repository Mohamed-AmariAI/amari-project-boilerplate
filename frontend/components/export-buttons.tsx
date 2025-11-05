"use client"

import { useDocuments } from "@/contexts/document-context"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Download, FileJson, FileSpreadsheet } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export function ExportButtons() {
  const { currentBatch } = useDocuments()
  const { toast } = useToast()

  // Get the first file from current batch (they all share the same data)
  const currentDocument = currentBatch?.files[0] || null

  if (!currentDocument || !currentBatch) {
    return null
  }

  const exportAsJSON = () => {
    try {
      const jsonData = JSON.stringify(currentDocument.data, null, 2)
      const blob = new Blob([jsonData], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `${currentBatch.title.replace(/[^a-z0-9]/gi, '_')}_data.json`
      link.click()
      URL.revokeObjectURL(url)

      toast({
        title: "Export Successful",
        description: "Data exported as JSON file",
      })
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export data as JSON",
        variant: "destructive",
      })
    }
  }

  const exportAsCSV = () => {
    try {
      const data = currentDocument.data
      const headers = Object.keys(data).join(",")
      const values = Object.values(data)
        .map((value) => `"${String(value).replace(/"/g, '""')}"`)
        .join(",")
      const csv = `${headers}\n${values}`

      const blob = new Blob([csv], { type: "text/csv" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `${currentBatch.title.replace(/[^a-z0-9]/gi, '_')}_data.csv`
      link.click()
      URL.revokeObjectURL(url)

      toast({
        title: "Export Successful",
        description: "Data exported as CSV file",
      })
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export data as CSV",
        variant: "destructive",
      })
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Download className="mr-2 h-4 w-4" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={exportAsJSON}>
          <FileJson className="mr-2 h-4 w-4" />
          Export as JSON
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportAsCSV}>
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          Export as CSV
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
