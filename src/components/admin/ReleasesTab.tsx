
import React from 'react';
import { Link } from 'react-router-dom';
import { Check, X, ChevronRight, RefreshCw, Music } from 'lucide-react';
import { updateReleaseStatus } from '@/services/adminService';
import { toast } from 'sonner';

interface ReleasesTabProps {
  releases: any[];
  loading: boolean;
  onReleaseUpdate: (id: string, status: string) => void;
}

const ReleasesTab: React.FC<ReleasesTabProps> = ({ releases, loading, onReleaseUpdate }) => {
  const handleReleaseAction = async (id: string, status: string) => {
    const result = await updateReleaseStatus(id, status);
    if (result.success) {
      onReleaseUpdate(id, status);
      toast({
        title: 'Status updated',
        description: `Release status changed to ${status}`,
        variant: 'default'
      });
    } else {
      toast({
        title: 'Update failed',
        description: 'Could not update release status',
        variant: 'destructive'
      });
    }
  };

  if (loading) {
    return <div className="py-8 text-center text-gray-500">Loading releases...</div>;
  }

  if (releases.length === 0) {
    return (
      <div className="py-12 text-center">
        <Music className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-xl font-semibold text-gray-900">No releases found</h3>
        <p className="text-gray-500">There are no music releases in the system yet.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left">
        <thead className="text-xs text-gray-700 uppercase bg-gray-50">
          <tr>
            <th scope="col" className="px-4 py-3">Title</th>
            <th scope="col" className="px-4 py-3">Artist</th>
            <th scope="col" className="px-4 py-3">Status</th>
            <th scope="col" className="px-4 py-3">Release Date</th>
            <th scope="col" className="px-4 py-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {releases.map((release) => (
            <tr key={release.id} className="bg-white border-b hover:bg-gray-50">
              <td className="px-4 py-4 font-medium text-gray-900 flex items-center">
                {release.cover_art_url && (
                  <img 
                    src={release.cover_art_url} 
                    alt={release.title}
                    className="w-10 h-10 mr-3 object-cover rounded-sm"
                  />
                )}
                <span>{release.title}</span>
              </td>
              <td className="px-4 py-4">
                {release.artists?.name || "Unknown Artist"}
              </td>
              <td className="px-4 py-4">
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  release.status === 'Approved' ? 'bg-green-100 text-green-800' :
                  release.status === 'Rejected' ? 'bg-red-100 text-red-800' :
                  release.status === 'Processing' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-blue-100 text-blue-800'
                }`}>
                  {release.status}
                </span>
              </td>
              <td className="px-4 py-4">
                {new Date(release.release_date).toLocaleDateString()}
              </td>
              <td className="px-4 py-4">
                <div className="flex space-x-2">
                  {release.status === 'Pending' && (
                    <>
                      <button 
                        onClick={() => handleReleaseAction(release.id, 'Approved')}
                        className="px-2 py-1 bg-green-500 text-white rounded-md hover:bg-green-600"
                        title="Approve"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleReleaseAction(release.id, 'Rejected')}
                        className="px-2 py-1 bg-red-500 text-white rounded-md hover:bg-red-600"
                        title="Reject"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </>
                  )}
                  {release.status === 'Approved' && (
                    <button 
                      onClick={() => handleReleaseAction(release.id, 'Processing')}
                      className="px-2 py-1 bg-yellow-500 text-white rounded-md hover:bg-yellow-600"
                      title="Mark as Processing"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  )}
                  <Link 
                    to={`/releases/${release.id}`}
                    className="px-2 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                    title="View Details"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ReleasesTab;
