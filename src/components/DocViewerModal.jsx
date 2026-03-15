import React, { useState } from 'react';
import { X, Download, Loader2, ChevronLeft, ChevronRight, FileText, ExternalLink } from 'lucide-react';

const DocViewerModal = ({ isOpen, onClose, fileUrl, fileName }) => {
  const [pageNumber, setPageNumber] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  if (!isOpen) return null;

  // Helper to construct Cloudinary preview image URL
  // Format: .../upload/[TRANSFORMATION]/v[VERSION]/[PUBLIC_ID].[FORMAT]
  const getPreviewUrl = (url, page) => {
    if (!url || !url.includes('cloudinary.com')) return url;
    
    // Replace the extension with .jpg and inject pg_X transformation
    // We target the /upload/ part to inject our transformation
    const parts = url.split('/upload/');
    if (parts.length !== 2) return url;

    // Remove versioning/existing transformations to simplify and force our page render
    // Cloudinary can handle: /upload/pg_1/v123/file.pdf -> renders as image
    // Better yet: /upload/pg_1,f_jpg/v123/file.pdf
    return `${parts[0]}/upload/pg_${page},f_jpg,w_1200,c_limit/${parts[1].replace(/\.[^/.]+$/, ".jpg")}`;
  };

  // The "Senior Developer" Download Handler - Blob Fetch + Object URL
  const handleDownload = async () => {
    try {
      setIsDownloading(true);
      
      // 1. Fetch the file as a Blob (Guarantees content handoff)
      const response = await fetch(fileUrl);
      if (!response.ok) throw new Error('Blob fetch failed');
      
      const blob = await response.blob();
      
      // 2. Create a temporary object URL in browser memory
      const blobUrl = window.URL.createObjectURL(blob);
      
      // 3. Create a hidden anchor tag
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName || 'document';
      document.body.appendChild(link);
      
      // 4. Programmatically click the link
      link.click();
      
      // 5. Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);

    } catch (error) {
      console.warn("Blob fetch failed (CORS/Network). Falling back to Cloudinary Direct Redirect.");
      
      // FALLBACK: Use Cloudinary native attachment flag signal
      if (fileUrl.includes('cloudinary.com')) {
        const parts = fileUrl.split('/upload/');
        if (parts.length === 2) {
          const downloadUrl = `${parts[0]}/upload/fl_attachment/${parts[1]}`;
          window.location.href = downloadUrl;
          return;
        }
      }
      
      // FINAL FALLBACK
      window.open(fileUrl, '_blank');
    } finally {
      // Show "Active" state for a moment for better UX
      setTimeout(() => setIsDownloading(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 lg:p-6 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white border border-white/20 w-full max-w-5xl h-full lg:h-[95vh] lg:rounded-[32px] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="px-6 py-4 flex items-center justify-between border-b border-gray-100 bg-white/80 backdrop-blur-sm z-10">
          <div className="flex items-center gap-4">
            <div className="bg-rose-500 p-2.5 rounded-2xl text-white shadow-lg shadow-rose-100">
              <FileText className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-slate-900 font-bold truncate text-lg leading-tight">{fileName}</h3>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Reliable Image Preview</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={handleDownload}
              disabled={isDownloading}
              className="bg-slate-900 text-white p-2.5 rounded-2xl hover:bg-slate-800 transition-all active:scale-95 disabled:opacity-50 shadow-md"
              title="Download File"
            >
              {isDownloading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
            </button>
            <button 
              onClick={onClose}
              className="p-2.5 text-slate-400 hover:text-slate-900 hover:bg-slate-50 rounded-2xl transition-all active:scale-95"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Viewer Area */}
        <div className="flex-1 overflow-auto bg-slate-100/50 p-4 lg:p-10 flex flex-col items-center gap-6 scroll-smooth">
          <div className="relative group max-w-full">
            <div className="shadow-[0_25px_50px_-12px_rgba(0,0,0,0.15)] rounded-lg bg-white overflow-hidden border border-gray-100">
              <img 
                src={getPreviewUrl(fileUrl, pageNumber)} 
                alt={`Page ${pageNumber}`}
                className={`max-w-full h-auto transition-opacity duration-300 ${isLoading ? 'opacity-30' : 'opacity-100'}`}
                onLoad={() => setIsLoading(false)}
                onError={(e) => {
                    console.error("Preview failed:", e);
                    setIsLoading(false);
                }}
              />
            </div>

            {/* Floating Navigation Overlay */}
            <div className="absolute inset-y-0 left-0 right-0 flex items-center justify-between px-4 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
               <button 
                 onClick={() => { setPageNumber(prev => Math.max(1, prev - 1)); setIsLoading(true); }}
                 className="p-4 bg-white/90 backdrop-blur-md rounded-full shadow-xl pointer-events-auto hover:bg-white active:scale-90 transition-all border border-gray-100"
                 disabled={pageNumber === 1}
               >
                 <ChevronLeft className="w-6 h-6 text-slate-700" />
               </button>
               <button 
                 onClick={() => { setPageNumber(prev => prev + 1); setIsLoading(true); }}
                 className="p-4 bg-white/90 backdrop-blur-md rounded-full shadow-xl pointer-events-auto hover:bg-white active:scale-90 transition-all border border-gray-100"
               >
                 <ChevronRight className="w-6 h-6 text-slate-700" />
               </button>
            </div>
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center gap-4 bg-white p-2 rounded-[24px] shadow-xl border border-gray-100">
            <button 
              onClick={() => { setPageNumber(prev => Math.max(1, prev - 1)); setIsLoading(true); }}
              disabled={pageNumber === 1}
              className="p-3 bg-slate-50 text-slate-600 rounded-2xl hover:bg-slate-100 disabled:opacity-30 transition-all active:scale-95"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex flex-col items-center px-6">
              <span className="text-sm font-bold text-slate-900 tracking-tight">PAGE {pageNumber}</span>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Viewing</span>
            </div>
            <button 
              onClick={() => { setPageNumber(prev => prev + 1); setIsLoading(true); }}
              className="p-3 bg-slate-50 text-slate-600 rounded-2xl hover:bg-slate-100 transition-all active:scale-95"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Helpful Tip */}
          <div className="bg-blue-50/50 border border-blue-100/50 rounded-2xl p-4 max-w-md w-full flex items-start gap-3">
             <div className="bg-blue-600 p-1.5 rounded-lg text-white shrink-0">
               <ExternalLink className="w-3.5 h-3.5" />
             </div>
             <div>
               <p className="text-[11px] font-bold text-blue-900 uppercase tracking-tighter">Automatic Download</p>
               <p className="text-[12px] text-blue-700 leading-snug mt-1">
                 Click the black download button at the top to instantly save this file to your computer.
               </p>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocViewerModal;
