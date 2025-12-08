import { useState, useCallback } from "react";
import { X, Sparkles, Upload, FileSpreadsheet, TrendingUp, BarChart3, Lightbulb, Zap, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChatPanel } from "./ChatPanel";
import { Message } from "@/hooks/useDataInsights";
import { toast } from "sonner";
import jsPDF from "jspdf";

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

  // Helper functions for chart drawing
  const drawBarChart = (pdf: jsPDF, data: { label: string; value: number }[], x: number, y: number, width: number, height: number, title: string) => {
    const maxValue = Math.max(...data.map(d => d.value));
    const barWidth = (width - 20) / data.length - 5;
    const colors = [[59, 130, 246], [16, 185, 129], [245, 158, 11], [239, 68, 68], [139, 92, 246]];
    
    // Title
    pdf.setFontSize(11);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(30, 30, 30);
    pdf.text(title, x + width / 2, y - 5, { align: 'center' });
    
    // Background
    pdf.setFillColor(248, 250, 252);
    pdf.roundedRect(x, y, width, height, 3, 3, 'F');
    
    // Draw bars
    data.forEach((item, i) => {
      const barHeight = (item.value / maxValue) * (height - 30);
      const barX = x + 10 + i * (barWidth + 5);
      const barY = y + height - 20 - barHeight;
      
      const color = colors[i % colors.length];
      pdf.setFillColor(color[0], color[1], color[2]);
      pdf.roundedRect(barX, barY, barWidth, barHeight, 2, 2, 'F');
      
      // Value on top
      pdf.setFontSize(7);
      pdf.setTextColor(50, 50, 50);
      pdf.text(item.value.toLocaleString(), barX + barWidth / 2, barY - 2, { align: 'center' });
      
      // Label below
      pdf.setFontSize(6);
      const label = item.label.length > 8 ? item.label.substring(0, 8) + '..' : item.label;
      pdf.text(label, barX + barWidth / 2, y + height - 8, { align: 'center' });
    });
  };

  const drawPieChart = (pdf: jsPDF, data: { label: string; value: number }[], x: number, y: number, radius: number, title: string) => {
    const total = data.reduce((sum, d) => sum + d.value, 0);
    const colors = [[59, 130, 246], [16, 185, 129], [245, 158, 11], [239, 68, 68], [139, 92, 246], [236, 72, 153]];
    
    // Title
    pdf.setFontSize(11);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(30, 30, 30);
    pdf.text(title, x, y - radius - 8, { align: 'center' });
    
    let startAngle = -Math.PI / 2;
    
    data.forEach((item, i) => {
      const sliceAngle = (item.value / total) * 2 * Math.PI;
      const endAngle = startAngle + sliceAngle;
      const color = colors[i % colors.length];
      
      // Draw pie slice using lines (approximation)
      pdf.setFillColor(color[0], color[1], color[2]);
      
      const segments = 20;
      const points: [number, number][] = [[x, y]];
      for (let j = 0; j <= segments; j++) {
        const angle = startAngle + (sliceAngle * j) / segments;
        points.push([x + Math.cos(angle) * radius, y + Math.sin(angle) * radius]);
      }
      
      // Draw filled polygon
      if (points.length > 2) {
        pdf.setFillColor(color[0], color[1], color[2]);
        const path = points.map((p, idx) => (idx === 0 ? `M ${p[0]} ${p[1]}` : `L ${p[0]} ${p[1]}`)).join(' ') + ' Z';
        // Simple triangle fan approach
        for (let j = 1; j < points.length - 1; j++) {
          pdf.triangle(points[0][0], points[0][1], points[j][0], points[j][1], points[j + 1][0], points[j + 1][1], 'F');
        }
      }
      
      startAngle = endAngle;
    });
    
    // Legend
    let legendY = y + radius + 10;
    data.forEach((item, i) => {
      const color = colors[i % colors.length];
      pdf.setFillColor(color[0], color[1], color[2]);
      pdf.rect(x - 30, legendY - 3, 8, 8, 'F');
      pdf.setFontSize(7);
      pdf.setTextColor(50, 50, 50);
      const pct = ((item.value / total) * 100).toFixed(1);
      pdf.text(`${item.label}: ${pct}%`, x - 18, legendY + 3);
      legendY += 10;
    });
  };

  const drawLineChart = (pdf: jsPDF, data: number[], x: number, y: number, width: number, height: number, title: string) => {
    if (data.length < 2) return;
    
    const maxValue = Math.max(...data);
    const minValue = Math.min(...data);
    const range = maxValue - minValue || 1;
    
    // Title
    pdf.setFontSize(11);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(30, 30, 30);
    pdf.text(title, x + width / 2, y - 5, { align: 'center' });
    
    // Background
    pdf.setFillColor(248, 250, 252);
    pdf.roundedRect(x, y, width, height, 3, 3, 'F');
    
    // Grid lines
    pdf.setDrawColor(220, 220, 220);
    pdf.setLineWidth(0.2);
    for (let i = 0; i <= 4; i++) {
      const gridY = y + 10 + ((height - 25) * i) / 4;
      pdf.line(x + 5, gridY, x + width - 5, gridY);
    }
    
    // Draw line
    pdf.setDrawColor(59, 130, 246);
    pdf.setLineWidth(1.5);
    
    const pointSpacing = (width - 20) / (data.length - 1);
    let prevX = x + 10;
    let prevY = y + 10 + ((maxValue - data[0]) / range) * (height - 25);
    
    data.forEach((value, i) => {
      if (i === 0) return;
      const pointX = x + 10 + i * pointSpacing;
      const pointY = y + 10 + ((maxValue - value) / range) * (height - 25);
      pdf.line(prevX, prevY, pointX, pointY);
      prevX = pointX;
      prevY = pointY;
    });
    
    // Draw points
    pdf.setFillColor(59, 130, 246);
    data.forEach((value, i) => {
      const pointX = x + 10 + i * pointSpacing;
      const pointY = y + 10 + ((maxValue - value) / range) * (height - 25);
      pdf.circle(pointX, pointY, 2, 'F');
    });
  };

  const generatePdfReport = useCallback(() => {
    const assistantMessages = messages.filter(m => m.role === 'assistant');
    if (assistantMessages.length === 0) {
      toast.error("No report content to export");
      return;
    }

    try {
      const pdf = new jsPDF();
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 20;
      const maxWidth = pageWidth - margin * 2;
      let yPosition = margin;

      // Header with gradient effect
      pdf.setFillColor(59, 130, 246);
      pdf.rect(0, 0, pageWidth, 45, 'F');
      pdf.setFillColor(99, 102, 241);
      pdf.rect(0, 35, pageWidth, 10, 'F');
      
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(24);
      pdf.setFont("helvetica", "bold");
      pdf.text("AI Data Insights Report", margin, 28);
      
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");
      pdf.text(`Generated: ${new Date().toLocaleString()}`, margin, 40);
      
      if (csvData.length > 0) {
        pdf.text(`Dataset: ${csvData.length} rows × ${Object.keys(csvData[0] || {}).length} columns`, pageWidth - margin, 40, { align: 'right' });
      }

      yPosition = 60;

      // Generate charts from CSV data if available
      if (csvData.length > 0) {
        const columns = Object.keys(csvData[0] || {});
        const numericColumns = columns.filter(col => 
          csvData.some(row => typeof row[col] === 'number')
        );
        const stringColumns = columns.filter(col => 
          csvData.some(row => typeof row[col] === 'string')
        );

        // Summary Statistics Box
        pdf.setFillColor(240, 249, 255);
        pdf.roundedRect(margin, yPosition, maxWidth, 35, 3, 3, 'F');
        pdf.setDrawColor(59, 130, 246);
        pdf.setLineWidth(0.5);
        pdf.roundedRect(margin, yPosition, maxWidth, 35, 3, 3, 'S');
        
        pdf.setFontSize(12);
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(59, 130, 246);
        pdf.text("📊 Data Summary", margin + 5, yPosition + 10);
        
        pdf.setFontSize(9);
        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(50, 50, 50);
        pdf.text(`Total Records: ${csvData.length.toLocaleString()}`, margin + 5, yPosition + 20);
        pdf.text(`Columns: ${columns.length}`, margin + 60, yPosition + 20);
        pdf.text(`Numeric Fields: ${numericColumns.length}`, margin + 100, yPosition + 20);
        pdf.text(`Text Fields: ${stringColumns.length}`, margin + 150, yPosition + 20);
        
        yPosition += 45;

        // Bar Chart - First numeric column distribution
        if (numericColumns.length > 0) {
          const numCol = numericColumns[0];
          const values = csvData.map(row => row[numCol]).filter(v => typeof v === 'number') as number[];
          
          if (values.length > 0) {
            // Create histogram-like data
            const min = Math.min(...values);
            const max = Math.max(...values);
            const bucketSize = (max - min) / 5 || 1;
            const buckets: { label: string; value: number }[] = [];
            
            for (let i = 0; i < 5; i++) {
              const low = min + i * bucketSize;
              const high = low + bucketSize;
              const count = values.filter(v => v >= low && (i === 4 ? v <= high : v < high)).length;
              buckets.push({ label: `${Math.round(low)}-${Math.round(high)}`, value: count });
            }
            
            drawBarChart(pdf, buckets, margin, yPosition, 80, 55, `${numCol} Distribution`);
          }
        }

        // Pie Chart - First string column distribution
        if (stringColumns.length > 0) {
          const strCol = stringColumns[0];
          const valueCounts: Record<string, number> = {};
          csvData.forEach(row => {
            const val = String(row[strCol] || 'Unknown');
            valueCounts[val] = (valueCounts[val] || 0) + 1;
          });
          
          const pieData = Object.entries(valueCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([label, value]) => ({ label, value }));
          
          if (pieData.length > 0) {
            drawPieChart(pdf, pieData, margin + 140, yPosition + 35, 25, `${strCol} Breakdown`);
          }
        }

        // Line Chart - Trend if we have numeric data
        if (numericColumns.length > 0) {
          const trendCol = numericColumns[0];
          const trendData = csvData.slice(0, 20).map(row => row[trendCol]).filter(v => typeof v === 'number') as number[];
          
          if (trendData.length >= 2) {
            drawLineChart(pdf, trendData, pageWidth - margin - 80, yPosition, 75, 55, `${trendCol} Trend`);
          }
        }

        yPosition += 75;

        // Add page break if needed
        if (yPosition > pageHeight - 100) {
          pdf.addPage();
          yPosition = margin;
        }

        // Key Metrics Cards
        if (numericColumns.length > 0) {
          pdf.setFontSize(12);
          pdf.setFont("helvetica", "bold");
          pdf.setTextColor(30, 30, 30);
          pdf.text("📈 Key Metrics", margin, yPosition);
          yPosition += 10;

          const cardWidth = (maxWidth - 15) / 4;
          numericColumns.slice(0, 4).forEach((col, i) => {
            const values = csvData.map(row => row[col]).filter(v => typeof v === 'number') as number[];
            if (values.length === 0) return;
            
            const sum = values.reduce((a, b) => a + b, 0);
            const avg = sum / values.length;
            const max = Math.max(...values);
            
            const cardX = margin + i * (cardWidth + 5);
            
            // Card background
            const cardColors = [[239, 246, 255], [240, 253, 244], [255, 251, 235], [254, 242, 242]];
            const borderColors = [[59, 130, 246], [16, 185, 129], [245, 158, 11], [239, 68, 68]];
            
            pdf.setFillColor(cardColors[i][0], cardColors[i][1], cardColors[i][2]);
            pdf.roundedRect(cardX, yPosition, cardWidth, 30, 2, 2, 'F');
            pdf.setDrawColor(borderColors[i][0], borderColors[i][1], borderColors[i][2]);
            pdf.setLineWidth(0.5);
            pdf.roundedRect(cardX, yPosition, cardWidth, 30, 2, 2, 'S');
            
            pdf.setFontSize(7);
            pdf.setTextColor(100, 100, 100);
            const colLabel = col.length > 12 ? col.substring(0, 12) + '..' : col;
            pdf.text(colLabel, cardX + 3, yPosition + 8);
            
            pdf.setFontSize(11);
            pdf.setFont("helvetica", "bold");
            pdf.setTextColor(borderColors[i][0], borderColors[i][1], borderColors[i][2]);
            pdf.text(avg.toLocaleString(undefined, { maximumFractionDigits: 1 }), cardX + 3, yPosition + 18);
            
            pdf.setFontSize(6);
            pdf.setFont("helvetica", "normal");
            pdf.setTextColor(120, 120, 120);
            pdf.text(`Max: ${max.toLocaleString()}`, cardX + 3, yPosition + 26);
          });

          yPosition += 40;
        }
      }

      // Content from AI messages
      pdf.setFontSize(12);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(30, 30, 30);
      pdf.text("📝 AI Analysis", margin, yPosition);
      yPosition += 10;

      assistantMessages.forEach((msg, index) => {
        if (yPosition > pageHeight - 40) {
          pdf.addPage();
          yPosition = margin;
        }

        // Section header
        pdf.setFillColor(248, 250, 252);
        pdf.roundedRect(margin - 2, yPosition - 4, maxWidth + 4, 14, 2, 2, 'F');
        pdf.setFontSize(10);
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(99, 102, 241);
        pdf.text(`Analysis ${index + 1}`, margin + 3, yPosition + 5);
        yPosition += 18;

        // Clean markdown content
        const content = msg.content
          .replace(/\*\*(.*?)\*\*/g, '$1')
          .replace(/\*(.*?)\*/g, '$1')
          .replace(/#{1,6}\s/g, '')
          .replace(/```[\s\S]*?```/g, '[Code Block]')
          .replace(/`([^`]+)`/g, '$1')
          .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
          .replace(/[-•]\s/g, '• ');

        pdf.setFontSize(9);
        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(50, 50, 50);

        const lines = pdf.splitTextToSize(content, maxWidth);
        
        lines.forEach((line: string) => {
          if (yPosition > pageHeight - 15) {
            pdf.addPage();
            yPosition = margin;
          }
          
          // Check for section headers
          if (line.includes('Executive Summary') || line.includes('Key Metrics') || 
              line.includes('Insights') || line.includes('Recommendations') ||
              line.includes('Predictions') || line.includes('Analysis') ||
              line.includes('Summary') || line.includes('Conclusion')) {
            pdf.setFont("helvetica", "bold");
            pdf.setTextColor(59, 130, 246);
            yPosition += 3;
          } else {
            pdf.setFont("helvetica", "normal");
            pdf.setTextColor(50, 50, 50);
          }
          
          pdf.text(line, margin, yPosition);
          yPosition += 5;
        });

        yPosition += 8;
      });

      // Footer on all pages
      const totalPages = pdf.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.setTextColor(150, 150, 150);
        pdf.text(`Page ${i} of ${totalPages}`, pageWidth / 2, pageHeight - 8, { align: 'center' });
        pdf.text("Generated by AI Data Insights Assistant", margin, pageHeight - 8);
      }

      pdf.save(`data-insights-report-${Date.now()}.pdf`);
      toast.success("PDF report with charts downloaded!");
    } catch (error) {
      console.error('PDF generation error:', error);
      toast.error("Failed to generate PDF report");
    }
  }, [messages, csvData]);

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
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={generatePdfReport}
            disabled={messages.filter(m => m.role === 'assistant').length === 0}
          >
            <FileDown className="h-4 w-4" />
            Export PDF
          </Button>
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
