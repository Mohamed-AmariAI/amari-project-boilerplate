"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import type { ProcessedDocument, OceanShipmentData, ProcessBatch } from "@/lib/types";
import { processDocument as apiProcessDocument } from "@/lib/api";
import { createClient as createBrowserClient } from "@/lib/supabase/client";

interface DocumentContextType {
  batches: ProcessBatch[];
  currentBatch: ProcessBatch | null;
  currentDocument: ProcessedDocument | null;
  isProcessing: boolean;
  error: string | null;
  uploadDocuments: (files: File[], title: string, description?: string) => Promise<void>;
  loadShipmentRequest: (shipmentRequestId: string) => Promise<void>;
  updateDocumentData: (id: string, data: Partial<OceanShipmentData>) => void;
  updateBatchStatus: (shipmentRequestId: string, status: string) => void;
  setCurrentBatch: (batch: ProcessBatch | null) => void;
  setCurrentDocument: (document: ProcessedDocument | null) => void;
  clearError: () => void;
}

const DocumentContext = createContext<DocumentContextType | undefined>(undefined);

// Helper function to create log entries (fire-and-forget)
function createLog(
  supabase: ReturnType<typeof createBrowserClient>,
  shipmentRequestId: string,
  status: string,
  actor: string,
  payload?: Record<string, unknown>
) {
  void supabase
    .from("shipment_request_logs")
    .insert({
      shipment_request_id: shipmentRequestId,
      status,
      actor,
      ...(payload && { payload }),
    })
    .then(({ error }) => {
      if (error) console.error("[Log Error]:", error);
    });
}

export function DocumentProvider({ children }: { children: ReactNode }) {
  const [batches, setBatches] = useState<ProcessBatch[]>([]);
  const [currentBatch, setCurrentBatch] = useState<ProcessBatch | null>(null);
  const [currentDocument, setCurrentDocument] = useState<ProcessedDocument | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uploadDocuments = useCallback(async (files: File[], title: string, description?: string) => {
    setIsProcessing(true);
    setError(null);

    try {
      // Step 1: Get authenticated user
      const supabase = createBrowserClient();
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error("Please sign in to upload documents");
      }

      // Step 2: Create shipment request in database BEFORE processing files
      const { data: shipmentData, error: dbError } = await supabase
        .from("shipment_requests")
        .insert({
          title,
          description: description || null,
          status: "pending",
          user_id: user.id,
        })
        .select("id")
        .single();

      if (dbError || !shipmentData) {
        throw new Error(`Failed to create shipment request: ${dbError?.message || "Unknown error"}`);
      }

      const shipmentRequestId = shipmentData.id;

      // Step 3: Validate all files
      for (const file of files) {
        const fileType = file.type;
        const isValidType =
          fileType === "application/pdf" ||
          fileType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
          fileType === "application/vnd.ms-excel";

        if (!isValidType) {
          throw new Error(`Invalid file type for ${file.name}. Please upload PDF or Excel files only.`);
        }
      }

      // Log: Files uploaded
      createLog(supabase, shipmentRequestId, "uploaded", user.id);

      // Step 4: Process all documents via API
      createLog(supabase, shipmentRequestId, "processing started", "AI");
      const result = await apiProcessDocument(files);

      if (!result.success || !result.data) {
        throw new Error(result.error || "Failed to process documents");
      }

      // Step 5: Create processed documents for all uploaded files
      const processedFiles: ProcessedDocument[] = files.map((file) => {
        const fileUrl = URL.createObjectURL(file);

        return {
          id: crypto.randomUUID(),
          fileName: file.name,
          fileType: file.name.toLowerCase().endsWith(".pdf") ? "pdf" : "excel",
          uploadedAt: new Date(),
          data: result.data!,
          fileUrl,
        };
      });

      // Step 6: Create a batch for this upload session with shipmentRequestId
      const newBatch: ProcessBatch = {
        id: crypto.randomUUID(),
        title,
        description,
        status: "needs review", // Will be updated after database update
        files: processedFiles,
        uploadedAt: new Date(),
        fileCount: files.length,
        shipmentRequestId, // Link to database entry
      };

      // Log: Processing completed successfully
      createLog(supabase, shipmentRequestId, "processing done", "AI", { extractedData: result.data });
      // Step 7: Update shipment request with extracted data and change status to needs review
      const { error: updateError } = await supabase
        .from("shipment_requests")
        .update({
          status: 'needs review',
          extracted_data: result.data,
        })
        .eq("id", shipmentRequestId);

      if (updateError) {
        console.error("[Update Error]:", updateError);
        // Don't throw here - we still want to show the processed data even if DB update fails
      } else {
        // Update batch status after successful database update
        newBatch.status = "needs review";
      }

      setBatches((prev) => [newBatch, ...prev]);
      setCurrentBatch(newBatch);
      setCurrentDocument(processedFiles[0] || null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred";
      setError(errorMessage);
      console.error("[v0] Upload error:", err);

      // Log: Processing failed (only if shipmentRequestId exists)
      try {
        const supabase = createBrowserClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        // Try to find the shipment request to log failure
        if (user) {
          const { data: recentShipment } = await supabase
            .from("shipment_requests")
            .select("id")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .single();

          if (recentShipment) {
            createLog(supabase, recentShipment.id, "processing failed", "AI");
          }
        }
      } catch (logErr) {
        // Silently fail if we can't log the error
        console.error("[Log Error]:", logErr);
      }
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const updateDocumentData = useCallback(
    (id: string, data: Partial<OceanShipmentData>) => {
      // Update document in batches
      setBatches((prev) =>
        prev.map((batch) => ({
          ...batch,
          files: batch.files.map((doc) => (doc.id === id ? { ...doc, data: { ...doc.data, ...data } } : doc)),
        }))
      );

      // Update current batch if needed
      if (currentBatch) {
        setCurrentBatch((prev) =>
          prev
            ? {
                ...prev,
                files: prev.files.map((doc) => (doc.id === id ? { ...doc, data: { ...doc.data, ...data } } : doc)),
              }
            : null
        );
      }

      // Update current document if needed
      if (currentDocument?.id === id) {
        setCurrentDocument((prev) => (prev ? { ...prev, data: { ...prev.data, ...data } } : null));
      }
    },
    [currentDocument, currentBatch]
  );

  const updateBatchStatus = useCallback(
    (shipmentRequestId: string, status: string) => {
      // Update batch status in batches array
      setBatches((prev) =>
        prev.map((batch) =>
          batch.shipmentRequestId === shipmentRequestId ? { ...batch, status } : batch
        )
      );

      // Update current batch status if it matches
      if (currentBatch?.shipmentRequestId === shipmentRequestId) {
        setCurrentBatch((prev) => (prev ? { ...prev, status } : null));
      }
    },
    [currentBatch]
  );

  const loadShipmentRequest = useCallback(
    async (shipmentRequestId: string) => {
      setIsProcessing(true);
      setError(null);

      try {
        const supabase = createBrowserClient();

        // Fetch the shipment request from database
        const { data: shipmentRequest, error: fetchError } = await supabase
          .from("shipment_requests")
          .select("*")
          .eq("id", shipmentRequestId)
          .single();

        if (fetchError || !shipmentRequest) {
          throw new Error("Failed to load shipment request");
        }

        // Parse extracted_data JSONB field
        const extractedData = shipmentRequest.extracted_data as OceanShipmentData | null;

        // If no extracted data, create empty placeholder data
        const defaultData: OceanShipmentData = {
          billOfLadingNumber: "",
          containerNumber: "",
          consigneeName: "",
          consigneeAddress: "",
          dateOfExport: "",
          lineItemsCount: "",
          averageGrossWeight: "",
          averagePrice: "",
        };

        // Create a processed document (use extracted data if available, otherwise empty)
        const processedDoc: ProcessedDocument = {
          id: crypto.randomUUID(),
          fileName: "Loaded from database",
          fileType: "pdf",
          uploadedAt: new Date(shipmentRequest.created_at),
          data: extractedData || defaultData,
        };

        // Create a batch from the database record
        const loadedBatch: ProcessBatch = {
          id: shipmentRequestId, // Use the actual DB id
          title: shipmentRequest.title,
          description: shipmentRequest.description,
          status: shipmentRequest.status,
          files: [processedDoc],
          uploadedAt: new Date(shipmentRequest.created_at),
          fileCount: 1, // Database doesn't store file count, use 1
          shipmentRequestId: shipmentRequestId,
        };

        // Check if batch already exists in state (from current session)
        const existingBatchIndex = batches.findIndex((b) => b.shipmentRequestId === shipmentRequestId);

        if (existingBatchIndex >= 0) {
          // Use existing batch from current session
          setCurrentBatch(batches[existingBatchIndex]);
          setCurrentDocument(batches[existingBatchIndex].files[0] || null);
        } else {
          // Add loaded batch to state
          setBatches((prev) => [loadedBatch, ...prev]);
          setCurrentBatch(loadedBatch);
          setCurrentDocument(processedDoc);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to load shipment request";
        setError(errorMessage);
        console.error("[v0] Load error:", err);
      } finally {
        setIsProcessing(false);
      }
    },
    [batches]
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return (
    <DocumentContext.Provider
      value={{
        batches,
        currentBatch,
        currentDocument,
        isProcessing,
        error,
        uploadDocuments,
        loadShipmentRequest,
        updateDocumentData,
        updateBatchStatus,
        setCurrentBatch,
        setCurrentDocument,
        clearError,
      }}
    >
      {children}
    </DocumentContext.Provider>
  );
}

export function useDocuments() {
  const context = useContext(DocumentContext);
  if (context === undefined) {
    throw new Error("useDocuments must be used within a DocumentProvider");
  }
  return context;
}
