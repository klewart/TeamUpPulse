import React, { useState } from 'react';
import { Send, Loader2 } from 'lucide-react';

const ChatInput = ({ onSendMessage, disabled }) => {
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Prevent empty or whitespace-only messages
    if (!message.trim() || isSending || disabled) return;

    try {
      setIsSending(true);
      await onSendMessage(message.trim());
      setMessage('');
    } catch (error) {
      console.error("Error sending message:", error);
      // Optional: show a small toast error here
    } finally {
      setIsSending(false);
    }
  };

  return (
    <form 
      onSubmit={handleSubmit}
      className="bg-white border-t border-gray-100 p-4 shrink-0"
    >
        <div className="relative flex items-center max-w-5xl mx-auto w-full">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={disabled || isSending}
              placeholder="Type your message here..."
              className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-full focus:ring-blue-500 focus:border-blue-500 block pl-5 pr-14 py-3.5 transition-colors disabled:opacity-50 outline-none"
            />
            <button
              type="submit"
              disabled={!message.trim() || disabled || isSending}
              className="absolute right-2 text-white bg-blue-600 hover:bg-blue-700 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-full text-sm p-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
               {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
               <span className="sr-only">Send message</span>
            </button>
        </div>
    </form>
  );
};

export default ChatInput;
