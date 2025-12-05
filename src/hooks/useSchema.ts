import { useState, useEffect } from "react";

interface Column {
  name: string;
  type: string;
  nullable: boolean;
  isPrimaryKey: boolean;
}

interface Table {
  name: string;
  columns: Column[];
  rowCount?: number;
}

export function useSchema() {
  const [tables, setTables] = useState<Table[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSchema();
  }, []);

  const fetchSchema = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Schema will be populated when user creates tables
      // For now, return empty array - the AI will still work with natural language
      const sampleSchema: Table[] = [];
      setTables(sampleSchema);
    } catch (err) {
      console.error("Schema fetch error:", err);
      setError("Failed to fetch database schema");
    } finally {
      setIsLoading(false);
    }
  };

  const getSchemaString = () => {
    if (tables.length === 0) {
      return `No tables found in database yet.

To get started with data analysis:
1. Create tables in your database using the Cloud tab
2. The schema will automatically appear in the Schema Explorer
3. You can then query your data using natural language

Example tables you might create:
- users (id, name, email, created_at)
- orders (id, user_id, total, status, created_at)
- products (id, name, price, category)

For now, I can help you think through your data model or answer general analytics questions.`;
    }

    return tables.map(table => {
      const columns = table.columns.map(col => 
        `  ${col.name} ${col.type}${col.isPrimaryKey ? " PRIMARY KEY" : ""}${!col.nullable ? " NOT NULL" : ""}`
      ).join("\n");
      return `TABLE ${table.name}:\n${columns}`;
    }).join("\n\n");
  };

  return {
    tables,
    isLoading,
    error,
    refetch: fetchSchema,
    getSchemaString,
  };
}