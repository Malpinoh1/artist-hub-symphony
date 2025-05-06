
import React from 'react';
import { Music, DollarSign, Users, BarChart3, AlertTriangle } from 'lucide-react';

interface AdminNavProps {
  activeTab: string;
  takeDownRequestsCount: number;
  onTabChange: (tab: string) => void;
}

const AdminNav: React.FC<AdminNavProps> = ({ activeTab, takeDownRequestsCount, onTabChange }) => {
  return (
    <div className="mb-6 border-b border-slate-200 dark:border-slate-700">
      <ul className="flex flex-wrap -mb-px text-sm font-medium text-center">
        <li className="mr-2">
          <button
            className={`inline-block p-4 border-b-2 rounded-t-lg ${
              activeTab === 'releases' 
                ? 'text-blue-600 dark:text-blue-400 border-blue-600 dark:border-blue-400' 
                : 'border-transparent hover:text-gray-600 hover:border-gray-300 dark:hover:text-gray-400 dark:hover:border-gray-700'
            }`}
            onClick={() => onTabChange('releases')}
          >
            <div className="flex items-center">
              <Music className="w-4 h-4 mr-2" />
              Releases
            </div>
          </button>
        </li>
        <li className="mr-2">
          <button
            className={`inline-block p-4 border-b-2 rounded-t-lg ${
              activeTab === 'withdrawals' 
                ? 'text-blue-600 dark:text-blue-400 border-blue-600 dark:border-blue-400' 
                : 'border-transparent hover:text-gray-600 hover:border-gray-300 dark:hover:text-gray-400 dark:hover:border-gray-700'
            }`}
            onClick={() => onTabChange('withdrawals')}
          >
            <div className="flex items-center">
              <DollarSign className="w-4 h-4 mr-2" />
              Withdrawals
            </div>
          </button>
        </li>
        <li className="mr-2">
          <button
            className={`inline-block p-4 border-b-2 rounded-t-lg ${
              activeTab === 'artists' 
                ? 'text-blue-600 dark:text-blue-400 border-blue-600 dark:border-blue-400' 
                : 'border-transparent hover:text-gray-600 hover:border-gray-300 dark:hover:text-gray-400 dark:hover:border-gray-700'
            }`}
            onClick={() => onTabChange('artists')}
          >
            <div className="flex items-center">
              <Users className="w-4 h-4 mr-2" />
              Artists
            </div>
          </button>
        </li>
        <li className="mr-2">
          <button
            className={`inline-block p-4 border-b-2 rounded-t-lg ${
              activeTab === 'analytics' 
                ? 'text-blue-600 dark:text-blue-400 border-blue-600 dark:border-blue-400' 
                : 'border-transparent hover:text-gray-600 hover:border-gray-300 dark:hover:text-gray-400 dark:hover:border-gray-700'
            }`}
            onClick={() => onTabChange('analytics')}
          >
            <div className="flex items-center">
              <BarChart3 className="w-4 h-4 mr-2" />
              Analytics
            </div>
          </button>
        </li>
        <li className="mr-2">
          <button
            className={`inline-block p-4 border-b-2 rounded-t-lg ${
              activeTab === 'takedown' 
                ? 'text-blue-600 dark:text-blue-400 border-blue-600 dark:border-blue-400' 
                : 'border-transparent hover:text-gray-600 hover:border-gray-300 dark:hover:text-gray-400 dark:hover:border-gray-700'
            }`}
            onClick={() => onTabChange('takedown')}
          >
            <div className="flex items-center">
              <AlertTriangle className="w-4 h-4 mr-2" />
              Take Down Requests
              {takeDownRequestsCount > 0 && (
                <span className="ml-2 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  {takeDownRequestsCount}
                </span>
              )}
            </div>
          </button>
        </li>
      </ul>
    </div>
  );
};

export default AdminNav;
