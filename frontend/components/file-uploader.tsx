"use client"

import type React from "react"

import { useCallback, useState } from "react"
import { Upload, FileText, Loader2, AlertCircle, X } from "lucide-react"
import { useDocuments } from "@/contexts/document-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function FileUploader() {
  const { uploadDocuments, isProcessing, error, clearError } = useDocuments()
  const [isDragging, setIsDragging] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")

  const handleStart = useCallback(async () => {
    if (selectedFiles.length === 0 || !title.trim()) return

    clearError()
    await uploadDocuments(selectedFiles, title, description)

    // Reset form after successful upload
    setSelectedFiles([])
    setTitle("")
    setDescription("")
  }, [selectedFiles, title, description, uploadDocuments, clearError])

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      setIsDragging(false)

      const files = Array.from(e.dataTransfer.files)
      if (files.length > 0) {
        setSelectedFiles((prev) => [...prev, ...files])
      }
    },
    [],
  )

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files ? Array.from(e.target.files) : []
      if (files.length > 0) {
        setSelectedFiles((prev) => [...prev, ...files])
      }
      // Reset input value to allow uploading the same file again
      e.target.value = ""
    },
    [],
  )

  const removeFile = useCallback((index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const canStart = selectedFiles.length > 0 && title.trim().length > 0 && !isProcessing

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload Documents</CardTitle>
        <CardDescription>Add document information and upload files to process</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Title and Description Fields */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">
              Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter document title"
              disabled={isProcessing}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter document description (optional)"
              disabled={isProcessing}
              rows={3}
            />
          </div>
        </div>

        {/* File Upload Area */}
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={cn(
            "relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors",
            isDragging ? "border-primary bg-primary/5" : "border-border bg-muted/30",
            isProcessing && "pointer-events-none opacity-50",
          )}
        >
          <div className="flex flex-col items-center gap-3">
            <div className="rounded-full bg-primary/10 p-3">
              <Upload className="h-6 w-6 text-primary" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-foreground">Drag and drop your files here</p>
              <p className="mt-1 text-xs text-muted-foreground">or click to browse (multiple files supported)</p>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <FileText className="h-4 w-4" />
              <span>Supports PDF and Excel files</span>
            </div>
          </div>

          <input
            type="file"
            accept=".pdf,.xlsx,.xls,application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
            onChange={handleFileInput}
            disabled={isProcessing}
            multiple
            className="absolute inset-0 cursor-pointer opacity-0"
          />
        </div>

        {/* Selected Files List */}
        {selectedFiles.length > 0 && (
          <div className="space-y-2">
            <Label>Selected Files ({selectedFiles.length})</Label>
            <div className="space-y-2">
              {selectedFiles.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between rounded-md border border-border bg-muted/50 px-3 py-2"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                    <span className="text-sm truncate">{file.name}</span>
                    <span className="text-xs text-muted-foreground flex-shrink-0">
                      ({(file.size / 1024).toFixed(1)} KB)
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile(index)}
                    disabled={isProcessing}
                    className="h-6 w-6 p-0 flex-shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Start Button */}
        <Button
          onClick={handleStart}
          disabled={!canStart}
          className="w-full"
        >
          {isProcessing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            "Start Processing"
          )}
        </Button>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}
