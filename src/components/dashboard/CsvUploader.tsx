import { useState, useRef } from "react";
import { Upload, Download, FileSpreadsheet, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface CsvUploaderProps {
  onDataUploaded: (data: any[]) => void;
}

export const CsvUploader = ({ onDataUploaded }: CsvUploaderProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sampleCsvContent = `id,name,email,created_at,status,amount
1,John Doe,john@example.com,2024-01-15,active,1500.00
2,Jane Smith,jane@example.com,2024-01-18,active,2300.50
3,Bob Wilson,bob@example.com,2024-02-01,inactive,890.25
4,Alice Brown,alice@example.com,2024-02-10,active,3200.00
5,Charlie Davis,charlie@example.com,2024-02-15,pending,1750.75`;

  const downloadSampleFormat = () => {
    const blob = new Blob([sampleCsvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "sample_data_format.csv";
    link.click();
    URL.revokeObjectURL(link.href);
    toast.success("Sample CSV downloaded!");
  };

  const parseCSV = (text: string): any[] => {
    const lines = text.trim().split("\n");
    if (lines.length < 2) return [];

    const headers = lines[0].split(",").map((h) => h.trim().replace(/"/g, ""));
    const data: any[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",").map((v) => v.trim().replace(/"/g, ""));
      const row: any = {};
      headers.forEach((header, index) => {
        const value = values[index] || "";
        // Try to parse numbers
        const num = parseFloat(value);
        row[header] = !isNaN(num) && value !== "" ? num : value;
      });
      data.push(row);
    }
    return data;
  };

  const handleFile = (file: File) => {
    if (!file.name.endsWith(".csv")) {
      toast.error("Please upload a CSV file");
      return;
    }

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const data = parseCSV(text);
      if (data.length > 0) {
        onDataUploaded(data);
        toast.success(`Loaded ${data.length} rows from ${file.name}`);
      } else {
        toast.error("No data found in CSV file");
      }
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const clearFile = () => {
    setFileName(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={downloadSampleFormat}
          className="gap-2"
        >
          <Download className="h-4 w-4" />
          Download Sample Format
        </Button>
      </div>

      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
        className={`
          relative cursor-pointer rounded-lg border-2 border-dashed p-6 text-center transition-all
          ${isDragging 
            ? "border-primary bg-primary/5" 
            : "border-border hover:border-primary/50 hover:bg-muted/30"
          }
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          className="hidden"
        />
        
        {fileName ? (
          <div className="flex items-center justify-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium">{fileName}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                clearFile();
              }}
              className="ml-2 rounded-full p-1 hover:bg-muted"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        ) : (
          <>
            <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm font-medium">Drop CSV file here or click to upload</p>
            <p className="text-xs text-muted-foreground mt-1">Supports .csv files</p>
          </>
        )}
      </div>
    </div>
  );
};
