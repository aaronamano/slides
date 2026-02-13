"use client";

import { useState, useRef, useEffect } from "react";
import { Message } from "@/services/api";
import Markdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function AgentChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      role: "user",
      content: inputValue.trim()
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInputValue("");
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch('/api/agent-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ input: inputValue.trim() }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      let agentResponse = "";
      if (data.message) {
        agentResponse = data.message;
      } else {
        agentResponse = JSON.stringify(data, null, 2);
      }
      
      const agentMessage: Message = {
        role: "assistant",
        content: agentResponse
      };

      setMessages(prev => [...prev, agentMessage]);
    } catch (err) {
      console.error('Agent chat error:', err);
      const errorMessage = err instanceof Error ? err.message : "Failed to send message";
      
      if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
        setError("Authentication failed. The agent service may be incorrectly configured.");
      } else if (errorMessage.includes('404') || errorMessage.includes('Not Found')) {
        setError("Agent service not found. Please check the service configuration.");
      } else if (errorMessage.includes('500')) {
        setError("Server error occurred. Please try again later.");
      } else {
        setError(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const clearChat = () => {
    setMessages([]);
    setError(null);
  };

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: "oklch(0.12 0 0)" }}>
      <div className="p-4 border-b" style={{ borderColor: "oklch(1 0 0 / 10%)" }}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold" style={{ color: "#0B64DD" }}>Agent Chat</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearChat}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Clear
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1 p-4">
        <div className="space-y-3">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground py-12">
              <div className="text-center">
                <div className="text-3xl mb-2">💬</div>
                <div className="text-sm">Start a conversation with the agent</div>
              </div>
            </div>
          ) : (
            messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[95%] px-4 py-3 rounded-lg text-sm ${
                    message.role === "user"
                      ? "text-white"
                      : ""
                  }`}
                  style={{ 
                    backgroundColor: message.role === "user" ? "#0B64DD" : "oklch(0.2 0 0)",
                    color: message.role === "user" ? "white" : "oklch(0.9 0 0)"
                  }}
                >
                  <div className="font-medium text-xs mb-1 opacity-70">
                    {message.role === "user" ? "You" : "Agent"}
                  </div>
                  <div className="whitespace-pre-wrap wrap-break-word text-xs">
                    {message.role === "assistant" ? (
                      <Markdown
                        components={{
                          h1: ({children}) => <h1 className="text-sm font-bold mt-0 mb-1">{children}</h1>,
                          h2: ({children}) => <h2 className="text-sm font-bold mt-2 mb-1">{children}</h2>,
                          h3: ({children}) => <h3 className="text-sm font-semibold mt-2 mb-1">{children}</h3>,
                          p: ({children}) => <p className="my-0 leading-snug">{children}</p>,
                          ul: ({children}) => <ul className="my-0 pl-4">{children}</ul>,
                          ol: ({children}) => <ol className="my-0 pl-4">{children}</ol>,
                          li: ({children}) => <li className="my-0 leading-snug">{children}</li>,
                          hr: () => <hr className="my-2" style={{ borderColor: "oklch(1 0 0 / 10%)" }} />,
                          table: ({children}) => <table className="my-2 text-xs">{children}</table>,
                          thead: ({children}) => <thead className="my-0">{children}</thead>,
                          tbody: ({children}) => <tbody className="my-0">{children}</tbody>,
                          tr: ({children}) => <tr className="my-0">{children}</tr>,
                          th: ({children}) => <th className="border px-2 my-0 text-left" style={{ borderColor: "oklch(1 0 0 / 10%)" }}>{children}</th>,
                          td: ({children}) => <td className="border px-2 my-0" style={{ borderColor: "oklch(1 0 0 / 10%)" }}>{children}</td>,
                          strong: ({children}) => <strong className="font-semibold">{children}</strong>,
                          em: ({children}) => <em className="italic">{children}</em>,
                          code: ({children}) => <code className="px-1 rounded text-xs" style={{ backgroundColor: "oklch(0.25 0 0)" }}>{children}</code>,
                        }}
                      >{message.content}</Markdown>
                    ) : (
                      message.content
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
          
          {isLoading && (
            <div className="flex justify-start">
              <div 
                className="px-3 py-2 rounded-lg"
                style={{ backgroundColor: "oklch(0.2 0 0)" }}
              >
                <div className="flex items-center space-x-2">
                  <div 
                    className="w-2 h-2 rounded-full animate-bounce"
                    style={{ backgroundColor: "#0B64DD" }}
                  ></div>
                  <div 
                    className="w-2 h-2 rounded-full animate-bounce"
                    style={{ backgroundColor: "#0B64DD", animationDelay: '0.1s' }}
                  ></div>
                  <div 
                    className="w-2 h-2 rounded-full animate-bounce"
                    style={{ backgroundColor: "#0B64DD", animationDelay: '0.2s' }}
                  ></div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {error && (
        <div className="p-3 border-t" style={{ borderColor: "oklch(1 0 0 / 10%)" }}>
          <div 
            className="rounded-lg p-2 text-xs"
            style={{ backgroundColor: "#C61E2540", border: "1px solid #C61E25", color: "#FF6B6B" }}
          >
            {error}
          </div>
        </div>
      )}

      <div className="p-4 border-t" style={{ borderColor: "oklch(1 0 0 / 10%)" }}>
        <div className="flex space-x-2">
          <Input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Type your message..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isLoading}
            style={{ backgroundColor: "#0B64DD" }}
          >
            Send
          </Button>
        </div>
      </div>
    </div>
  );
}
