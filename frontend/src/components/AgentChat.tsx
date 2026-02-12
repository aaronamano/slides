"use client";

import { useState, useRef, useEffect } from "react";
import { Message } from "@/services/api";
import Markdown from "react-markdown";

export default function AgentChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const responseJson = {"message":"# Notes on Graphs for CIS 350\n\n## What is a Graph?\n\nA **graph** is a pair (V, E), where:\n- **V** is a set of nodes called **vertices**\n- **E** is a collection of pairs of vertices called **edges**\n- Vertices and edges are positions that store elements\n\n**Example**: In a flight network, vertices represent airports (storing three-letter codes like ORD, LAX), and edges represent flight routes (storing mileage).\n\n---\n\n## Edge Types\n\n### Directed vs Undirected Edges\n\n**Directed Edge**:\n- Ordered pair of vertices (u,v)\n- First vertex u is the **origin**\n- Second vertex v is the **destination**\n- Example: a specific flight\n\n**Undirected Edge**:\n- Unordered pair of vertices (u,v)\n- Example: a flight route (bidirectional)\n\n**Directed Graph**: All edges are directed (e.g., route network)  \n**Undirected Graph**: All edges are undirected (e.g., flight network)\n\n---\n\n## Terminology\n\n**End vertices (endpoints)**: The two vertices connected by an edge\n\n**Incident edges**: Edges connected to a vertex\n\n**Adjacent vertices**: Two vertices connected by an edge\n\n**Degree of a vertex**: Number of edges incident on that vertex\n\n**Parallel edges**: Multiple edges connecting the same pair of vertices\n\n---\n\n## Paths and Cycles\n\n### Path\n- Sequence of alternating vertices and edges\n- Begins and ends with a vertex\n- Each edge is preceded and followed by its endpoints\n\n**Simple Path**: A path where all vertices and edges are distinct\n\n### Cycle\n- Circular sequence of alternating vertices and edges\n- Each edge is preceded and followed by its endpoints\n\n**Simple Cycle**: A cycle where all vertices and edges are distinct\n\n---\n\n## Graph Properties\n\n**Notation**:\n- n = number of vertices\n- m = number of edges\n- deg(v) = degree of vertex v\n\n**Property 1**: Σv deg(v) = 2m  \n*Proof*: Each edge is counted twice\n\n**Property 2**: In an undirected graph with no self-loops and no multiple edges:  \nm ≤ n(n-1)/2  \n*Proof*: Each vertex has degree at most (n-1)\n\n---\n\n## Graph ADT Methods\n\n### Accessor Methods\n- `e.endVertices()`: Returns list of two end vertices of edge e\n- `e.opposite(v)`: Returns the vertex opposite of v on edge e\n- `u.isAdjacentTo(v)`: Returns true if u and v are adjacent\n- `*v`: Reference to element associated with vertex v\n- `*e`: Reference to element associated with edge e\n\n### Update Methods\n- `insertVertex(o)`: Insert a vertex storing element o\n- `insertEdge(v, w, o)`: Insert an edge (v,w) storing element o\n- `eraseVertex(v)`: Remove vertex v and its incident edges\n- `eraseEdge(e)`: Remove edge e\n\n### Iterable Collection Methods\n- `incidentEdges(v)`: List of edges incident to v\n- `vertices()`: List of all vertices in the graph\n- `edges()`: List of all edges in the graph\n\n---\n\n## Graph Data Structures\n\n### 1. Edge List Structure\n\n**Vertex object**:\n- Element\n- Reference to position in vertex sequence\n\n**Edge object**:\n- Element\n- Origin vertex object\n- Destination vertex object\n- Reference to position in edge sequence\n\n**Sequences**:\n- Vertex sequence: sequence of vertex objects\n- Edge sequence: sequence of edge objects\n\n### 2. Adjacency List Structure\n\n- Built on edge list structure\n- **Incidence sequence** for each vertex: sequence of references to edge objects of incident edges\n- **Augmented edge objects**: references to associated positions in incidence sequences of end vertices\n\n### 3. Adjacency Matrix Structure\n\n- Built on edge list structure\n- **Augmented vertex objects**: Integer key (index) associated with vertex\n- **2D-array adjacency array**: \n  - Reference to edge object for adjacent vertices\n  - Null for non-adjacent vertices\n  - Traditional version uses 0 for no edge, 1 for edge\n\n---\n\n## Performance Comparison\n\nFor n vertices, m edges, no parallel edges, no self-loops:\n\n| Operation | Edge List | Adjacency List | Adjacency Matrix |\n|-----------|-----------|----------------|------------------|\n| **Space** | n + m | n + m | n² |\n| **v.incidentEdges()** | m | deg(v) | n |\n| **u.isAdjacentTo(v)** | m | min(deg(v), deg(u)) | 1 |\n| **insertVertex(o)** | 1 | 1 | n² |\n| **insertEdge(v,w,o)** | 1 | 1 | 1 |\n\n---\n\n## Applications\n\n- **Electronic circuits**: Printed circuit boards, integrated circuits\n- **Transportation networks**: Highway networks, flight networks\n- **Computer networks**: Local area networks, Internet, Web\n- **Databases**: Entity-relationship diagrams"};
    
    const markdownContent = responseJson.message;

    setMessages([
      {
        role: "assistant",
        content: markdownContent
      }
    ]);
  }, []);

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
        // The message field contains the markdown content directly as a string
        agentResponse = data.message;
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
                className={`max-w-[95%] px-4 py-3 rounded-lg text-sm ${
                  message.role === "user"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-700 text-gray-200"
                }`}
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
                        hr: () => <hr className="my-2 border-gray-500" />,
                        table: ({children}) => <table className="my-2 text-xs">{children}</table>,
                        thead: ({children}) => <thead className="my-0">{children}</thead>,
                        tbody: ({children}) => <tbody className="my-0">{children}</tbody>,
                        tr: ({children}) => <tr className="my-0">{children}</tr>,
                        th: ({children}) => <th className="border border-gray-500 px-2 my-0 text-left">{children}</th>,
                        td: ({children}) => <td className="border border-gray-500 px-2 my-0">{children}</td>,
                        strong: ({children}) => <strong className="font-semibold">{children}</strong>,
                        em: ({children}) => <em className="italic">{children}</em>,
                        code: ({children}) => <code className="bg-gray-600 px-1 rounded text-xs">{children}</code>,
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