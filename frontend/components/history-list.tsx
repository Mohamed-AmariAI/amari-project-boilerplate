"use client";

import { useEffect, useState } from "react";
import { useDocuments } from "@/contexts/document-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FolderOpen, Clock, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient as createBrowserClient } from "@/lib/supabase/client";

interface HistoryItem {
  id: string;
  title: string;
  description?: string;
  status?: string;
  createdAt: Date;
  fileCount?: number;
  source: "database" | "session";
  shipmentRequestId?: string;
}

export function HistoryList() {
  const { batches, currentBatch, setCurrentBatch, loadShipmentRequest } = useDocuments();
  const [dbRecords, setDbRecords] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch shipment requests from database
  useEffect(() => {
    const fetchShipmentRequests = async () => {
      try {
        const supabase = createBrowserClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          setIsLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from("shipment_requests")
          .select("id, title, description, status, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (error) {
          console.error("[HistoryList] Error fetching shipment requests:", error);
          setIsLoading(false);
          return;
        }

        const records: HistoryItem[] = (data || []).map((record) => ({
          id: record.id,
          title: record.title,
          description: record.description || undefined,
          status: record.status,
          createdAt: new Date(record.created_at),
          source: "database" as const,
          shipmentRequestId: record.id,
        }));

        setDbRecords(records);
      } catch (err) {
        console.error("[HistoryList] Error:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchShipmentRequests();
  }, []);

  // Convert batches to HistoryItems
  const sessionItems: HistoryItem[] = batches.map((batch) => ({
    id: batch.id,
    title: batch.title,
    description: batch.description,
    status: batch.status,
    createdAt: batch.uploadedAt,
    fileCount: batch.fileCount,
    source: "session" as const,
    shipmentRequestId: batch.shipmentRequestId,
  }));

  // Merge and sort by date
  const allItems = [...dbRecords, ...sessionItems].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  // Remove duplicates (session items take precedence over DB records)
  const uniqueItems = allItems.reduce((acc, item) => {
    const existingIndex = acc.findIndex((i) => i.shipmentRequestId && i.shipmentRequestId === item.shipmentRequestId);

    if (existingIndex >= 0) {
      // If session item exists, keep it instead of DB record
      if (item.source === "session") {
        acc[existingIndex] = item;
      }
    } else {
      acc.push(item);
    }

    return acc;
  }, [] as HistoryItem[]);

  const handleItemClick = (item: HistoryItem) => {
    if (item.source === "session") {
      // Find and set the batch from current session
      const batch = batches.find((b) => b.id === item.id);
      if (batch) {
        setCurrentBatch(batch);
      }
    } else if (item.shipmentRequestId) {
      // Load from database
      loadShipmentRequest(item.shipmentRequestId);
    }
  };

  const getStatusBadge = (status?: string) => {
    if (!status) return null;

    const statusConfig: Record<
      string,
      { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
    > = {
      pending: { label: "Pending", variant: "secondary" },
      syncing: { label: "Syncing", variant: "default" },
      "needs review": { label: "Needs Review", variant: "default" },
      new: { label: "New", variant: "secondary" },
      completed: { label: "Completed", variant: "outline" },
      failed: { label: "Failed", variant: "destructive" },
    };

    const config = statusConfig[status] || { label: status, variant: "secondary" };

    return (
      <Badge variant={config.variant} className="text-xs">
        {config.label}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Processing History</CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Clock className="h-12 w-12 text-muted-foreground/50 animate-pulse" />
            <p className="mt-4 text-sm text-muted-foreground">Loading history...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (uniqueItems.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Processing History</CardTitle>
          <CardDescription>Your recent uploads will appear here</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Clock className="h-12 w-12 text-muted-foreground/50" />
            <p className="mt-4 text-sm text-muted-foreground">No uploads yet</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Processing History</CardTitle>
        <CardDescription>
          {uniqueItems.length} shipment{uniqueItems.length !== 1 ? "s" : ""} found
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[600px] pr-4">
          <div className="space-y-3">
            {uniqueItems.map((item) => {
              const isActive =
                currentBatch?.shipmentRequestId === item.shipmentRequestId || currentBatch?.id === item.id;

              return (
                <Button
                  key={item.id}
                  variant="ghost"
                  className={cn("h-auto w-full justify-start p-4 text-left", isActive && "bg-accent")}
                  onClick={() => handleItemClick(item)}
                >
                  <div className="flex w-full items-start gap-3">
                    <div className={cn("rounded-lg p-2", isActive ? "bg-primary/10" : "bg-muted")}>
                      <FolderOpen className={cn("h-5 w-5", isActive ? "text-primary" : "text-muted-foreground")} />
                    </div>
                    <div className="flex-1 space-y-1 overflow-hidden">
                      <p className="truncate text-sm font-medium leading-none">{item.title}</p>
                      {item.description && <p className="truncate text-xs text-muted-foreground">{item.description}</p>}
                      <div className="flex items-center gap-2 flex-wrap">
                        {item.status && getStatusBadge(item.status)}
                        {/* {item.fileCount !== undefined && (
                          <Badge variant="secondary" className="text-xs">
                            <FileText className="h-3 w-3 mr-1" />
                            {item.fileCount} file{item.fileCount !== 1 ? "s" : ""}
                          </Badge>
                        )} */}
                        <span className="text-xs text-muted-foreground">
                          {item.createdAt.toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                </Button>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
