import { X, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChatPanel } from "./ChatPanel";
import { Message } from "@/hooks/useDataInsights";

interface AiAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  messages: Message[];
  isLoading: boolean;
  onSendMessage: (message: string) => void;
  onExecuteQuery: (sql: string) => void;
  onClear: () => void;
}

export const AiAssistantModal = ({
  isOpen,
  onClose,
  messages,
  isLoading,
  onSendMessage,
  onExecuteQuery,
  onClear,
}: AiAssistantModalProps) => {
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
            <p className="text-sm text-muted-foreground">Ask questions about your data</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-10 w-10 rounded-full hover:bg-destructive/10 hover:text-destructive"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Chat Content */}
      <div className="h-[calc(100vh-5rem)] p-6">
        <div className="mx-auto h-full max-w-4xl">
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
  );
};
