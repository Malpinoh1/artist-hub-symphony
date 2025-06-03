
import React from 'react';

interface AdminTabNavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  takeDownRequestsCount: number;
}

const AdminTabNavigation: React.FC<AdminTabNavigationProps> = ({
  activeTab,
  onTabChange,
  takeDownRequestsCount
}) => {
  const tabs = [
    { id: 'releases', label: 'Releases' },
    { id: 'withdrawals', label: 'Withdrawals' },
    { id: 'artists', label: 'Artists' },
    { id: 'earnings', label: 'Earnings Summary' },
    { id: 'analytics', label: 'Analytics' },
    { id: 'takedown', label: 'Take Down Requests', badge: takeDownRequestsCount }
  ];

  return (
    <div className="border-b border-gray-200 mb-6">
      <div className="flex overflow-x-auto space-x-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`px-4 py-2 border-b-2 whitespace-nowrap flex items-center ${
              activeTab === tab.id
                ? 'border-blue-500 text-blue-600 font-medium'
                : 'border-transparent hover:text-blue-500'
            }`}
          >
            <span>{tab.label}</span>
            {tab.badge && tab.badge > 0 && (
              <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-red-100 text-red-700">
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

export default AdminTabNavigation;
