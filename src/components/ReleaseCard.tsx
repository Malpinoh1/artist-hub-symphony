import React from 'react';
import { Link } from 'react-router-dom';
import { Play, ExternalLink, Clock, AlertTriangle, Download } from 'lucide-react';
import { supabase } from '../integrations/supabase/client';
import { toast } from 'sonner';

interface ReleaseCardProps {
  id: string;
  title: string;
  artist: string;
  coverArt: string;
  status: 'pending' | 'approved' | 'rejected' | 'processing' | 'takedown' | 'takedownrequested';
  releaseDate?: string;
  streamingLinks?: { platform: string; url: string }[];
  upc?: string;
  isrc?: string;
}

const ReleaseCard: React.FC<ReleaseCardProps> = ({
  id,
  title,
  artist,
  coverArt,
  status,
  releaseDate,
  streamingLinks = [],
  upc,
  isrc
}) => {
  const getStatusColor = () => {
    switch (status) {
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
    switch (status) {
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
  
  const getStatusIcon = () => {
    if (status === 'takedownrequested' || status === 'takedown') {
      return <AlertTriangle className="w-3.5 h-3.5 mr-1" />;
    }
    return null;
  };
  
  const handleDownload = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      // Get audio file URL from the release
      const { data, error } = await supabase
        .from('releases')
        .select('audio_file_url')
        .eq('id', id)
        .single();
        
      if (error || !data.audio_file_url) {
        toast.error('No audio file available for download');
        return;
      }
      
      // Create a temporary anchor to download the file
      const link = document.createElement('a');
      link.href = data.audio_file_url;
      link.download = `${title} - ${artist}.mp3`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success('Download started');
    } catch (error) {
      console.error('Error downloading assets:', error);
      toast.error('Failed to download assets');
    }
  };
  
  return (
    <div className="glass-card overflow-hidden group">
      <div className="relative aspect-square">
        <img 
          src={coverArt} 
          alt={title} 
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
          <button className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center transform scale-75 opacity-0 group-hover:opacity-100 group-hover:scale-100 transition-all duration-300">
            <Play className="w-5 h-5 text-slate-900 ml-0.5" />
          </button>
        </div>
        <div className="absolute top-3 right-3">
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full flex items-center ${getStatusColor()}`}>
            {getStatusIcon()}
            {getStatusLabel()}
          </span>
        </div>
      </div>
      
      <div className="p-4">
        <h3 className="font-medium text-slate-900 dark:text-white truncate" title={title}>{title}</h3>
        <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">{artist}</p>
        
        {/* Display UPC/ISRC if available */}
        {(upc || isrc) && status === 'approved' && (
          <div className="mt-3 grid grid-cols-2 gap-1 text-xs text-slate-500 dark:text-slate-400">
            {upc && (
              <div className="truncate" title={`UPC: ${upc}`}>
                <span className="font-medium">UPC:</span> {upc}
              </div>
            )}
            {isrc && (
              <div className="truncate" title={`ISRC: ${isrc}`}>
                <span className="font-medium">ISRC:</span> {isrc}
              </div>
            )}
          </div>
        )}
        
        {status === 'approved' && releaseDate && (
          <div className="flex items-center gap-1.5 mt-3 text-xs text-slate-500 dark:text-slate-400">
            <Clock className="w-3.5 h-3.5" />
            <span>Released: {new Date(releaseDate).toLocaleDateString()}</span>
          </div>
        )}
        
        {status === 'approved' && streamingLinks.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {streamingLinks.slice(0, 3).map((link, index) => (
              <a 
                key={index}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 px-2.5 py-1.5 rounded-full flex items-center gap-1.5 transition-colors"
              >
                <span>{link.platform}</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            ))}
            {streamingLinks.length > 3 && (
              <span className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2.5 py-1.5 rounded-full">
                +{streamingLinks.length - 3} more
              </span>
            )}
          </div>
        )}
        
        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700 flex justify-between">
          <Link 
            to={`/releases/${id}`}
            className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium inline-flex items-center gap-1"
          >
            View Details
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
          </Link>
          
          {status === 'approved' && (
            <button 
              onClick={handleDownload}
              title="Download Assets"
              className="text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
            >
              <Download className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReleaseCard;
