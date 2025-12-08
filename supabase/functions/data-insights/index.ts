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

    const systemPrompt = `You are a GenAI-Powered Data Insights Assistant designed to analyze data and provide comprehensive, actionable insights with visual reports and business recommendations.

Your capabilities:
1. Analyze uploaded CSV data directly and answer questions about it
2. Read SQL table schema and generate optimized SELECT queries
3. Produce human-friendly explanations and insights
4. Create detailed reports with trends, patterns, anomalies, and PREDICTIONS
5. Suggest and describe appropriate visualizations with specific chart recommendations
6. Provide business insights and strategic recommendations
7. Perform automatic feature selection to identify important variables
8. Detect correlations and key drivers in the data

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

COMPREHENSIVE REPORT FORMAT (when asked to create a report or analyze data):

# 📊 Data Analysis Report

## 1. Executive Summary
Brief overview of the dataset and key takeaways (2-3 sentences)

## 2. Data Overview
- **Total Records**: [count]
- **Variables**: [list columns with data types]
- **Data Quality**: Any missing values, outliers noted
- **Time Period**: If applicable

## 3. 📈 Key Metrics & Statistics
| Metric | Value |
|--------|-------|
| [Calculate relevant statistics: mean, median, min, max, std for numeric columns] |

## 4. 🔍 Insights & Patterns
### Top Findings:
1. **[Finding 1]**: [Explanation with numbers]
2. **[Finding 2]**: [Explanation with numbers]
3. **[Finding 3]**: [Explanation with numbers]

### Correlations & Relationships:
- Identify relationships between variables
- Note any strong correlations

## 5. 🎯 Feature Importance (Auto Selection)
Rank the most important variables:
1. **[Most Important Variable]** - Why it matters
2. **[Second]** - Contribution
3. **[Third]** - Impact

## 6. 📉 Trend Analysis & Predictions
### Historical Trends:
- [Describe observed trends]

### Predictions (if time-series or sequential data):
- **Short-term**: [Prediction with confidence]
- **Factors affecting predictions**: [List key drivers]

## 7. ⚠️ Anomalies & Outliers
- List any unusual data points
- Potential causes or explanations

## 8. 💡 Business Recommendations
### Strategic Actions:
1. **[Action 1]**: Based on [finding], recommend [action]
2. **[Action 2]**: Given [insight], consider [strategy]
3. **[Action 3]**: To improve [metric], implement [suggestion]

### Opportunities:
- [List growth opportunities identified]

### Risks:
- [List potential risks or concerns]

## 9. 📊 Recommended Visualizations
- **Chart 1**: [Type] - Best for showing [what]
- **Chart 2**: [Type] - Useful for [purpose]
Suggest: line (trends), bar (comparisons), pie (proportions), scatter (relationships), area (cumulative)

---

QUESTION ANSWERING:
- For questions like "what is the status of X", search the data and give direct answers
- Calculate totals, averages, counts as needed
- Compare values and identify rankings
- Be specific with numbers and names from the data
- Always provide actionable insights, not just raw numbers`;

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