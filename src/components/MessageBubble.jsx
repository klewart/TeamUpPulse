import React from 'react';
import { Download, FileText, ExternalLink } from 'lucide-react';

const MessageBubble = ({ message, isOwnMessage }) => {
  const { text, senderName, createdAt, attachment } = message;

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
        
        {attachment && (
          <div className="mb-3 mt-1 overflow-hidden rounded-xl border border-white/10">
            {attachment.fileType?.startsWith('image/') ? (
              <a 
                href={attachment.fileUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="block group relative"
              >
                <img 
                  src={attachment.fileUrl} 
                  alt={attachment.fileName} 
                  className="max-h-64 h-auto w-full object-cover rounded-xl transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                    <ExternalLink className="text-white opacity-0 group-hover:opacity-100 transition-opacity w-8 h-8" />
                </div>
              </a>
            ) : (
              <a 
                href={attachment.fileUrl} 
                target="_blank" 
                rel="noopener noreferrer" 
                download={attachment.fileName}
                className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${
                  isOwnMessage ? 'bg-white/10 hover:bg-white/20' : 'bg-slate-50 hover:bg-slate-100'
                }`}
              >
                <div className={`p-2 rounded-lg ${isOwnMessage ? 'bg-white/20' : 'bg-blue-100 text-blue-600'}`}>
                   <FileText className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                   <p className="text-sm font-bold truncate">{attachment.fileName}</p>
                   <p className="text-[10px] opacity-70">{(attachment.fileSize / 1024).toFixed(1)} KB</p>
                </div>
                <Download className="w-5 h-5 opacity-60" />
              </a>
            )}
          </div>
        )}
        
        {text && (
          <p className={`text-[15px] leading-relaxed break-words ${isOwnMessage ? 'text-white' : 'text-slate-700'}`}>
            {text}
          </p>
        )}

        <span className={`text-[10px] uppercase font-semibold mt-1 self-end opacity-70 ${isOwnMessage ? 'text-blue-100' : 'text-slate-400'}`}>
          {formatTime(createdAt)}
        </span>
      </div>
    </div>
  );
};

export default MessageBubble;
