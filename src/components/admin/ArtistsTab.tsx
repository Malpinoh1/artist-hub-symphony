
import React from 'react';
import { Link } from 'react-router-dom';
import { Check, Ban, ChevronRight, Users } from 'lucide-react';
import { updateArtistStatus } from '@/services/adminService';
import { toast } from 'sonner';

interface ArtistsTabProps {
  artists: any[];
  loading: boolean;
  onArtistUpdate: (id: string, status: string) => void;
}

const ArtistsTab: React.FC<ArtistsTabProps> = ({ artists, loading, onArtistUpdate }) => {
  const handleArtistStatusChange = async (id: string, status: string) => {
    const result = await updateArtistStatus(id, status);
    if (result.success) {
      onArtistUpdate(id, status);
      toast({
        title: 'Status updated',
        description: `Artist status changed to ${status}`,
        variant: 'default'
      });
    } else {
      toast({
        title: 'Update failed',
        description: 'Could not update artist status',
        variant: 'destructive'
      });
    }
  };

  if (loading) {
    return <div className="py-8 text-center text-gray-500">Loading artists...</div>;
  }

  if (artists.length === 0) {
    return (
      <div className="py-12 text-center">
        <Users className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-xl font-semibold text-gray-900">No artists found</h3>
        <p className="text-gray-500">There are no artists registered in the system yet.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left">
        <thead className="text-xs text-gray-700 uppercase bg-gray-50">
          <tr>
            <th scope="col" className="px-4 py-3">Name</th>
            <th scope="col" className="px-4 py-3">Email</th>
            <th scope="col" className="px-4 py-3">Phone</th>
            <th scope="col" className="px-4 py-3">Balance</th>
            <th scope="col" className="px-4 py-3">Status</th>
            <th scope="col" className="px-4 py-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {artists.map((artist) => (
            <tr key={artist.id} className="bg-white border-b hover:bg-gray-50">
              <td className="px-4 py-4 font-medium text-gray-900">
                {artist.name}
              </td>
              <td className="px-4 py-4">
                {artist.email}
              </td>
              <td className="px-4 py-4">
                {artist.phone || 'N/A'}
              </td>
              <td className="px-4 py-4">
                ₦{(artist.available_balance || 0).toLocaleString()}
              </td>
              <td className="px-4 py-4">
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  artist.status === 'active' ? 'bg-green-100 text-green-800' : 
                  artist.status === 'banned' ? 'bg-red-100 text-red-800' : 
                  'bg-gray-100 text-gray-800'
                }`}>
                  {artist.status || 'active'}
                </span>
              </td>
              <td className="px-4 py-4">
                <div className="flex space-x-2">
                  {artist.status !== 'active' ? (
                    <button 
                      onClick={() => handleArtistStatusChange(artist.id, 'active')}
                      className="px-2 py-1 bg-green-500 text-white rounded-md hover:bg-green-600"
                      title="Activate"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  ) : (
                    <button 
                      onClick={() => handleArtistStatusChange(artist.id, 'banned')}
                      className="px-2 py-1 bg-red-500 text-white rounded-md hover:bg-red-600"
                      title="Ban"
                    >
                      <Ban className="w-4 h-4" />
                    </button>
                  )}
                  <Link 
                    to={`/artists/${artist.id}`}
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

export default ArtistsTab;
