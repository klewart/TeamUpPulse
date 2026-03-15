import React, { useEffect, useRef } from 'react';
import MessageBubble from './MessageBubble';
import { Loader2, Pin } from 'lucide-react';

const ChatWindow = ({ messages, currentUserId, loading, isTeamCreator, onDeleteMessage, onTogglePin, onClearChat }) => {
  const bottomRef = useRef(null);
  const pinnedMessages = messages.filter(m => m.isPinned);

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

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50/50 pb-4 px-4 sm:pb-6 sm:px-6 custom-scrollbar flex flex-col pt-0">
      {/* Top Action Bar */}
      <div className="sticky top-0 z-20 -mx-4 sm:-mx-6 mb-2">
         <div className="flex justify-end p-2 px-4">
            <button 
              onClick={onClearChat}
              className="text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-rose-600 transition-colors bg-white/50 backdrop-blur-sm px-3 py-1 rounded-full border border-gray-100 shadow-sm"
            >
              Clear Local Chat
            </button>
         </div>
      </div>

      {/* Pinned Messages Bar */}
      {pinnedMessages.length > 0 && (
        <div className="sticky top-10 z-20 -mx-4 sm:-mx-6 mb-4">
          <div className="bg-white/90 backdrop-blur-md border-b border-indigo-100 py-2 shadow-sm">
             <div className="flex items-center gap-2 mb-2 px-3 border-b border-indigo-50 pb-1">
                <Pin className="w-3.5 h-3.5 text-indigo-600 fill-indigo-600" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-700">Pinned Messages</span>
             </div>
             <div className="flex flex-col gap-2 max-h-32 overflow-y-auto px-3 custom-scrollbar">
                {pinnedMessages.map((msg) => (
                  <div key={`pinned-${msg.id}`} className="flex items-center justify-between gap-3 bg-indigo-50/50 p-2 rounded-lg border border-indigo-100 group">
                    <p className="text-xs text-slate-700 truncate flex-1">
                      <span className="font-bold text-indigo-700">{msg.senderName}: </span>
                      {msg.text || (msg.attachment ? "[Attachment]" : "")}
                    </p>
                    <button 
                      onClick={() => onTogglePin(msg.id, true)}
                      className="text-[10px] font-bold text-slate-400 hover:text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      Unpin
                    </button>
                  </div>
                ))}
             </div>
          </div>
        </div>
      )}

      <div className="max-w-5xl mx-auto flex flex-col space-y-2 w-full">
        {(!messages || messages.length === 0) ? (
          <div className="flex flex-col items-center justify-center p-6 mt-10">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-dashed border-gray-200 text-center max-w-sm">
              <h3 className="text-lg font-bold text-slate-900 mb-2">It's quiet here...</h3>
              <p className="text-slate-500 text-sm">
                Be the first to say hello! Introduce yourself to the team and share what you're excited to work on.
              </p>
            </div>
          </div>
        ) : (
          <>
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
                isTeamCreator={isTeamCreator}
                onDelete={onDeleteMessage}
                onPin={() => onTogglePin(msg.id, msg.isPinned)}
              />
            ))}
          </>
        )}

        {/* Invisible div to scroll to */}
        <div ref={bottomRef} className="h-4" />
      </div>
    </div>
  );
};

export default ChatWindow;
