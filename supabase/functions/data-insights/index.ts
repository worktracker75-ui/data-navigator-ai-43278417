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
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, schema, action } = (await req.json()) as RequestBody;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `You are a GenAI-Powered Data Insights Assistant designed to analyze structured SQL data and provide clear, accurate insights.

Your capabilities:
1. Read SQL table schema and user queries
2. Generate optimized SQL queries for data retrieval (SELECT statements ONLY)
3. Analyze query results and produce human-friendly explanations
4. Identify trends, anomalies, and insights using reasoning
5. Suggest appropriate visualizations based on the data

DATABASE SCHEMA:
${schema}

CRITICAL RULES:
- NEVER generate INSERT, UPDATE, DELETE, DROP, ALTER, or any data modification queries
- ONLY generate SELECT queries for reading data
- Never assume missing data - ask for clarification if needed
- Always explain your reasoning in simple language
- For each insight, describe the meaning and possible business interpretation
- When suggesting SQL, wrap it in a JSON code block like: \`\`\`json{"sql": "SELECT ...", "explanation": "..."}\`\`\`
- For visualizations, suggest the type: "line", "bar", "pie", "area", "scatter"

Response Format:
1. **Understanding**: Brief summary of the request
2. **SQL Query** (if needed): The generated query with explanation
3. **Insight Analysis**: Analysis of the data
4. **Business Interpretation**: What this means for the business
5. **Visualization**: Suggested chart type and why`;

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