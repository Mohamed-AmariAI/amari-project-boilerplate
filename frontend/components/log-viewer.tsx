"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { createClient as createBrowserClient } from "@/lib/supabase/client"
import { useDocuments } from "@/contexts/document-context"
import { Clock, CheckCircle, AlertCircle, Loader2, Upload, ChevronDown, ChevronUp } from "lucide-react"

interface LogEntry {
  id: string
  shipment_request_id: string
  status: string
  actor: string
  payload?: Record<string, unknown>
  created_at: string
}

export function LogViewer() {
  const { currentBatch } = useDocuments()
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isOpen, setIsOpen] = useState(true)

  useEffect(() => {
    if (!currentBatch?.shipmentRequestId) {
      setLogs([])
      setIsSubscribed(false)
      return
    }

    const supabase = createBrowserClient()
    const shipmentId = currentBatch.shipmentRequestId

    // Fetch initial logs
    const fetchLogs = async () => {
      const { data, error } = await supabase
        .from("shipment_request_logs")
        .select("*")
        .eq("shipment_request_id", shipmentId)
        .order("created_at", { ascending: true })

      if (!error && data) {
        setLogs(data)
      }
    }

    fetchLogs()

    // Subscribe to realtime updates
    const channel = supabase
      .channel(`logs:${shipmentId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "shipment_request_logs",
          filter: `shipment_request_id=eq.${shipmentId}`,
        },
        (payload) => {
          setLogs((prev) => [...prev, payload.new as LogEntry])
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setIsSubscribed(true)
        }
      })

    return () => {
      channel.unsubscribe()
      setIsSubscribed(false)
    }
  }, [currentBatch?.shipmentRequestId])

  if (!currentBatch) {
    return null
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "uploaded":
        return <Upload className="h-4 w-4" />
      case "processing started":
      case "syncing":
        return <Loader2 className="h-4 w-4 animate-spin" />
      case "processing done":
      case "completed":
        return <CheckCircle className="h-4 w-4" />
      case "processing failed":
        return <AlertCircle className="h-4 w-4" />
      case "needs review":
        return <AlertCircle className="h-4 w-4" />
      case "pending":
      case "new":
        return <Clock className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "uploaded":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20"
      case "processing started":
      case "syncing":
        return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
      case "processing done":
      case "completed":
        return "bg-green-500/10 text-green-500 border-green-500/20"
      case "processing failed":
        return "bg-red-500/10 text-red-500 border-red-500/20"
      case "needs review":
        return "bg-orange-500/10 text-orange-500 border-orange-500/20"
      case "pending":
      case "new":
        return "bg-gray-500/10 text-gray-500 border-gray-500/20"
      default:
        return "bg-gray-500/10 text-gray-500 border-gray-500/20"
    }
  }

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <CardTitle>Audit Logs</CardTitle>
              <CardDescription>Real-time status updates for {currentBatch.title}</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {isSubscribed && (
                <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                  Live
                </Badge>
              )}
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="w-9 p-0">
                  {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  <span className="sr-only">Toggle logs</span>
                </Button>
              </CollapsibleTrigger>
            </div>
          </div>
        </CardHeader>
        <CollapsibleContent>
          <CardContent>
            {logs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                <Clock className="h-8 w-8 mb-2 opacity-50" />
                <p className="text-sm">No logs yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className="flex flex-col gap-2 rounded-lg border border-border bg-muted/30 px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`rounded-full p-2 ${getStatusColor(log.status)}`}>
                        {getStatusIcon(log.status)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground capitalize">{log.status}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatTime(log.created_at)} · Actor: {log.actor}
                        </p>
                      </div>
                    </div>
                    {log.payload && (
                      <div className="ml-12 mt-1">
                        <details className="text-xs">
                          <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                            View payload
                          </summary>
                          <pre className="mt-2 overflow-x-auto rounded bg-black/20 p-2 text-xs">
                            {JSON.stringify(log.payload, null, 2)}
                          </pre>
                        </details>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  )
}
