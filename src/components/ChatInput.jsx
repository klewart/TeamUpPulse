import React, { useState, useRef } from 'react';
import { Send, Loader2, Paperclip, X, Image as ImageIcon, FileText } from 'lucide-react';

const ChatInput = ({ onSendMessage, disabled }) => {
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Check file size (limit to 5MB for now)
    if (file.size > 5 * 1024 * 1024) {
      alert("File size exceeds 5MB limit.");
      return;
    }

    setSelectedFile(file);

    // Create preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFilePreview(reader.result);
      };
      reader.readAsDataURL(file);
    } else {
      setFilePreview('document');
    }
  };

  const removeSelectedFile = () => {
    setSelectedFile(null);
    setFilePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Prevent empty or whitespace-only messages unless there's a file
    if ((!message.trim() && !selectedFile) || isSending || disabled) return;

    try {
      setIsSending(true);
      await onSendMessage(message.trim(), selectedFile);
      setMessage('');
      setSelectedFile(null);
      setFilePreview(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="bg-white border-t border-gray-100 p-4 shrink-0">
        <div className="max-w-5xl mx-auto w-full space-y-3">
            {/* File Preview Area */}
            {selectedFile && (
                <div className="flex items-center gap-3 p-2 bg-slate-50 border border-slate-200 rounded-xl w-fit animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="relative">
                        {selectedFile.type.startsWith('image/') ? (
                            <img 
                                src={filePreview} 
                                alt="Preview" 
                                className="w-12 h-12 rounded-lg object-cover border border-slate-200"
                            />
                        ) : (
                            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 border border-blue-200">
                                <FileText className="w-6 h-6" />
                            </div>
                        )}
                        <button
                            type="button"
                            onClick={removeSelectedFile}
                            className="absolute -top-2 -right-2 bg-slate-900 text-white rounded-full p-0.5 hover:bg-slate-700 transition-colors"
                        >
                            <X className="w-3 h-3" />
                        </button>
                    </div>
                    <div className="pr-2">
                        <p className="text-xs font-bold text-slate-900 truncate max-w-[150px]">{selectedFile.name}</p>
                        <p className="text-[10px] text-slate-500 font-semibold uppercase">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                    </div>
                </div>
            )}

            <form onSubmit={handleSubmit} className="relative flex items-center gap-2">
                <input 
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                />
                
                <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={disabled || isSending}
                    className="p-3 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-all disabled:opacity-50"
                    title="Attach file"
                >
                    <Paperclip className="w-5 h-5" />
                </button>

                <div className="relative flex-1">
                    <input
                      type="text"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      disabled={disabled || isSending}
                      placeholder={selectedFile ? "Add a caption..." : "Type your message here..."}
                      className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-full focus:ring-blue-500 focus:border-blue-500 block pl-5 pr-14 py-3.5 transition-colors disabled:opacity-50 outline-none"
                    />
                    <button
                      type="submit"
                      disabled={(!message.trim() && !selectedFile) || disabled || isSending}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-white bg-blue-600 hover:bg-blue-700 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-full text-sm p-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                       {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                       <span className="sr-only">Send message</span>
                    </button>
                </div>
            </form>
        </div>
    </div>
  );
};

export default ChatInput;
