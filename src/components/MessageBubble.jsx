import React, { useRef, useEffect, useState } from 'react';
import { Download, FileText, ExternalLink, Trash2, Pin, PinOff, Eye, Loader2, Info, File, Maximize2 } from 'lucide-react';
import DocViewerModal from './DocViewerModal';

const MessageBubble = ({ message, isOwnMessage, isTeamCreator, onDelete, onPin }) => {
  const { text, senderName, createdAt, attachment } = message;
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // Format time (Firestore timestamp)
  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // The "Senior Developer" Download Handler - Blob Fetch + Object URL
  const handleDownload = async (url, filename) => {
    try {
      setIsDownloading(true);
      
      // 1. Fetch the file as a Blob (Guarantees content handoff)
      const response = await fetch(url);
      if (!response.ok) throw new Error('Blob fetch failed');
      
      const blob = await response.blob();
      
      // 2. Create a temporary object URL in browser memory
      const blobUrl = window.URL.createObjectURL(blob);
      
      // 3. Create a hidden anchor tag to trigger the browser's download manager
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename || 'document';
      document.body.appendChild(link);
      
      // 4. Programmatically click the link
      link.click();
      
      // 5. Cleanup: remove link and revoke object URL to prevent memory leaks
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);

    } catch (error) {
      console.warn("Blob fetch failed (CORS/Network). Falling back to Cloudinary Direct Redirect.");
      
      // FALLBACK: Use Cloudinary native attachment flag signal
      if (url.includes('cloudinary.com')) {
        const parts = url.split('/upload/');
        if (parts.length === 2) {
          const downloadUrl = `${parts[0]}/upload/fl_attachment/${parts[1]}`;
          window.location.href = downloadUrl;
          return;
        }
      }
      
      // FINAL FALLBACK: Open in new tab
      window.open(url, '_blank');
    } finally {
      // Show "Active" state for a moment for better UX
      setTimeout(() => setIsDownloading(false), 2000);
    }
  };

  const [showDeleteOptions, setShowDeleteOptions] = React.useState(false);
  const deleteMenuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (deleteMenuRef.current && !deleteMenuRef.current.contains(event.target)) {
        setShowDeleteOptions(false);
      }
    };
    if (showDeleteOptions) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDeleteOptions]);

  return (
    <div className={`flex w-full ${isOwnMessage ? 'justify-end' : 'justify-start'} mb-4 group/bubble`}>
      <div 
        className={`max-w-[80%] lg:max-w-[70%] rounded-2xl px-4 py-3 flex flex-col relative transition-all duration-300
          ${isOwnMessage 
            ? 'bg-blue-600 text-white rounded-br-sm shadow-[0_4px_12px_rgba(37,99,235,0.25)]' 
            : 'bg-white border border-slate-100 text-slate-800 rounded-bl-sm shadow-sm'
          }
        `}
      >
        {/* Quick Actions */}
        <div className={`absolute -top-3 ${isOwnMessage ? '-left-8' : '-right-8'} flex flex-col gap-1 opacity-0 group-hover/bubble:opacity-100 transition-all z-10`}>
          {isTeamCreator && (
            <button 
              onClick={onPin}
              className={`p-1.5 rounded-lg border shadow-sm transition-colors ${
                message.isPinned 
                  ? 'bg-indigo-600 border-indigo-700 text-white' 
                  : 'bg-white border-gray-100 text-slate-400 hover:text-indigo-600'
              }`}
            >
              <Pin className={`w-3.5 h-3.5 ${message.isPinned ? 'fill-current' : ''}`} />
            </button>
          )}

          <div className="relative" ref={deleteMenuRef}>
            <button 
              onClick={() => setShowDeleteOptions(!showDeleteOptions)}
              className="p-1.5 bg-white border border-gray-100 rounded-lg text-slate-400 hover:text-rose-600 shadow-sm transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>

            {showDeleteOptions && (
              <div className={`absolute top-0 ${isOwnMessage ? 'right-full mr-2' : 'left-full ml-2'} bg-white border border-slate-200 rounded-xl shadow-2xl py-2 min-w-[150px] animate-in slide-in-from-top-1`}>
                <button 
                  onClick={() => onDelete(message.id, 'me')}
                  className="w-full text-left px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-blue-600 flex items-center gap-2"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete for Me
                </button>

                {(isOwnMessage || isTeamCreator) && (
                  <button 
                    onClick={() => window.confirm("Delete for everyone?") && onDelete(message.id, 'everyone')}
                    className="w-full text-left px-4 py-2.5 text-xs font-bold text-rose-600 hover:bg-rose-50 border-t border-slate-50 flex items-center gap-2"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete for Everyone
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Sender & Pinned State */}
        <div className="flex items-center justify-between gap-4 mb-1">
          {!isOwnMessage && <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{senderName}</span>}
          {message.isPinned && (
            <div className={`flex items-center gap-1 ${isOwnMessage ? 'text-blue-100' : 'text-indigo-600'}`}>
              <PinOff className="w-2.5 h-2.5" />
              <span className="text-[9px] font-bold uppercase tracking-widest">Pinned</span>
            </div>
          )}
        </div>
        
        {attachment && (
          <div className="mb-3 mt-1 rounded-xl overflow-hidden border border-black/5">
            {attachment.fileType?.startsWith('image/') ? (
              <div className="relative group/img aspect-video sm:aspect-auto">
                <img 
                  src={attachment.fileUrl} 
                  alt={attachment.fileName} 
                  className="max-h-80 w-full object-cover rounded-xl transition-all duration-500 group-hover/img:scale-105"
                />
                <button 
                  onClick={() => window.open(attachment.fileUrl, '_blank')}
                  className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white font-bold text-xs"
                >
                  <Maximize2 className="w-5 h-5" />
                  View Full Size
                </button>
              </div>
            ) : (
              <div className={`flex flex-col p-1 rounded-xl shadow-inner ${isOwnMessage ? 'bg-black/10' : 'bg-slate-50'}`}>
                <div className="flex items-center gap-3 p-4">
                  <div className={`p-3 rounded-2xl ${isOwnMessage ? 'bg-white/20' : 'bg-blue-600 text-white shadow-lg shadow-blue-100'}`}>
                    {attachment.fileName?.toLowerCase().endsWith('.pdf') ? <FileText className="w-7 h-7" /> : <File className="w-7 h-7" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-bold truncate leading-tight">{attachment.fileName}</p>
                    <p className="text-[10px] font-bold uppercase tracking-wider opacity-60 mt-0.5">{(attachment.fileSize / 1024).toFixed(1)} KB</p>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 px-3 pb-3">
                  <button 
                    onClick={() => setIsPreviewOpen(true)}
                    className={`flex items-center justify-center gap-2 py-3 rounded-2xl text-[11px] font-bold uppercase tracking-[0.1em] transition-all
                      ${isOwnMessage ? 'bg-white/10 hover:bg-white/20' : 'bg-white border border-slate-200 hover:border-blue-400 hover:text-blue-600 text-slate-700 shadow-sm'}
                    `}
                  >
                    <Eye className="w-4 h-4" />
                    Preview Document
                  </button>
                  
                  <button 
                    onClick={() => handleDownload(attachment.fileUrl, attachment.fileName)}
                    disabled={isDownloading}
                    className={`flex items-center justify-center gap-2 py-3 rounded-2xl text-[11px] font-bold uppercase tracking-[0.1em] transition-all shadow-xl active:scale-95 disabled:opacity-50
                      ${isOwnMessage ? 'bg-blue-500 hover:bg-white hover:text-blue-600 text-white' : 'bg-slate-900 hover:bg-slate-800 text-white shadow-slate-200'}
                    `}
                  >
                    {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                    {isDownloading ? 'Downloading...' : 'Download File'}
                  </button>
                </div>

                <DocViewerModal 
                  isOpen={isPreviewOpen}
                  onClose={() => setIsPreviewOpen(false)}
                  fileUrl={attachment.fileUrl}
                  fileName={attachment.fileName}
                />
              </div>
            )}
          </div>
        )}
        
        {text && (
          <p className={`text-[15px] leading-relaxed break-words font-medium ${isOwnMessage ? 'text-white' : 'text-slate-700'}`}>
            {text}
          </p>
        )}

        <span className={`text-[9px] uppercase font-bold mt-2 self-end tracking-widest opacity-60 ${isOwnMessage ? 'text-blue-100' : 'text-slate-400'}`}>
          {formatTime(createdAt)}
        </span>
      </div>
    </div>
  );
};

export default MessageBubble;
