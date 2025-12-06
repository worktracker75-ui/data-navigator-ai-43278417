import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

interface RequestBody {
  messages: Message[];
  schema: string;
  action: "chat" | "generate_sql" | "analyze";
  csvData?: any[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, schema, action, csvData } = (await req.json()) as RequestBody;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build data context from CSV if available
    let dataContext = "";
    if (csvData && csvData.length > 0) {
      const columns = Object.keys(csvData[0]);
      const sampleRows = csvData.slice(0, 10);
      const totalRows = csvData.length;
      
      // Calculate basic statistics for numeric columns
      const stats: Record<string, any> = {};
      columns.forEach(col => {
        const values = csvData.map(row => row[col]).filter(v => typeof v === 'number');
        if (values.length > 0) {
          stats[col] = {
            min: Math.min(...values),
            max: Math.max(...values),
            avg: (values.reduce((a, b) => a + b, 0) / values.length).toFixed(2),
            sum: values.reduce((a, b) => a + b, 0),
          };
        }
      });

      dataContext = `
UPLOADED CSV DATA:
- Total Rows: ${totalRows}
- Columns: ${columns.join(", ")}
- Sample Data (first 10 rows): ${JSON.stringify(sampleRows, null, 2)}
- Numeric Column Statistics: ${JSON.stringify(stats, null, 2)}
- Full Data Available for Analysis: Yes

You have access to this CSV data. Answer questions about it directly.
When creating reports, use this data to provide insights, trends, and visualizations.
`;
    }

    const systemPrompt = `You are a GenAI-Powered Data Insights Assistant designed to analyze data and provide clear, accurate insights with visual reports.

Your capabilities:
1. Analyze uploaded CSV data directly and answer questions about it
2. Read SQL table schema and generate optimized SELECT queries
3. Produce human-friendly explanations and insights
4. Create detailed reports with trends, patterns, and anomalies
5. Suggest and describe appropriate visualizations

${dataContext}

DATABASE SCHEMA:
${schema}

CRITICAL RULES:
- NEVER generate INSERT, UPDATE, DELETE, DROP, ALTER, or any data modification queries
- ONLY generate SELECT queries for reading SQL data
- When CSV data is provided, answer questions directly from the data
- Always explain your reasoning in simple language
- For each insight, describe the meaning and possible business interpretation
- When suggesting SQL, wrap it in a JSON code block like: \`\`\`json{"sql": "SELECT ...", "explanation": "..."}\`\`\`

REPORT FORMAT (when asked to create a report):
1. **📊 Data Overview**: Summary of the data (rows, columns, data types)
2. **📈 Key Metrics**: Important numbers (totals, averages, min/max)
3. **🔍 Insights & Patterns**: Notable trends, patterns, or anomalies
4. **💡 Recommendations**: Actionable suggestions based on findings
5. **📉 Visualization**: Suggest chart type with rationale (line, bar, pie, area, scatter)

QUESTION ANSWERING:
- For questions like "what is the status of X", search the data and give direct answers
- Calculate totals, averages, counts as needed
- Compare values and identify rankings
- Be specific with numbers and names from the data`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. Please add credits." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const text = await response.text();
      console.error("AI gateway error:", response.status, text);
      return new Response(
        JSON.stringify({ error: "AI service error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("Data insights error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});