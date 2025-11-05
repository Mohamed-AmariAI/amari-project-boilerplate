import { FileUploader } from "@/components/file-uploader"
import { LogViewer } from "@/components/log-viewer"
import { DataTable } from "@/components/data-table"
import { DocumentViewer } from "@/components/document-viewer"
import { HistoryList } from "@/components/history-list"
import { SignOutButton } from "@/components/sign-out-button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { createClient } from "@/lib/supabase/server"

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Ocean Shipment Processor</h1>
              <p className="mt-2 text-muted-foreground">Upload and process ocean shipment documents</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-medium text-foreground">{user?.email}</p>
                <p className="text-xs text-muted-foreground">Manager</p>
              </div>
              <SignOutButton />
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="view-requests" className="w-full">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-8">
            <TabsTrigger value="new-request">New Request</TabsTrigger>
            <TabsTrigger value="view-requests">View Requests</TabsTrigger>
          </TabsList>

          <TabsContent value="new-request" className="space-y-8">
            <FileUploader />
          </TabsContent>

          <TabsContent value="view-requests" className="space-y-8">
            <div className="grid gap-8 lg:grid-cols-[1fr_300px]">
              <div className="space-y-8">
                <DataTable />
                <LogViewer />
                {/* <DocumentViewer /> */}
              </div>

              <aside className="space-y-6">
                <HistoryList />
              </aside>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
