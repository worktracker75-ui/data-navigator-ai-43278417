import { useState, useRef, useEffect } from "react";
import { Send, Sparkles, Code, Play, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  sql?: string;
  timestamp: Date;
}

interface ChatPanelProps {
  messages: Message[];
  isLoading: boolean;
  onSendMessage: (content: string) => void;
  onExecuteQuery: (sql: string) => void;
  onClear: () => void;
}

export function ChatPanel({ 
  messages, 
  isLoading, 
  onSendMessage, 
  onExecuteQuery,
  onClear 
}: ChatPanelProps) {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    onSendMessage(input.trim());
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const extractSQL = (content: string): string | null => {
    const match = content.match(/```json\s*({[\s\S]*?})\s*```/);
    if (match) {
      try {
        const data = JSON.parse(match[1]);
        return data.sql;
      } catch {
        return null;
      }
    }
    return null;
  };

  return (
    <Card className="flex flex-col h-full border-border/50 bg-card/50 backdrop-blur-sm">
      <div className="flex items-center justify-between p-4 border-b border-border/50">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-primary/10">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">AI Data Assistant</h3>
            <p className="text-xs text-muted-foreground">Ask questions about your data</p>
          </div>
        </div>
        {messages.length > 0 && (
          <Button variant="ghost" size="sm" onClick={onClear}>
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      <ScrollArea ref={scrollRef} className="flex-1 p-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-6">
            <div className="p-4 rounded-full bg-primary/10 mb-4">
              <Sparkles className="h-8 w-8 text-primary" />
            </div>
            <h4 className="font-semibold mb-2">Start a conversation</h4>
            <p className="text-sm text-muted-foreground max-w-sm">
              Ask questions about your data in natural language. I'll generate SQL queries and provide insights.
            </p>
            <div className="mt-6 space-y-2 w-full max-w-sm">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Try asking:</p>
              {[
                "Show me the top 10 customers by total orders",
                "What's the average order value this month?",
                "Which products are trending up?",
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => setInput(suggestion)}
                  className="w-full text-left text-sm p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => {
              const sql = message.sql || extractSQL(message.content);
              
              return (
                <div
                  key={message.id}
                  className={cn(
                    "flex gap-3 animate-slide-up",
                    message.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[85%] rounded-xl p-4",
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted/50"
                    )}
                  >
                    {message.role === "assistant" ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        <ReactMarkdown
                          components={{
                            code: ({ node, className, children, ...props }) => {
                              const isInline = !className;
                              if (isInline) {
                                return (
                                  <code className="px-1 py-0.5 rounded bg-secondary text-secondary-foreground font-mono text-xs" {...props}>
                                    {children}
                                  </code>
                                );
                              }
                              return (
                                <pre className="p-3 rounded-lg bg-secondary overflow-x-auto">
                                  <code className="text-xs font-mono" {...props}>{children}</code>
                                </pre>
                              );
                            },
                          }}
                        >
                          {message.content.replace(/```json[\s\S]*?```/g, "")}
                        </ReactMarkdown>
                        
                        {sql && (
                          <div className="mt-3 pt-3 border-t border-border/50">
                            <div className="flex items-center justify-between mb-2">
                              <Badge variant="secondary" className="gap-1">
                                <Code className="h-3 w-3" />
                                SQL Query
                              </Badge>
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => onExecuteQuery(sql)}
                                className="gap-1"
                              >
                                <Play className="h-3 w-3" />
                                Run
                              </Button>
                            </div>
                            <pre className="p-3 rounded-lg bg-secondary overflow-x-auto">
                              <code className="text-xs font-mono">{sql}</code>
                            </pre>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm">{message.content}</p>
                    )}
                    <p className={cn(
                      "text-xs mt-2",
                      message.role === "user" ? "text-primary-foreground/70" : "text-muted-foreground"
                    )}>
                      {message.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              );
            })}
            
            {isLoading && (
              <div className="flex gap-3">
                <div className="bg-muted/50 rounded-xl p-4">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                    <div className="h-2 w-2 rounded-full bg-primary animate-pulse [animation-delay:150ms]" />
                    <div className="h-2 w-2 rounded-full bg-primary animate-pulse [animation-delay:300ms]" />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </ScrollArea>

      <form onSubmit={handleSubmit} className="p-4 border-t border-border/50">
        <div className="flex gap-2">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your data..."
            className="min-h-[44px] max-h-32 resize-none bg-background"
            rows={1}
          />
          <Button 
            type="submit" 
            size="icon"
            disabled={!input.trim() || isLoading}
            className="shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </Card>
  );
}