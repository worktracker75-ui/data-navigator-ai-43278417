import { useState } from "react";
import { Users, TrendingUp, Database, Activity, Sparkles } from "lucide-react";
import { Header } from "@/components/dashboard/Header";
import { ChatPanel } from "@/components/dashboard/ChatPanel";
import { SchemaExplorer } from "@/components/dashboard/SchemaExplorer";
import { MetricsCard } from "@/components/dashboard/MetricsCard";
import { DataTable } from "@/components/dashboard/DataTable";
import { InsightChart } from "@/components/dashboard/InsightChart";
import { CsvUploader } from "@/components/dashboard/CsvUploader";
import { AiAssistantModal } from "@/components/dashboard/AiAssistantModal";
import { Button } from "@/components/ui/button";
import { useDataInsights } from "@/hooks/useDataInsights";
import { useSchema } from "@/hooks/useSchema";
import { toast } from "sonner";

const Index = () => {
  const { tables, isLoading: schemaLoading, refetch: refetchSchema, getSchemaString } = useSchema();
  const [csvData, setCsvData] = useState<any[] | null>(null);
  const { messages, isLoading: chatLoading, sendMessage, executeQuery, clearMessages } = useDataInsights(
    getSchemaString(),
    csvData || undefined
  );
  const [queryResult, setQueryResult] = useState<any[] | null>(null);
  const [selectedChartType, setSelectedChartType] = useState<"line" | "bar" | "pie" | "area" | "scatter">("bar");
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);

  const handleExecuteQuery = async (sql: string) => {
    toast.info("Executing query...");
    const result = await executeQuery(sql);
    if (result) {
      setQueryResult(result);
      toast.success(`Query returned ${result.length} rows`);
    }
  };

  const handleCsvData = (data: any[]) => {
    setCsvData(data);
    setQueryResult(data);
  };

  // Calculate metrics from CSV data
  const calculateMetrics = () => {
    if (!csvData || csvData.length === 0) {
      return [
        { title: "Total Records", value: "—", change: undefined, icon: Database, iconColor: "text-primary" },
        { title: "Active Users", value: "—", change: undefined, icon: Users, iconColor: "text-accent" },
        { title: "Growth Rate", value: "—", change: undefined, icon: TrendingUp, iconColor: "text-success" },
        { title: "Activity Score", value: "—", change: undefined, icon: Activity, iconColor: "text-warning" },
      ];
    }

    const totalRecords = csvData.length;
    const columns = Object.keys(csvData[0]);
    
    // Find status column and count active
    const statusCol = columns.find(c => c.toLowerCase().includes('status'));
    const activeCount = statusCol 
      ? csvData.filter(row => String(row[statusCol]).toLowerCase() === 'active').length 
      : 0;

    // Find numeric column for sum/avg
    const numericCol = columns.find(c => typeof csvData[0][c] === 'number');
    const total = numericCol 
      ? csvData.reduce((sum, row) => sum + (Number(row[numericCol]) || 0), 0)
      : 0;

    return [
      { title: "Total Records", value: totalRecords.toLocaleString(), change: undefined, icon: Database, iconColor: "text-primary" },
      { title: "Active Count", value: statusCol ? activeCount.toLocaleString() : "—", change: statusCol ? `${((activeCount/totalRecords)*100).toFixed(0)}%` : undefined, icon: Users, iconColor: "text-accent" },
      { title: "Columns", value: columns.length.toString(), change: undefined, icon: TrendingUp, iconColor: "text-success" },
      { title: numericCol ? `Total ${numericCol}` : "Sum", value: numericCol ? total.toLocaleString() : "—", change: undefined, icon: Activity, iconColor: "text-warning" },
    ];
  };

  const metrics = calculateMetrics();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="flex h-[calc(100vh-4rem)]">
        {/* Left Sidebar - Schema Explorer */}
        <aside className="w-72 border-r border-border/50 p-4 hidden lg:block">
          <SchemaExplorer
            tables={tables}
            isLoading={schemaLoading}
            onRefresh={refetchSchema}
          />
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          <div className="p-6 space-y-6">
            {/* Welcome Section with AI Button */}
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <h2 className="text-2xl font-bold tracking-tight">Welcome back</h2>
                <p className="text-muted-foreground">
                  Upload CSV data and ask questions about it. The AI will analyze and create visual reports.
                </p>
              </div>
              <Button
                onClick={() => setIsAiModalOpen(true)}
                className="gap-2 shrink-0"
                size="lg"
              >
                <Sparkles className="h-5 w-5" />
                AI Data Assistant
              </Button>
            </div>

            {/* CSV Upload Section */}
            <div className="rounded-xl border border-border/50 bg-card/30 p-4">
              <h3 className="font-semibold mb-3">Upload Data</h3>
              <CsvUploader onDataUploaded={handleCsvData} />
              {csvData && (
                <p className="text-sm text-muted-foreground mt-2">
                  ✓ {csvData.length} rows loaded. Click "AI Data Assistant" to ask questions or create reports!
                </p>
              )}
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              {metrics.map((metric) => (
                <MetricsCard key={metric.title} {...metric} />
              ))}
            </div>

            {/* Query Results */}
            {queryResult && queryResult.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">Data Visualization</h3>
                  <div className="flex gap-1">
                    {(["bar", "line", "area", "pie", "scatter"] as const).map((type) => (
                      <button
                        key={type}
                        onClick={() => setSelectedChartType(type)}
                        className={`px-2 py-1 text-xs rounded ${
                          selectedChartType === type 
                            ? "bg-primary text-primary-foreground" 
                            : "bg-muted text-muted-foreground hover:bg-muted/80"
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  <InsightChart 
                    data={queryResult} 
                    chartType={selectedChartType}
                    title="Data Visualization"
                  />
                  <DataTable data={queryResult} title="Raw Data" maxRows={50} />
                </div>
              </div>
            )}

            {/* Empty State */}
            {!queryResult && (
              <div className="rounded-xl border border-dashed border-border/50 bg-muted/20 p-12 text-center">
                <Database className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="font-semibold mb-2">No data yet</h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  Upload a CSV file to get started. Then use the AI Data Assistant to ask questions about your data and generate visual reports.
                </p>
              </div>
            )}
          </div>
        </main>

        {/* Right Sidebar - Chat Panel */}
        <aside className="w-96 border-l border-border/50 p-4 hidden md:block">
          <ChatPanel
            messages={messages}
            isLoading={chatLoading}
            onSendMessage={sendMessage}
            onExecuteQuery={handleExecuteQuery}
            onClear={clearMessages}
          />
        </aside>
      </div>

      {/* Full Screen AI Modal */}
      <AiAssistantModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        messages={messages}
        isLoading={chatLoading}
        onSendMessage={sendMessage}
        onExecuteQuery={handleExecuteQuery}
        onClear={clearMessages}
      />
    </div>
  );
};

export default Index;
