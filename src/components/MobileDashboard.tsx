
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Music, 
  TrendingUp, 
  DollarSign, 
  Users, 
  Plus,
  Activity,
  Calendar,
  PlayCircle,
  Upload
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface MobileDashboardProps {
  stats: {
    totalReleases: number;
    activeReleases: number;
    totalPlays: number;
    totalEarnings: number;
  };
  releases: any[];
  loading: boolean;
}

const MobileDashboard: React.FC<MobileDashboardProps> = ({ stats, releases, loading }) => {
  const navigate = useNavigate();

  const quickActions = [
    {
      icon: Upload,
      label: 'New Release',
      description: 'Upload your music',
      action: () => navigate('/release/new'),
      color: 'bg-blue-500'
    },
    {
      icon: Activity,
      label: 'Analytics',
      description: 'View performance',
      action: () => navigate('/analytics'),
      color: 'bg-green-500'
    },
    {
      icon: DollarSign,
      label: 'Earnings',
      description: 'Check revenue',
      action: () => navigate('/earnings'),
      color: 'bg-purple-500'
    },
    {
      icon: Users,
      label: 'Settings',
      description: 'Manage account',
      action: () => navigate('/settings'),
      color: 'bg-orange-500'
    }
  ];

  const statCards = [
    {
      title: 'Total Releases',
      value: stats.totalReleases,
      icon: Music,
      color: 'text-blue-600'
    },
    {
      title: 'Total Plays',
      value: stats.totalPlays.toLocaleString(),
      icon: PlayCircle,
      color: 'text-green-600'
    },
    {
      title: 'Active Releases',
      value: stats.activeReleases,
      icon: TrendingUp,
      color: 'text-purple-600'
    },
    {
      title: 'Total Earnings',
      value: `$${stats.totalEarnings.toFixed(2)}`,
      icon: DollarSign,
      color: 'text-orange-600'
    }
  ];

  if (loading) {
    return (
      <div className="space-y-4">
        {/* Stats skeleton */}
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white p-4 rounded-xl shadow-sm border animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-6 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
        
        {/* Quick actions skeleton */}
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white p-4 rounded-xl shadow-sm border animate-pulse">
              <div className="h-12 w-12 bg-gray-200 rounded-full mb-3"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Grid - Mobile Optimized */}
      <div className="grid grid-cols-2 gap-3">
        {statCards.map((stat) => {
          const IconComponent = stat.icon;
          return (
            <Card key={stat.title} className="border-0 shadow-sm bg-white">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-600 font-medium uppercase tracking-wide">
                      {stat.title}
                    </p>
                    <p className="text-lg font-bold mt-1">{stat.value}</p>
                  </div>
                  <div className={`p-2 rounded-lg bg-gray-50 ${stat.color}`}>
                    <IconComponent size={20} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick Actions Grid */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Quick Actions</CardTitle>
          <CardDescription>Manage your music distribution</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map((action) => {
              const IconComponent = action.icon;
              return (
                <button
                  key={action.label}
                  onClick={action.action}
                  className="p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors text-left"
                >
                  <div className={`w-10 h-10 ${action.color} rounded-lg flex items-center justify-center mb-2`}>
                    <IconComponent size={20} className="text-white" />
                  </div>
                  <h3 className="font-medium text-sm">{action.label}</h3>
                  <p className="text-xs text-gray-600 mt-1">{action.description}</p>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Recent Releases */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Music size={20} />
            Recent Releases
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {releases.length === 0 ? (
            <div className="text-center py-8">
              <Music className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <h3 className="font-medium text-gray-900 mb-2">No releases yet</h3>
              <p className="text-sm text-gray-600 mb-4">
                Start your music distribution journey
              </p>
              <Button onClick={() => navigate('/release/new')} size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Upload Release
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {releases.slice(0, 3).map((release) => (
                <div
                  key={release.id}
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                >
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                    <Music size={16} className="text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm truncate">{release.title}</h4>
                    <p className="text-xs text-gray-600 truncate">{release.artist}</p>
                  </div>
                  <div className="text-right">
                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                      release.status === 'approved' ? 'bg-green-100 text-green-800' :
                      release.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {release.status}
                    </span>
                  </div>
                </div>
              ))}
              {releases.length > 3 && (
                <Button variant="outline" className="w-full mt-4" size="sm">
                  View All ({releases.length})
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MobileDashboard;
