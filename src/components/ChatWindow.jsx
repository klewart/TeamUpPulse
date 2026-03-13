import React, { useEffect, useRef } from 'react';
import MessageBubble from './MessageBubble';
import { Loader2 } from 'lucide-react';

const ChatWindow = ({ messages, currentUserId, loading }) => {
  const bottomRef = useRef(null);

  // Auto-scroll to bottom whenever messages change
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-slate-50/50">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-4" />
        <p className="text-slate-500 font-medium">Loading conversation...</p>
      </div>
    );
  }

  if (!messages || messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-slate-50/50 p-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-dashed border-gray-200 text-center max-w-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-2">It's quiet here...</h3>
          <p className="text-slate-500 text-sm">
            Be the first to say hello! Introduce yourself to the team and share what you're excited to work on.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50/50 p-4 sm:p-6 custom-scrollbar">
      <div className="max-w-5xl mx-auto flex flex-col space-y-2">
        
        {/* Timestamp divider (Simulated for today) */}
        <div className="text-center my-6">
           <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider bg-slate-100 px-3 py-1 rounded-full">
             Beginning of History
           </span>
        </div>

        {messages.map((msg) => (
          <MessageBubble 
            key={msg.id} 
            message={msg} 
            isOwnMessage={msg.senderId === currentUserId} 
          />
        ))}
        
        {/* Invisible div to scroll to */}
        <div ref={bottomRef} className="h-4" />
      </div>
    </div>
  );
};

export default ChatWindow;
