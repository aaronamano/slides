"use client";

import { useState, useRef, useEffect } from "react";
import { Message } from "@/services/api";

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
      
      // Add the agent response to messages
      // Handle different response structures from Elasticsearch agent builder API
      let agentResponse = "";
      if (data.response) {
        agentResponse = typeof data.response === 'string' ? data.response : JSON.stringify(data.response);
      } else if (data.message) {
        agentResponse = typeof data.message === 'string' ? data.message : JSON.stringify(data.message);
      } else if (data.output) {
        agentResponse = typeof data.output === 'string' ? data.output : JSON.stringify(data.output);
      } else if (data.data && data.data.output) {
        agentResponse = typeof data.data.output === 'string' ? data.data.output : JSON.stringify(data.data.output);
      } else if (typeof data === 'string') {
        agentResponse = data;
      } else {
        // For error responses or unexpected formats
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
      
      // If it's a 401 error, show a more helpful message
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
    <div className="flex flex-col h-full bg-gray-900">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-white">Agent Chat</h3>
          <button
            onClick={clearChat}
            className="text-xs text-gray-400 hover:text-gray-200 transition-colors"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <div className="text-3xl mb-2">💬</div>
              <div className="text-sm text-gray-400">Start a conversation with the agent</div>
            </div>
          </div>
        ) : (
          messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] px-3 py-2 rounded-lg text-sm ${
                  message.role === "user"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-700 text-gray-200"
                }`}
              >
                <div className="font-medium text-xs mb-1 opacity-70">
                  {message.role === "user" ? "You" : "Agent"}
                </div>
                <div className="whitespace-pre-wrap wrap-break-word">
                  {message.content}
                </div>
              </div>
            </div>
          ))
        )}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-700 text-gray-200 px-3 py-2 rounded-lg">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-3 border-t border-gray-700">
          <div className="bg-red-900/30 border border-red-700 text-red-300 rounded-lg p-2 text-xs">
            {error}
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="p-4 border-t border-gray-700">
        <div className="flex space-x-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message..."
            disabled={isLoading}
            className="flex-1 px-3 py-2 bg-gray-800 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-700 disabled:cursor-not-allowed text-sm font-medium"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}