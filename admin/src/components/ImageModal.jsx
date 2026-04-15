import React from 'react';
import { X, ZoomIn } from 'lucide-react';

const ImageModal = ({ isOpen, imageSrc, onClose }) => {
  if (!isOpen || !imageSrc) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      ></div>

      {/* Modal panel */}
      <div className="relative bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white/50 backdrop-blur-md absolute top-0 left-0 right-0 z-10 w-full">
          <div className="flex items-center space-x-2 text-slate-800 font-semibold">
            <ZoomIn className="w-5 h-5 text-primary" />
            <span>Payment Screenshot Proof</span>
          </div>
          <button 
            onClick={onClose}
            className="p-2 -mr-2 rounded-full text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto bg-slate-50/50 p-6 pt-20 flex items-center justify-center">
          <img 
            src={imageSrc} 
            alt="Payment Proof" 
            className="max-w-full h-auto object-contain rounded-lg shadow-sm border border-slate-200"
            style={{ maxHeight: 'calc(90vh - 100px)' }}
          />
        </div>
      </div>
    </div>
  );
};

export default ImageModal;
