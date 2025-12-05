import { useState } from "react";
import { Database, Table, ChevronRight, ChevronDown, RefreshCw, Key, Hash, Type, Calendar } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Column {
  name: string;
  type: string;
  nullable: boolean;
  isPrimaryKey: boolean;
}

interface TableInfo {
  name: string;
  columns: Column[];
  rowCount?: number;
}

interface SchemaExplorerProps {
  tables: TableInfo[];
  isLoading: boolean;
  onRefresh: () => void;
}

const getTypeIcon = (type: string) => {
  const lowerType = type.toLowerCase();
  if (lowerType.includes("int") || lowerType.includes("numeric") || lowerType.includes("decimal")) {
    return Hash;
  }
  if (lowerType.includes("timestamp") || lowerType.includes("date") || lowerType.includes("time")) {
    return Calendar;
  }
  return Type;
};

export function SchemaExplorer({ tables, isLoading, onRefresh }: SchemaExplorerProps) {
  const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set());

  const toggleTable = (tableName: string) => {
    setExpandedTables(prev => {
      const next = new Set(prev);
      if (next.has(tableName)) {
        next.delete(tableName);
      } else {
        next.add(tableName);
      }
      return next;
    });
  };

  return (
    <Card className="flex flex-col h-full border-border/50 bg-card/50 backdrop-blur-sm">
      <div className="flex items-center justify-between p-4 border-b border-border/50">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-accent/10">
            <Database className="h-4 w-4 text-accent" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">Schema Explorer</h3>
            <p className="text-xs text-muted-foreground">
              {tables.length} table{tables.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onRefresh}
          disabled={isLoading}
        >
          <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
        </Button>
      </div>

      <ScrollArea className="flex-1 p-2">
        {tables.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center p-4">
            <div className="p-3 rounded-full bg-muted/50 mb-3">
              <Database className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium mb-1">No tables yet</p>
            <p className="text-xs text-muted-foreground">
              Create tables in your database to see them here
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {tables.map((table) => (
              <Collapsible
                key={table.name}
                open={expandedTables.has(table.name)}
                onOpenChange={() => toggleTable(table.name)}
              >
                <CollapsibleTrigger asChild>
                  <button className="flex items-center gap-2 w-full p-2 rounded-lg hover:bg-muted/50 transition-colors text-left">
                    {expandedTables.has(table.name) ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    )}
                    <Table className="h-4 w-4 text-primary shrink-0" />
                    <span className="text-sm font-medium truncate">{table.name}</span>
                    {table.rowCount !== undefined && (
                      <Badge variant="secondary" className="ml-auto text-xs">
                        {table.rowCount.toLocaleString()}
                      </Badge>
                    )}
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="ml-8 pl-2 border-l border-border/50 space-y-1 py-1">
                    {table.columns.map((column) => {
                      const TypeIcon = getTypeIcon(column.type);
                      return (
                        <div
                          key={column.name}
                          className="flex items-center gap-2 p-1.5 rounded text-xs"
                        >
                          {column.isPrimaryKey ? (
                            <Key className="h-3 w-3 text-warning shrink-0" />
                          ) : (
                            <TypeIcon className="h-3 w-3 text-muted-foreground shrink-0" />
                          )}
                          <span className="font-mono truncate">{column.name}</span>
                          <span className="text-muted-foreground ml-auto truncate max-w-20">
                            {column.type}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            ))}
          </div>
        )}
      </ScrollArea>
    </Card>
  );
}