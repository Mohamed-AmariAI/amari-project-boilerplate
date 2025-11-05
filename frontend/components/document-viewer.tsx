"use client"

import { useDocuments } from "@/contexts/document-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FileSpreadsheet, Download, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

export function DocumentViewer() {
  const { currentDocument } = useDocuments()

  if (!currentDocument) {
    return null
  }

  const handleDownload = () => {
    if (currentDocument.fileUrl) {
      const link = document.createElement("a")
      link.href = currentDocument.fileUrl
      link.download = currentDocument.fileName
      link.click()
    }
  }

  const handleOpenInNewTab = () => {
    if (currentDocument.fileUrl) {
      window.open(currentDocument.fileUrl, "_blank")
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>Document Preview</CardTitle>
            <CardDescription>View the uploaded document</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleDownload}>
              <Download className="mr-2 h-4 w-4" />
              Download
            </Button>
            {currentDocument.fileType === "pdf" && (
              <Button variant="outline" size="sm" onClick={handleOpenInNewTab}>
                <ExternalLink className="mr-2 h-4 w-4" />
                Open
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {currentDocument.fileType === "pdf" ? (
          <div className="overflow-hidden rounded-lg border border-border bg-muted/30">
            <iframe
              src={currentDocument.fileUrl}
              className="h-[600px] w-full"
              title={currentDocument.fileName}
              style={{ border: "none" }}
            />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted/30 p-12">
            <div className="flex flex-col items-center gap-4">
              <div className="rounded-full bg-primary/10 p-4">
                <FileSpreadsheet className="h-12 w-12 text-primary" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-foreground">{currentDocument.fileName}</p>
                <div className="mt-2 flex items-center justify-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    Excel File
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    Uploaded {currentDocument.uploadedAt.toLocaleDateString()}
                  </span>
                </div>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Excel files cannot be previewed. Use the download button to view the file.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
