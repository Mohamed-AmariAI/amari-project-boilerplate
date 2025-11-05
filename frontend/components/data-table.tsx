"use client";

import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useDocuments } from "@/contexts/document-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle2, Send } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ExportButtons } from "@/components/export-buttons";
import { OceanShipmentDataSchema, type OceanShipmentData } from "@/lib/types";
import { cn } from "@/lib/utils";
import { createClient as createBrowserClient } from "@/lib/supabase/client";

export function DataTable() {
  const { currentBatch, updateDocumentData, updateBatchStatus } = useDocuments();

  // Get the first file's data from the current batch
  const currentDocument = currentBatch?.files[0] || null;

  // Track the last committed values to detect actual changes
  const lastCommittedValues = useRef<Partial<OceanShipmentData>>({});

  // Track submission state
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check if status is completed
  const isCompleted = currentBatch?.status === "completed";
  const needsReview = currentBatch?.status === "needs review";

  // Initialize React Hook Form with Zod validation
  const {
    register,
    formState: { errors },
    reset,
    getValues,
  } = useForm<OceanShipmentData>({
    resolver: zodResolver(OceanShipmentDataSchema),
    mode: "onChange", // Validate on change for real-time feedback
    defaultValues: currentDocument?.data || {},
  });

  // Reset form when document changes
  useEffect(() => {
    if (currentDocument?.data) {
      reset(currentDocument.data);
      lastCommittedValues.current = currentDocument.data;
    }
  }, [currentDocument?.id, currentDocument?.data, reset]);

  // Handle submit completion
  const handleSubmitCompletion = async () => {
    if (!currentBatch?.shipmentRequestId || hasErrors) return;

    setIsSubmitting(true);

    try {
      const supabase = createBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        console.error("User not authenticated");
        return;
      }

      // Update shipment_requests status to completed
      const { error: updateError } = await supabase
        .from("shipment_requests")
        .update({
          status: "completed",
        })
        .eq("id", currentBatch.shipmentRequestId);

      if (updateError) {
        console.error("[Update Error]:", updateError);
        return;
      }

      // Create log entry for completion
      await supabase
        .from("shipment_request_logs")
        .insert({
          shipment_request_id: currentBatch.shipmentRequestId,
          status: "completed",
          actor: user.id,
        });

      // Update local state using the context function
      updateBatchStatus(currentBatch.shipmentRequestId, "completed");
    } catch (error) {
      console.error("[Submit Error]:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle blur event for input fields
  const handleFieldBlur = async (fieldKey: keyof OceanShipmentData) => {
    if (hasErrors || isCompleted) return; // Do not proceed if there are validation errors or if completed
    const currentValue = getValues(fieldKey);
    const oldValue = lastCommittedValues.current[fieldKey];

    // Only proceed if value actually changed
    if (oldValue === currentValue) return;

    // Auto-save the field change
    if (currentDocument) {
      updateDocumentData(currentDocument.id, { [fieldKey]: currentValue });

      // Update shipment_requests table with the new extracted_data
      if (currentBatch?.shipmentRequestId) {
        try {
          const supabase = createBrowserClient();

          // Get current extracted_data from database
          const { data: shipmentRequest, error: fetchError } = await supabase
            .from('shipment_requests')
            .select('extracted_data')
            .eq('id', currentBatch.shipmentRequestId)
            .single();

          if (fetchError) {
            console.error('[Fetch Error]:', fetchError);
            return;
          }

          // Merge the updated field with existing extracted_data
          const updatedExtractedData = {
            ...(shipmentRequest?.extracted_data as OceanShipmentData || {}),
            [fieldKey]: currentValue,
          };

          // Update the shipment_requests table
          const { error: updateError } = await supabase
            .from('shipment_requests')
            .update({
              extracted_data: updatedExtractedData,
            })
            .eq('id', currentBatch.shipmentRequestId);

          if (updateError) {
            console.error('[Update Error]:', updateError);
            return;
          }

          // Log the change (after successful database update)
          const { data: { user } } = await supabase.auth.getUser();

          if (user) {
            await supabase
              .from('shipment_request_logs')
              .insert({
                shipment_request_id: currentBatch.shipmentRequestId,
                status: 'updated fields',
                actor: user.id,
                payload: {
                  extracted_data: {
                    field: fieldKey,
                    old_value: oldValue || '',
                    new_value: currentValue,
                  },
                },
              });

            // Update the last committed value after successful log
            lastCommittedValues.current[fieldKey] = currentValue;
          }
        } catch (error) {
          console.error('[Update Error]:', error);
        }
      }
    }
  };

  if (!currentDocument) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Shipment Data</CardTitle>
          <CardDescription>Upload a document to view and edit shipment information</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>No document selected. Please upload a document to get started.</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }


  const fields: Array<{
    key: keyof OceanShipmentData;
    label: string;
    type: "input" | "textarea";
    placeholder?: string;
  }> = [
    { key: "billOfLadingNumber", label: "Bill of Lading", type: "input", placeholder: "e.g., ZMLU34110002" },
    { key: "containerNumber", label: "Container Number", type: "input", placeholder: "e.g., MSCU1234567" },
    { key: "consigneeName", label: "Consignee Name", type: "input" },
    { key: "consigneeAddress", label: "Consignee Address", type: "textarea" },
    { key: "dateOfExport", label: "Date of Export", type: "input", placeholder: "YYYY-MM-DD" },
    { key: "lineItemsCount", label: "Line Items Count", type: "input", placeholder: "e.g., 18" },
    { key: "averageGrossWeight", label: "Gross Weight (KG)", type: "input", placeholder: "e.g., 162.37" },
    { key: "averagePrice", label: "Average Price", type: "input", placeholder: "e.g., 1250.50" },
  ];

  const hasErrors = Object.keys(errors).length > 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>Shipment Data</CardTitle>
            <CardDescription>Review and edit the extracted shipment information</CardDescription>
          </div>
          <ExportButtons />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {fields.map((field) => (
              <div key={field.key} className={field.type === "textarea" ? "md:col-span-2" : ""}>
                <Label htmlFor={field.key} className="text-sm font-medium">
                  {field.label} <span className="text-destructive">*</span>
                </Label>
                {field.type === "input" ? (
                  <div className="mt-2 space-y-1">
                    <Input
                      id={field.key}
                      type="text"
                      placeholder={field.placeholder}
                      {...register(field.key)}
                      onBlur={() => handleFieldBlur(field.key)}
                      disabled={isCompleted}
                      className={cn(
                        errors[field.key] && "border-destructive focus-visible:ring-destructive",
                        isCompleted && "bg-muted cursor-not-allowed"
                      )}
                    />
                    {errors[field.key] && (
                      <p className="text-sm text-destructive flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors[field.key]?.message}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="mt-2 space-y-1">
                    <Textarea
                      id={field.key}
                      {...register(field.key)}
                      onBlur={() => handleFieldBlur(field.key)}
                      disabled={isCompleted}
                      className={cn(
                        "min-h-[100px]",
                        errors[field.key] && "border-destructive focus-visible:ring-destructive",
                        isCompleted && "bg-muted cursor-not-allowed"
                      )}
                    />
                    {errors[field.key] && (
                      <p className="text-sm text-destructive flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors[field.key]?.message}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Validation Summary */}
          {hasErrors && !isCompleted && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Please fix {Object.keys(errors).length} validation error{Object.keys(errors).length > 1 ? "s" : ""}.
              </AlertDescription>
            </Alert>
          )}

          {/* Completed Status */}
          {isCompleted && (
            <Alert className="border-blue-500/20 bg-blue-500/10">
              <CheckCircle2 className="h-4 w-4 text-blue-500" />
              <AlertDescription className="text-blue-500">
                This shipment request has been completed. Fields are read-only.
              </AlertDescription>
            </Alert>
          )}

          {/* Success Indicator */}
          {!hasErrors && !isCompleted && (
            <Alert className="border-green-500/20 bg-green-500/10">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <AlertDescription className="text-green-500">
                All fields are valid. Changes are automatically saved.
              </AlertDescription>
            </Alert>
          )}

          {/* Submit for Completion Button */}
          {needsReview && !hasErrors && !isCompleted && (
            <div className="flex items-center justify-end pt-4 border-t">
              <Button
                onClick={handleSubmitCompletion}
                disabled={isSubmitting}
                size="lg"
                className="gap-2"
              >
                <Send className="h-4 w-4" />
                {isSubmitting ? "Submitting..." : "Submit for Completion"}
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
