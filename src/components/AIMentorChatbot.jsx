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
  formatHistoryForGemini,
  GLOBAL_SYSTEM_INSTRUCTION,
  PROJECT_SYSTEM_INSTRUCTION
} from '../services/geminiService';
import toast from 'react-hot-toast';
import { useLocation, useParams } from 'react-router-dom';
import { Paperclip, Image as ImageIcon, Briefcase, FileText as FileIcon, Link2 } from 'lucide-react';
import { getProjectAIContext } from '../utils/aiContext';
import { extractTextFromPDF } from '../utils/pdfUtils';
import { playNotificationSound } from '../utils/soundUtils';

const AIMentorChatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingHistory, setIsFetchingHistory] = useState(false);
  const [chatSession, setChatSession] = useState(null);
  const messagesEndRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null); // { data, mimeType, name }
  const [activeProject, setActiveProject] = useState(null); // The project context object
  const fileInputRef = useRef(null);
  const { currentUser } = useAuth();
  const location = useLocation();
  const { id: routeId } = useParams();

  // Scroll to bottom when messages change
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const isInitialOpen = useRef(true);

  // Scroll logic: Only scroll on open or on USER messages
  useEffect(() => {
    if (!isOpen) {
      isInitialOpen.current = true;
      return;
    }

    const lastMessage = messages[messages.length - 1];
    
    // 1. Initial scroll when chat opens (to show latest history)
    // 2. Scroll when USER sends a message
    // 3. NO scroll when AI responds (to prevent jumping past the start of the message)
    if (isInitialOpen.current || lastMessage?.role === 'user') {
      scrollToBottom();
      if (messages.length > 0) {
        isInitialOpen.current = false;
      }
    }
  }, [messages, isOpen]);

  // Listen for Project Context Triggers
  useEffect(() => {
    const handleTrigger = async (e) => {
      const { projectId } = e.detail;
      if (!projectId) return;

      setIsLoading(true);
      setIsOpen(true);
      try {
        const context = await getProjectAIContext(projectId);
        setActiveProject(context);
        
        // Re-initialize session with project instructions
        const session = initializeMentorChat([], PROJECT_SYSTEM_INSTRUCTION(context));
        setChatSession(session);

        const introMsg = {
          role: 'model',
          text: `I've analyzed the **${context.teamName}** project. As your Technical Lead, I'm ready to help you with architecture, debugging, or planning the next steps based on your current progress (${context.progress}% complete). What's on your mind?`,
          id: `intro-${Date.now()}`
        };
        setMessages(prev => [...prev, introMsg]);
      } catch (err) {
        toast.error("Failed to load project context.");
      } finally {
        setIsLoading(false);
      }
    };

    window.addEventListener('triggerAIChat', handleTrigger);
    return () => window.removeEventListener('triggerAIChat', handleTrigger);
  }, []);

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
        const systemInstruction = activeProject 
          ? PROJECT_SYSTEM_INSTRUCTION(activeProject) 
          : GLOBAL_SYSTEM_INSTRUCTION;
        currentSession = initializeMentorChat([], systemInstruction);
        setChatSession(currentSession);
      }

      const responseText = await generateMentorResponse(currentSession, userMessageText, selectedFile);

      const newAiMessage = {
        role: 'model',
        text: responseText,
        id: (Date.now() + 1).toString()
      };

      setMessages(prev => [...prev, newAiMessage]);
      playNotificationSound();

      if (currentUser) {
        saveChatMessage(currentUser.uid, { role: 'model', text: responseText });
      }

      setSelectedFile(null); // Clear file after sending
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
        setChatSession(initializeMentorChat([]));
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
      setChatSession(initializeMentorChat([]));
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Check size (Gemini has limits, but let's keep it reasonable like 4MB)
    if (file.size > 4 * 1024 * 1024) {
      toast.error("File is too large. Please select a file smaller than 4MB.");
      return;
    }

    const reader = new FileReader();

    if (file.type === 'application/pdf') {
      setIsLoading(true);
      extractTextFromPDF(file)
        .then(text => {
          setSelectedFile({
            data: null,
            mimeType: file.type,
            name: file.name,
            extractedText: text
          });
          toast.success("PDF text extracted and ready!");
        })
        .catch(err => toast.error(err.message))
        .finally(() => setIsLoading(false));
      e.target.value = null;
      return;
    }

    // Handle text-based files (.txt, .js, .json, .css, .html, .md, .py, .java, .cpp, .c, .h, .ts, etc.)
    const isTextFile = 
      file.type.startsWith('text/') || 
      file.type === 'application/json' ||
      /\.(txt|md|js|jsx|ts|tsx|py|java|cpp|c|h|cs|go|rb|php|json|css|html)$/i.test(file.name);

    if (isTextFile) {
      setIsLoading(true);
      const textReader = new FileReader();
      textReader.onload = (event) => {
        setSelectedFile({
          data: null,
          mimeType: file.type || 'text/plain',
          name: file.name,
          extractedText: event.target.result
        });
        toast.success("File content read successfully!");
        setIsLoading(false);
      };
      textReader.onerror = () => {
        toast.error("Failed to read text file.");
        setIsLoading(false);
      };
      textReader.readAsText(file);
      e.target.value = null;
      return;
    }

    reader.onloadend = () => {
      const base64Data = reader.result.split(',')[1];
      setSelectedFile({
        data: base64Data,
        mimeType: file.type,
        name: file.name
      });
    };
    reader.readAsDataURL(file);
    // Reset input
    e.target.value = null;
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
          className={`bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col fixed bottom-[90px] right-6 transition-all duration-300 ease-in-out z-[51] ${
            isExpanded 
              ? 'w-[800px] h-[calc(100vh-180px)] max-h-[75vh] max-w-[90vw]' 
              : 'w-[380px] h-[600px] max-h-[calc(100vh-180px)] max-w-[calc(100vw-3rem)]'
          }`}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 text-white flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="bg-white/20 p-2 rounded-full backdrop-blur-sm">
                <Sparkles className="w-5 h-5 text-blue-100" />
              </div>
              <div>
                <h3 className="font-bold text-lg leading-tight">
                  {activeProject ? 'Project Analyst' : 'AI Project Mentor'}
                </h3>
                <p className="text-blue-100 text-xs text-opacity-80">
                  {activeProject ? `Context: ${activeProject.teamName}` : 'Powered by Groq'}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-1">
              {activeProject && (
                <button
                  onClick={() => {
                    setActiveProject(null);
                    setChatSession(initializeMentorChat([]));
                    toast.success("Global mode restored.");
                  }}
                  className="p-2 hover:bg-white/20 rounded-full transition-colors mr-2 flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest border border-white/20"
                  title="Return to Global Mode"
                >
                  <X className="w-3 h-3" /> Exit Project Mode
                </button>
              )}
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
          <div className="flex-1 overflow-y-auto p-4 bg-slate-50 space-y-4 custom-scrollbar overscroll-contain">
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
            {selectedFile && (
              <div className="mb-2 flex items-center justify-between bg-blue-50 border border-blue-100 rounded-lg p-2 animate-in fade-in slide-in-from-bottom-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-blue-100 rounded text-blue-600">
                    {selectedFile.mimeType?.startsWith('image/') ? <ImageIcon className="w-4 h-4" /> : <FileIcon className="w-4 h-4" />}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">File Selected</span>
                    <span className="text-xs font-semibold text-slate-700 truncate max-w-[200px]">{selectedFile.name}</span>
                  </div>
                </div>
                <button onClick={() => setSelectedFile(null)} className="p-1 hover:bg-blue-100 rounded-full text-blue-400 hover:text-blue-600 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
            <form onSubmit={handleSendMessage} className="flex items-center space-x-2 relative">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept="image/*,application/pdf,.txt,.md,.js,.jsx,.ts,.tsx,.py,.java,.cpp,.c,.h,.cs,.go,.rb,.php,.json,.css,.html"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-2.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-all shrink-0"
                title="Attach image or file"
                disabled={isLoading}
              >
                <Paperclip className="w-5 h-5" />
              </button>
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={activeProject ? "Ask your Project Lead..." : "Ask your Groq mentor..."}
                className="flex-1 bg-slate-100 border-transparent focus:bg-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 rounded-full px-4 py-2.5 text-sm transition-all"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={(!inputValue.trim() && !selectedFile) || isLoading}
                className="bg-blue-600 text-white rounded-full w-10 h-10 flex items-center justify-center hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 ml-0.5" />}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Floating Toggle Button */}
      <button
        onClick={toggleChat}
        className={`w-14 h-14 rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 flex items-center justify-center z-50 ${
          isOpen 
            ? 'bg-slate-800 text-white' 
            : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white'
        }`}
        aria-label={isOpen ? "Close AI Mentor" : "Open AI Mentor"}
      >
        {isOpen ? (
          <X className="w-6 h-6 animate-in fade-in zoom-in duration-300" />
        ) : (
          <Bot className="w-7 h-7 animate-in fade-in zoom-in duration-300" />
        )}
      </button>
    </div>
  );
};

export default AIMentorChatbot;
