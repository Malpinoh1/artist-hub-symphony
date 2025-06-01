
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
    <div className="mt-6 p-4 bg-white rounded-lg border border-gray-200">
      <h3 className="text-sm font-medium mb-3 flex items-center text-black">
        <FileText className="w-4 h-4 mr-2 text-gray-500" />
        Release Information
      </h3>
      
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-500">UPC:</span>
          <span className="font-medium text-black">
            {release.upc || 'Not assigned'}
          </span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-gray-500">ISRC:</span>
          <span className="font-medium text-black">
            {release.isrc || 'Not assigned'}
          </span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-gray-500">Status:</span>
          <span className={`font-medium px-2 py-0.5 rounded-full text-xs ${getStatusColor()}`}>
            {getStatusLabel()}
          </span>
        </div>
      </div>
    </div>
  );
};

export default ReleaseIdentifiers;
