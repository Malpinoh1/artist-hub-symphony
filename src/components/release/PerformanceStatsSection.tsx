
import React from 'react';
import { Music } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PerformanceStatistics } from '@/services/statisticsService';

interface PerformanceStatsSectionProps {
  statistics: PerformanceStatistics | null;
  isAdmin: boolean;
  onShowStatsForm: () => void;
}

const PerformanceStatsSection: React.FC<PerformanceStatsSectionProps> = ({
  statistics,
  isAdmin,
  onShowStatsForm
}) => {
  return (
    <div className="glass-panel p-6 md:p-8 mb-8">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold flex items-center dark:text-slate-200">
          <Music className="mr-2 h-5 w-5 text-blue-600 dark:text-blue-400" />
          Performance Statistics
        </h2>
        
        {isAdmin && (
          <Button 
            variant="outline" 
            size="sm"
            onClick={onShowStatsForm}
          >
            Update Statistics
          </Button>
        )}
      </div>
      
      {statistics ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
            <h4 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Total Streams</h4>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{statistics.total_streams?.toLocaleString() || '0'}</p>
          </div>
          
          <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
            <h4 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Spotify</h4>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{statistics.spotify_streams?.toLocaleString() || '0'}</p>
          </div>
          
          <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
            <h4 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Apple Music</h4>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{statistics.apple_music_streams?.toLocaleString() || '0'}</p>
          </div>
          
          <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
            <h4 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Last Updated</h4>
            <p className="text-sm font-medium text-slate-900 dark:text-white">
              {new Date(statistics.date).toLocaleDateString()}
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700">
          <p className="text-slate-600 dark:text-slate-400">
            Performance statistics will be available after your release has accumulated streaming activity.
          </p>
        </div>
      )}
    </div>
  );
};

export default PerformanceStatsSection;
