
import React from 'react';
import { EULA_TEXT } from '../data/legal';

interface LegalModalProps {
  onClose: () => void;
}

export const LegalModal: React.FC<LegalModalProps> = ({ onClose }) => {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-12">
       <div className="bg-slate-900 w-full max-w-4xl h-[80vh] rounded-2xl border border-slate-700 shadow-2xl flex flex-col">
          <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-950 rounded-t-2xl">
            <h2 className="text-2xl font-bold text-white">End User License Agreement</h2>
            <button onClick={onClose} className="text-slate-400 hover:text-white text-xl">✕</button>
          </div>
          <div className="flex-1 p-8 overflow-y-auto custom-scrollbar bg-slate-900/50">
             <pre className="text-slate-300 text-xs leading-relaxed whitespace-pre-wrap font-mono">
                {EULA_TEXT}
             </pre>
          </div>
          <div className="p-6 border-t border-slate-800 bg-slate-950 flex justify-end">
             <button 
               onClick={onClose}
               className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2 px-6 rounded-lg transition-colors"
             >
               I Accept & Close
             </button>
          </div>
       </div>
    </div>
  );
};