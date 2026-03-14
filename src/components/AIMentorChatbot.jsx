import React, { useState, useEffect, useRef } from 'react';
import { Bot, X, Send, Loader2, Sparkles, Trash2, Maximize2, Minimize2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useAuth } from '../context/AuthContext';
import {
  initializeMentorChat,
  generateMentorResponse,
  saveChatMessage,
  fetchChatHistory,
  clearChatHistory,
  formatHistoryForGemini
} from '../services/geminiService';
import toast from 'react-hot-toast';
import { useLocation } from 'react-router-dom';

const AIMentorChatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingHistory, setIsFetchingHistory] = useState(false);
  const [chatSession, setChatSession] = useState(null);
  const messagesEndRef = useRef(null);
  const { currentUser } = useAuth();
  const location = useLocation();

  // Scroll to bottom when messages change
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  // Load chat history when opened (if signed in)
  useEffect(() => {
    const loadHistory = async () => {
      if (isOpen && currentUser && messages.length === 0 && !isFetchingHistory) {
        setIsFetchingHistory(true);
        try {
          const history = await fetchChatHistory(currentUser.uid);

          if (history.length > 0) {
            setMessages(history);
            // Re-initialize session with history
            const geminiHistory = formatHistoryForGemini(history);
            const session = initializeMentorChat(geminiHistory);
            setChatSession(session);
          } else {
            // No history, initialize fresh
            const session = initializeMentorChat([]);
            setChatSession(session);

            // Add initial greeting
            const initialGreeting = {
              role: 'model',
              text: "Hi! I'm your AI Project Mentor. I can help you generate project ideas, plan your development roadmap, solve coding doubts, or guide you toward successful project completion. What are you working on today?",
              id: 'greeting'
            };
            setMessages([initialGreeting]);
          }
        } catch (error) {
          console.error("Failed to load history", error);
          toast.error("Could not load previous chat history.");
        } finally {
          setIsFetchingHistory(false);
        }
      }
    };

    if (isOpen) {
      loadHistory();
    }
  }, [isOpen, currentUser]);

  const handleSendMessage = async (e) => {
    e?.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    const userMessageText = inputValue.trim();
    setInputValue('');
    setIsLoading(true);

    const newUserMessage = {
      role: 'user',
      text: userMessageText,
      id: Date.now().toString()
    };

    // Optimistically update UI
    setMessages(prev => [...prev, newUserMessage]);

    // Save to Firestore background
    if (currentUser) {
      saveChatMessage(currentUser.uid, { role: 'user', text: userMessageText });
    }

    try {
      // Ensure we have a session
      let currentSession = chatSession;
      if (!currentSession) {
        currentSession = initializeMentorChat([]);
        setChatSession(currentSession);
      }

      // Context Awareness Payload (if on a specific page, append context behind the scenes)
      let promptToSend = userMessageText;
      if (location.pathname.includes('/team/')) {
        promptToSend = `[System Note: The user is currently viewing a specific project/team page. Keep their context in mind if their question is vague.]\n\nUser Question: ${userMessageText}`;
      }

      const responseText = await generateMentorResponse(currentSession, promptToSend);

      const newAiMessage = {
        role: 'model',
        text: responseText,
        id: (Date.now() + 1).toString()
      };

      setMessages(prev => [...prev, newAiMessage]);

      if (currentUser) {
        saveChatMessage(currentUser.uid, { role: 'model', text: responseText });
      }

    } catch (error) {
      console.error("Chat error:", error);
      toast.error("Failed to get a response from Mentor.");
      // optionally remove user message or add error message
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearChat = async () => {
    if (!window.confirm("Are you sure you want to delete your chat history with the mentor?")) return;

    if (currentUser) {
      setIsFetchingHistory(true);
      const success = await clearChatHistory(currentUser.uid);
      if (success) {
        setMessages([{
          role: 'model',
          text: "Chat history cleared. How can I help you today?",
          id: 'greeting'
        }]);
        const session = initializeMentorChat([]);
        setChatSession(session);
        toast.success("History cleared.");
      } else {
        toast.error("Failed to clear history.");
      }
      setIsFetchingHistory(false);
    } else {
      setMessages([{
        role: 'model',
        text: "Chat history cleared. How can I help you today?",
        id: 'greeting'
      }]);
      const session = initializeMentorChat([]);
      setChatSession(session);
    }
  };

  const toggleChat = () => setIsOpen(!isOpen);
  const toggleExpand = () => setIsExpanded(!isExpanded);

  // If not logged in, maybe we don't show the button, or we show it but with limited functionality
  if (!currentUser) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {/* Chat Window */}
      {isOpen && (
        <div
          className={`bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col mb-4 transition-all duration-300 ease-in-out ${isExpanded ? 'w-[800px] h-[80vh] max-w-[90vw]' : 'w-[380px] h-[600px] max-w-[calc(100vw-3rem)]'
            }`}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 text-white flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="bg-white/20 p-2 rounded-full backdrop-blur-sm">
                <Sparkles className="w-5 h-5 text-blue-100" />
              </div>
              <div>
                <h3 className="font-bold text-lg leading-tight">AI Project Mentor</h3>
                <p className="text-blue-100 text-xs text-opacity-80">Powered by Gemini</p>
              </div>
            </div>
            <div className="flex items-center space-x-1">
              <button
                onClick={handleClearChat}
                className="p-2 hover:bg-white/20 rounded-full transition-colors"
                title="Clear Chat History"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                onClick={toggleExpand}
                className="p-2 hover:bg-white/20 rounded-full transition-colors hidden sm:block"
                title={isExpanded ? "Collapse" : "Expand"}
              >
                {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
              <button
                onClick={toggleChat}
                className="p-2 hover:bg-white/20 rounded-full transition-colors"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 bg-slate-50 space-y-4 custom-scrollbar">
            {isFetchingHistory ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin mb-2" />
                <span className="text-sm">Loading history...</span>
              </div>
            ) : (
              messages.map((msg, index) => (
                <div
                  key={msg.id || index}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.role === 'model' && (
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center mr-2 shrink-0">
                      <Bot className="w-5 h-5 text-blue-600" />
                    </div>
                  )}
                  <div
                    className={`max-w-[85%] rounded-2xl p-3 shadow-sm ${msg.role === 'user'
                      ? 'bg-blue-600 text-white rounded-tr-sm'
                      : 'bg-white border border-slate-100 text-slate-800 rounded-tl-sm'
                      }`}
                  >
                    {msg.role === 'model' ? (
                      <div className="prose prose-sm prose-slate max-w-none">
                        <ReactMarkdown>{msg.text}</ReactMarkdown>
                      </div>
                    ) : (
                      <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                    )}
                  </div>
                </div>
              ))
            )}

            {isLoading && (
              <div className="flex justify-start items-end">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center mr-2 shrink-0">
                  <Bot className="w-5 h-5 text-blue-600" />
                </div>
                <div className="bg-white border border-slate-100 text-slate-800 rounded-2xl rounded-tl-sm p-4 shadow-sm flex items-center space-x-2">
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Suggestion Chips */}
          {messages.length <= 1 && !isFetchingHistory && !isLoading && (
            <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 flex gap-2 overflow-x-auto custom-scrollbar pb-2">
              {['Suggest a GenAI project', 'Help me plan my task', 'Code review tips'].map(chip => (
                <button
                  key={chip}
                  onClick={() => setInputValue(chip)}
                  className="whitespace-nowrap flex-shrink-0 text-xs bg-white border border-slate-200 text-slate-600 px-3 py-1.5 rounded-full hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-colors"
                >
                  {chip}
                </button>
              ))}
            </div>
          )}

          {/* Input Area */}
          <div className="p-3 bg-white border-t border-slate-100 shrink-0">
            <form onSubmit={handleSendMessage} className="flex space-x-2 relative">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Ask your mentor..."
                className="flex-1 bg-slate-100 border-transparent focus:bg-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 rounded-full px-4 py-2.5 text-sm transition-all"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={!inputValue.trim() || isLoading}
                className="bg-blue-600 text-white rounded-full w-10 h-10 flex items-center justify-center hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 ml-0.5" />}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Floating Button */}
      <button
        onClick={toggleChat}
        className={`bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4 rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 flex items-center justify-center ${isOpen ? 'rotate-90 scale-0 opacity-0 absolute pointer-events-none' : 'rotate-0 scale-100 opacity-100 relative'}`}
        aria-label="Open AI Mentor"
      >
        <Bot className="w-6 h-6" />
      </button>

      <button
        onClick={toggleChat}
        className={`bg-slate-800 text-white p-3 rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 flex items-center justify-center rotate-0 scale-100 opacity-100 absolute bottom-0 right-0 ${!isOpen ? 'opacity-0 pointer-events-none' : ''}`}
        aria-label="Close AI Mentor"
        style={{ transform: !isOpen ? 'translateY(1rem)' : 'translateY(0)' }} // Small visual offset
      >
        <X className="w-5 h-5" />
      </button>
    </div>
  );
};

export default AIMentorChatbot;
