
import React from 'react';
import { Link } from 'react-router-dom';
import { Play, ExternalLink, Clock } from 'lucide-react';

interface ReleaseCardProps {
  id: string;
  title: string;
  artist: string;
  coverArt: string;
  status: 'pending' | 'approved' | 'rejected' | 'processing';
  releaseDate?: string;
  streamingLinks?: { platform: string; url: string }[];
}

const ReleaseCard: React.FC<ReleaseCardProps> = ({
  id,
  title,
  artist,
  coverArt,
  status,
  releaseDate,
  streamingLinks = []
}) => {
  const getStatusColor = () => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-700';
      case 'rejected':
        return 'bg-red-100 text-red-700';
      case 'processing':
        return 'bg-amber-100 text-amber-700';
      default:
        return 'bg-blue-100 text-blue-700';
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
      default:
        return 'Pending';
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
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${getStatusColor()}`}>
            {getStatusLabel()}
          </span>
        </div>
      </div>
      
      <div className="p-4">
        <h3 className="font-medium text-slate-900 truncate" title={title}>{title}</h3>
        <p className="text-sm text-slate-600 mt-1">{artist}</p>
        
        {status === 'approved' && releaseDate && (
          <div className="flex items-center gap-1.5 mt-3 text-xs text-slate-500">
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
                className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1.5 rounded-full flex items-center gap-1.5 transition-colors"
              >
                <span>{link.platform}</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            ))}
            {streamingLinks.length > 3 && (
              <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1.5 rounded-full">
                +{streamingLinks.length - 3} more
              </span>
            )}
          </div>
        )}
        
        <div className="mt-4 pt-3 border-t border-slate-100">
          <Link 
            to={`/releases/${id}`}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium inline-flex items-center gap-1"
          >
            View Details
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ReleaseCard;
