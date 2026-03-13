import React from 'react';

const MessageBubble = ({ message, isOwnMessage }) => {
  const { text, senderName, createdAt } = message;

  // Format time if it exists (Firestore timestamp)
  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    
    // Check if it's a Firestore Timestamp or normal Date
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={`flex w-full ${isOwnMessage ? 'justify-end' : 'justify-start'} mb-4`}>
      <div 
        className={`max-w-[75%] rounded-2xl px-4 py-3 flex flex-col relative
          ${isOwnMessage 
            ? 'bg-blue-600 text-white rounded-br-sm shadow-sm shadow-blue-200' 
            : 'bg-white border border-gray-100 text-slate-800 rounded-bl-sm shadow-sm'
          }
        `}
      >
        {!isOwnMessage && (
          <span className="text-xs font-bold text-slate-500 mb-1">{senderName}</span>
        )}
        
        <p className={`text-[15px] leading-relaxed break-words ${isOwnMessage ? 'text-white' : 'text-slate-700'}`}>
          {text}
        </p>

        <span className={`text-[10px] uppercase font-semibold mt-1 self-end opacity-70 ${isOwnMessage ? 'text-blue-100' : 'text-slate-400'}`}>
          {formatTime(createdAt)}
        </span>
      </div>
    </div>
  );
};

export default MessageBubble;
