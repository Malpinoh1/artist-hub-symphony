
import React from 'react';
import { Calendar, Download, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { themeClass } from '@/lib/utils';
import { Release } from '@/services/releaseService';
import { downloadReleaseAssets } from '@/services/assetsService';

interface ReleaseHeaderProps {
  release: Release;
  isArtist: boolean;
  onShowTakeDownForm: () => void;
  takeDownRequest: any;
}

const ReleaseHeader: React.FC<ReleaseHeaderProps> = ({ 
  release, 
  isArtist, 
  onShowTakeDownForm,
  takeDownRequest
}) => {
  const getStatusColor = () => {
    switch (release.status) {
      case 'approved':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'rejected':
      case 'takedown':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      case 'processing':
        return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
      case 'takedownrequested':
        return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
      default:
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
    }
  };

  const getStatusLabel = () => {
    switch (release.status) {
      case 'approved':
        return 'Approved';
      case 'rejected':
        return 'Rejected';
      case 'processing':
        return 'Processing';
      case 'takedown':
        return 'Removed';
      case 'takedownrequested':
        return 'Removal Requested';
      default:
        return 'Pending';
    }
  };
  
  const handleDownloadAssets = () => {
    downloadReleaseAssets(release.id, `${release.title} - ${release.artist}`);
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-3 mb-2">
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${getStatusColor()}`}>
          {getStatusLabel()}
        </span>
        
        {release.releaseDate && (
          <div className="flex items-center text-sm text-slate-500 dark:text-slate-400">
            <Calendar className="w-4 h-4 mr-1" />
            Release Date: {new Date(release.releaseDate).toLocaleDateString()}
          </div>
        )}
      </div>
      
      <h1 className="text-3xl md:text-4xl font-semibold mb-2 text-slate-900 dark:text-slate-50">{release.title}</h1>
      <h2 className="text-xl text-slate-700 dark:text-slate-300 mb-6">{release.artist}</h2>
      
      {/* Release Actions */}
      {release.status === 'approved' && (
        <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
          <div className="flex gap-3 flex-wrap">
            <Button 
              variant="default" 
              className="inline-flex items-center gap-2"
            >
              <Share2 className="w-4 h-4" />
              Share
            </Button>
            
            <Button
              variant="outline"
              className={themeClass(
                "bg-white border border-slate-200 hover:bg-slate-50",
                "bg-slate-800 border-slate-700 hover:bg-slate-700"
              )}
              onClick={handleDownloadAssets}
            >
              <Download className="w-4 h-4 mr-2" />
              Download Assets
            </Button>
          </div>
        </div>
      )}
    </>
  );
};

export default ReleaseHeader;
