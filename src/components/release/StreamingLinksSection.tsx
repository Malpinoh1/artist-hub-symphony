
import React from 'react';
import { Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StreamingLink } from '@/services/streamingLinksService';

interface StreamingLinksSectionProps {
  streamingLinks: StreamingLink[];
  isAdmin: boolean;
  onShowLinksForm: () => void;
}

const StreamingLinksSection: React.FC<StreamingLinksSectionProps> = ({ 
  streamingLinks, 
  isAdmin, 
  onShowLinksForm 
}) => {
  return (
    <div>
      <h3 className="text-lg font-medium mb-3 flex items-center dark:text-slate-200">
        <Link2 className="w-5 h-5 mr-2 text-blue-600 dark:text-blue-400" />
        Streaming Links
      </h3>
      {streamingLinks && streamingLinks.length > 0 ? (
        <div className="flex flex-wrap gap-3">
          {streamingLinks.map((link, index) => (
            <a 
              key={index}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              <span className="font-medium">{link.platform}</span>
            </a>
          ))}
        </div>
      ) : (
        <p className="text-slate-500 dark:text-slate-400">
          No streaming links available yet.
        </p>
      )}
      
      {isAdmin && (
        <Button 
          variant="outline" 
          size="sm" 
          className="mt-3"
          onClick={onShowLinksForm}
        >
          Manage Streaming Links
        </Button>
      )}
    </div>
  );
};

export default StreamingLinksSection;
