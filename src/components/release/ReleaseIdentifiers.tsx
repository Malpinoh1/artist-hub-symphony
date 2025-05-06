
import React from 'react';
import { FileText } from 'lucide-react';
import { Release } from '@/services/releaseService';

interface ReleaseIdentifiersProps {
  release: Release;
  getStatusColor: () => string;
  getStatusLabel: () => string;
}

const ReleaseIdentifiers: React.FC<ReleaseIdentifiersProps> = ({ 
  release, 
  getStatusColor, 
  getStatusLabel 
}) => {
  return (
    <div className="mt-6 p-4 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
      <h3 className="text-sm font-medium mb-3 flex items-center dark:text-slate-200">
        <FileText className="w-4 h-4 mr-2 text-slate-500 dark:text-slate-400" />
        Release Information
      </h3>
      
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-slate-500 dark:text-slate-400">UPC:</span>
          <span className="font-medium text-slate-700 dark:text-slate-300">{release.upc}</span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-slate-500 dark:text-slate-400">ISRC:</span>
          <span className="font-medium text-slate-700 dark:text-slate-300">{release.isrc}</span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-slate-500 dark:text-slate-400">Status:</span>
          <span className={`font-medium px-2 py-0.5 rounded-full text-xs ${getStatusColor()}`}>
            {getStatusLabel()}
          </span>
        </div>
      </div>
    </div>
  );
};

export default ReleaseIdentifiers;
