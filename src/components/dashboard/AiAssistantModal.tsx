import { useState, useCallback } from "react";
import { X, Sparkles, Upload, FileSpreadsheet, TrendingUp, BarChart3, Lightbulb, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChatPanel } from "./ChatPanel";
import { Message } from "@/hooks/useDataInsights";
import { toast } from "sonner";

interface AiAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  messages: Message[];
  isLoading: boolean;
  onSendMessage: (message: string) => void;
  onExecuteQuery: (sql: string) => void;
  onClear: () => void;
  csvData: any[];
  onCsvUpload: (data: any[]) => void;
}

const parseCSV = (text: string): any[] => {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];
  
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
  const data = lines.slice(1).map(line => {
    const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
    const row: Record<string, any> = {};
    headers.forEach((header, i) => {
      const value = values[i] || '';
      const num = parseFloat(value);
      row[header] = !isNaN(num) && value !== '' ? num : value;
    });
    return row;
  });
  
  return data;
};

export const AiAssistantModal = ({
  isOpen,
  onClose,
  messages,
  isLoading,
  onSendMessage,
  onExecuteQuery,
  onClear,
  csvData,
  onCsvUpload,
}: AiAssistantModalProps) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file && file.type === "text/csv") {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        const data = parseCSV(text);
        if (data.length > 0) {
          onCsvUpload(data);
          toast.success(`Loaded ${data.length} rows from ${file.name}`);
          // Auto-trigger analysis
          setTimeout(() => {
            onSendMessage("Create a comprehensive data analysis report with visualizations, key insights, trends, predictions, and business recommendations for this dataset.");
          }, 500);
        }
      };
      reader.readAsText(file);
    } else {
      toast.error("Please upload a CSV file");
    }
  }, [onCsvUpload, onSendMessage]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        const data = parseCSV(text);
        if (data.length > 0) {
          onCsvUpload(data);
          toast.success(`Loaded ${data.length} rows from ${file.name}`);
          // Auto-trigger analysis
          setTimeout(() => {
            onSendMessage("Create a comprehensive data analysis report with visualizations, key insights, trends, predictions, and business recommendations for this dataset.");
          }, 500);
        }
      };
      reader.readAsText(file);
    }
  };

  const quickActions = [
    {
      icon: BarChart3,
      label: "Full Report",
      prompt: "Generate a comprehensive data analysis report with all visualizations, business insights, trends, anomalies, and actionable recommendations.",
      color: "from-blue-500 to-cyan-500"
    },
    {
      icon: TrendingUp,
      label: "Predictions",
      prompt: "Analyze trends in the data and provide predictions for future values. Include confidence levels and factors that might affect these predictions.",
      color: "from-green-500 to-emerald-500"
    },
    {
      icon: Lightbulb,
      label: "Business Insights",
      prompt: "Identify the top business insights from this data. What opportunities, risks, and strategic decisions can be made based on these findings?",
      color: "from-amber-500 to-orange-500"
    },
    {
      icon: Zap,
      label: "Auto Analysis",
      prompt: "Perform automatic feature selection and identify the most important variables in this dataset. Show correlations and key drivers.",
      color: "from-purple-500 to-pink-500"
    }
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background animate-in fade-in-0 duration-200">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent">
            <Sparkles className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">AI Data Assistant</h2>
            <p className="text-sm text-muted-foreground">
              {csvData.length > 0 
                ? `Analyzing ${csvData.length} rows • ${Object.keys(csvData[0] || {}).length} columns`
                : "Upload data to get started"
              }
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <label className="cursor-pointer">
            <input
              type="file"
              accept=".csv"
              onChange={handleFileInput}
              className="hidden"
            />
            <Button variant="outline" size="sm" className="gap-2" asChild>
              <span>
                <Upload className="h-4 w-4" />
                Upload CSV
              </span>
            </Button>
          </label>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-10 w-10 rounded-full hover:bg-destructive/10 hover:text-destructive"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex h-[calc(100vh-5rem)]">
        {/* Left Sidebar - Quick Actions & Upload */}
        <div className="w-72 border-r border-border p-4 flex flex-col gap-4 bg-muted/30">
          {/* File Upload Zone */}
          <div
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            className={`
              rounded-xl border-2 border-dashed p-6 text-center transition-all
              ${isDragging 
                ? "border-primary bg-primary/10 scale-[1.02]" 
                : "border-border hover:border-primary/50 hover:bg-muted/50"
              }
            `}
          >
            <FileSpreadsheet className={`h-8 w-8 mx-auto mb-2 ${isDragging ? "text-primary" : "text-muted-foreground"}`} />
            <p className="text-sm font-medium">Drop CSV here</p>
            <p className="text-xs text-muted-foreground mt-1">or click upload above</p>
          </div>

          {/* Data Status */}
          {csvData.length > 0 && (
            <div className="rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 p-4 border border-primary/20">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-sm font-medium">Data Loaded</span>
              </div>
              <div className="space-y-1 text-xs text-muted-foreground">
                <p>• {csvData.length.toLocaleString()} records</p>
                <p>• {Object.keys(csvData[0] || {}).length} columns</p>
                <p>• Ready for analysis</p>
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="flex-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Quick Actions</p>
            <div className="space-y-2">
              {quickActions.map((action) => (
                <button
                  key={action.label}
                  onClick={() => onSendMessage(action.prompt)}
                  disabled={csvData.length === 0 || isLoading}
                  className="w-full flex items-center gap-3 p-3 rounded-xl bg-background hover:bg-muted transition-all text-left group disabled:opacity-50 disabled:cursor-not-allowed border border-transparent hover:border-border"
                >
                  <div className={`p-2 rounded-lg bg-gradient-to-br ${action.color} text-white group-hover:scale-110 transition-transform`}>
                    <action.icon className="h-4 w-4" />
                  </div>
                  <span className="text-sm font-medium">{action.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Sample Questions */}
          {csvData.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Ask About Data</p>
              <div className="space-y-1">
                {[
                  "What are the key statistics?",
                  "Find outliers and anomalies",
                  "Which features are most important?"
                ].map((q) => (
                  <button
                    key={q}
                    onClick={() => onSendMessage(q)}
                    disabled={isLoading}
                    className="w-full text-xs text-left p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Chat Panel */}
        <div className="flex-1 p-6">
          <div className="h-full max-w-4xl mx-auto">
            <ChatPanel
              messages={messages}
              isLoading={isLoading}
              onSendMessage={onSendMessage}
              onExecuteQuery={onExecuteQuery}
              onClear={onClear}
              fullScreen
            />
          </div>
        </div>
      </div>
    </div>
  );
};
