
import React, { useState } from 'react';

interface CollapsiblePanelProps {
  title: string;
  position: 'top-center' | 'bottom-left' | 'top-right';
  children: React.ReactNode;
  defaultCollapsed?: boolean;
}

const positionClasses: Record<string, string> = {
    'top-center': 'top-4 inset-x-0 mx-auto items-center',
    'bottom-left': 'bottom-4 left-4 items-start',
    'top-right': 'top-4 right-4 items-end',
};

export const CollapsiblePanel: React.FC<CollapsiblePanelProps> = ({ title, position, children, defaultCollapsed = false }) => {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  
  // Don't render anything if there are no children to display
  if (!React.Children.count(children)) {
    return null;
  }

  return (
    <div className={`absolute z-30 flex flex-col pointer-events-auto w-fit max-w-full ${positionClasses[position]}`}>
      <div 
        className="bg-slate-900/90 border border-slate-700 rounded-t-lg px-4 py-2 cursor-pointer flex justify-between items-center select-none min-w-[200px]"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-wider">{title}</h3>
        <span className="text-cyan-400 text-lg transform transition-transform ml-4">{isCollapsed ? '⊕' : '⊖'}</span>
      </div>
      {!isCollapsed && (
        <div className="animate-fade-in-down">
          {children}
        </div>
      )}
    </div>
  );
};
