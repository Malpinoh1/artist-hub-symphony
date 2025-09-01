import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Music, Users, ExternalLink, MoreVertical, Eye } from 'lucide-react';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { ReleaseEditRequest } from './ReleaseEditRequest';
import { Link } from 'react-router-dom';

interface Release {
  id: string;
  title: string;
  release_type?: string;
  genre?: string;
  status: string;
  release_date?: string;
  cover_art_url?: string;
  description?: string;
  total_tracks?: number;
  created_at?: string;
  platforms?: string[];
  artist_id?: string;
  // Legacy support
  artist?: string;
  coverArt?: string;
  releaseDate?: string;
  streamingLinks?: { platform: string; url: string }[];
  upc?: string;
  isrc?: string;
}

interface ReleaseCardProps {
  release?: Release;
  // Legacy props support
  id?: string;
  title?: string;
  artist?: string;
  coverArt?: string;
  status?: string;
  releaseDate?: string;
  streamingLinks?: { platform: string; url: string }[];
  upc?: string;
  isrc?: string;
  onUpdate?: () => void;
}

export default function ReleaseCard({ 
  release, 
  onUpdate,
  // Legacy props
  id,
  title,
  artist,
  coverArt,
  status,
  releaseDate,
  streamingLinks,
  upc,
  isrc
}: ReleaseCardProps) {
  const [showEditRequest, setShowEditRequest] = useState(false);

  // Support both new and legacy formats
  const releaseData = release || {
    id: id!,
    title: title!,
    artist_id: '',
    status: status!,
    release_date: releaseDate!,
    cover_art_url: coverArt,
    platforms: streamingLinks?.map(link => link.platform) || [],
    upc,
    isrc,
    release_type: 'single',
    total_tracks: 1,
    created_at: new Date().toISOString()
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'takedown': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getReleaseTypeIcon = (type?: string) => {
    switch (type) {
      case 'album': return '💿';
      case 'ep': return '💽';
      case 'single': return '🎵';
      default: return '🎵';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const canEdit = releaseData.status === 'Pending' || releaseData.status === 'pending';
  const canRequestEdit = releaseData.status === 'Approved' || releaseData.status === 'approved';

  return (
    <Card className="group hover:shadow-lg transition-all duration-200">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3">
            {releaseData.cover_art_url ? (
              <img 
                src={releaseData.cover_art_url}
                alt={releaseData.title}
                className="w-16 h-16 rounded-lg object-cover bg-muted"
              />
            ) : (
              <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center text-2xl">
                {getReleaseTypeIcon(releaseData.release_type)}
              </div>
            )}
            
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg leading-tight">
                {releaseData.title}
              </CardTitle>
              <div className="flex items-center gap-2 mt-1">
                {releaseData.release_type && (
                  <Badge variant="outline" className="text-xs">
                    {releaseData.release_type.toUpperCase()}
                  </Badge>
                )}
                <Badge className={`text-xs ${getStatusColor(releaseData.status)}`}>
                  {releaseData.status}
                </Badge>
              </div>
            </div>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link to={`/releases/${releaseData.id}`}>
                  <Eye className="h-4 w-4 mr-2" />
                  View Details
                </Link>
              </DropdownMenuItem>
              {(canEdit || canRequestEdit) && (
                <DropdownMenuItem onClick={() => setShowEditRequest(true)}>
                  <Music className="h-4 w-4 mr-2" />
                  {canEdit ? 'Edit Release' : 'Request Edit'}
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="space-y-3">
          {releaseData.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {releaseData.description}
            </p>
          )}
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">
                {releaseData.release_date && formatDate(releaseData.release_date)}
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <Music className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">
                {releaseData.total_tracks || 1} track{(releaseData.total_tracks || 1) !== 1 ? 's' : ''}
              </span>
            </div>
            
            {releaseData.genre && (
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">
                  {releaseData.genre}
                </span>
              </div>
            )}
            
            {releaseData.platforms && releaseData.platforms.length > 0 && (
              <div className="flex items-center gap-2">
                <ExternalLink className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">
                  {releaseData.platforms.length} platform{releaseData.platforms.length !== 1 ? 's' : ''}
                </span>
              </div>
            )}
          </div>

          {releaseData.platforms && releaseData.platforms.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-3">
              {releaseData.platforms.slice(0, 3).map((platform) => (
                <Badge key={platform} variant="secondary" className="text-xs">
                  {platform}
                </Badge>
              ))}
              {releaseData.platforms.length > 3 && (
                <Badge variant="secondary" className="text-xs">
                  +{releaseData.platforms.length - 3} more
                </Badge>
              )}
            </div>
          )}

          {/* Legacy streaming links support */}
          {streamingLinks && streamingLinks.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-3">
              {streamingLinks.slice(0, 3).map((link) => (
                <Badge key={link.platform} variant="secondary" className="text-xs">
                  {link.platform}
                </Badge>
              ))}
              {streamingLinks.length > 3 && (
                <Badge variant="secondary" className="text-xs">
                  +{streamingLinks.length - 3} more
                </Badge>
              )}
            </div>
          )}
        </div>

        <div className="flex gap-2 mt-4">
          <Button variant="outline" size="sm" asChild className="flex-1">
            <Link to={`/releases/${releaseData.id}`}>
              View Details
            </Link>
          </Button>
          
          {(canEdit || canRequestEdit) && (
            <Button variant="outline" size="sm" onClick={() => setShowEditRequest(true)}>
              {canEdit ? 'Edit' : 'Request Edit'}
            </Button>
          )}
        </div>
      </CardContent>

      {showEditRequest && (
        <ReleaseEditRequest
          release={releaseData}
          onRequestSubmitted={() => {
            setShowEditRequest(false);
            onUpdate?.();
          }}
        />
      )}
    </Card>
  );
}