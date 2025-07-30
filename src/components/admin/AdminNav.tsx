
import React from 'react';
import { Music, DollarSign, Users, BarChart3, AlertTriangle, CreditCard } from 'lucide-react';

interface AdminNavProps {
  activeTab: string;
  takeDownRequestsCount: number;
  onTabChange: (tab: string) => void;
}

const AdminNav: React.FC<AdminNavProps> = ({ activeTab, takeDownRequestsCount, onTabChange }) => {
  return (
    <div className="mb-6 border-b border-slate-200 dark:border-slate-700">
      <div className="overflow-x-auto">
        <ul className="flex flex-nowrap min-w-full -mb-px text-sm font-medium text-center">
          <li className="mr-2">
            <button
              className={`inline-block p-4 border-b-2 rounded-t-lg ${
                activeTab === 'releases' 
                  ? 'text-violet-600 dark:text-violet-400 border-violet-600 dark:border-violet-400' 
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-800 hover:border-gray-300 dark:hover:text-gray-300 dark:hover:border-gray-700'
              }`}
              onClick={() => onTabChange('releases')}
            >
              <div className="flex items-center whitespace-nowrap">
                <Music className="w-4 h-4 mr-2" />
                Releases
              </div>
            </button>
          </li>
          <li className="mr-2">
            <button
              className={`inline-block p-4 border-b-2 rounded-t-lg ${
                activeTab === 'withdrawals' 
                  ? 'text-violet-600 dark:text-violet-400 border-violet-600 dark:border-violet-400' 
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-800 hover:border-gray-300 dark:hover:text-gray-300 dark:hover:border-gray-700'
              }`}
              onClick={() => onTabChange('withdrawals')}
            >
              <div className="flex items-center whitespace-nowrap">
                <DollarSign className="w-4 h-4 mr-2" />
                Withdrawals
              </div>
            </button>
          </li>
          <li className="mr-2">
            <button
              className={`inline-block p-4 border-b-2 rounded-t-lg ${
                activeTab === 'artists' 
                  ? 'text-violet-600 dark:text-violet-400 border-violet-600 dark:border-violet-400' 
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-800 hover:border-gray-300 dark:hover:text-gray-300 dark:hover:border-gray-700'
              }`}
              onClick={() => onTabChange('artists')}
            >
              <div className="flex items-center whitespace-nowrap">
                <Users className="w-4 h-4 mr-2" />
                Artists
              </div>
            </button>
          </li>
          <li className="mr-2">
            <button
              className={`inline-block p-4 border-b-2 rounded-t-lg ${
                activeTab === 'analytics' 
                  ? 'text-violet-600 dark:text-violet-400 border-violet-600 dark:border-violet-400' 
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-800 hover:border-gray-300 dark:hover:text-gray-300 dark:hover:border-gray-700'
              }`}
              onClick={() => onTabChange('analytics')}
            >
              <div className="flex items-center whitespace-nowrap">
                <BarChart3 className="w-4 h-4 mr-2" />
                Analytics
              </div>
            </button>
          </li>
          <li className="mr-2">
            <button
              className={`inline-block p-4 border-b-2 rounded-t-lg ${
                activeTab === 'subscriptions' 
                  ? 'text-violet-600 dark:text-violet-400 border-violet-600 dark:border-violet-400' 
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-800 hover:border-gray-300 dark:hover:text-gray-300 dark:hover:border-gray-700'
              }`}
              onClick={() => onTabChange('subscriptions')}
            >
              <div className="flex items-center whitespace-nowrap">
                <CreditCard className="w-4 h-4 mr-2" />
                Subscriptions
              </div>
            </button>
          </li>
          <li className="mr-2">
            <button
              className={`inline-block p-4 border-b-2 rounded-t-lg ${
                activeTab === 'takedown' 
                  ? 'text-violet-600 dark:text-violet-400 border-violet-600 dark:border-violet-400' 
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-800 hover:border-gray-300 dark:hover:text-gray-300 dark:hover:border-gray-700'
              }`}
              onClick={() => onTabChange('takedown')}
            >
              <div className="flex items-center whitespace-nowrap">
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
    </div>
  );
};

export default AdminNav;
