
import React from 'react';
import { TableCell, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { MoreVertical, Pencil, Barcode, BarChart, Link } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from '@/components/ui/button';
import { Release } from '@/services/adminService';

interface ReleasesTableRowProps {
  release: Release;
  onStatusUpdate: (release: Release) => void;
  onIdentifiersUpdate: (release: Release) => void;
  onStatsUpdate: (release: Release) => void;
  onLinksUpdate: (release: Release) => void;
}

const ReleasesTableRow: React.FC<ReleasesTableRowProps> = ({
  release,
  onStatusUpdate,
  onIdentifiersUpdate,
  onStatsUpdate,
  onLinksUpdate
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Approved':
        return 'bg-green-100 text-green-700';
      case 'Rejected':
      case 'TakeDown':
        return 'bg-red-100 text-red-700';
      case 'TakeDownRequested':
        return 'bg-orange-100 text-orange-700';
      case 'Processing':
        return 'bg-amber-100 text-amber-700';
      default:
        return 'bg-blue-100 text-blue-700';
    }
  };

  return (
    <TableRow key={release.id}>
      <TableCell className="font-medium">{release.id.substring(0, 8)}...</TableCell>
      <TableCell>{release.title}</TableCell>
      <TableCell>{release.artists?.[0]?.name || 'Unknown'}</TableCell>
      <TableCell>{new Date(release.release_date).toLocaleDateString()}</TableCell>
      <TableCell>{release.upc || 'Not assigned'}</TableCell>
      <TableCell>{release.isrc || 'Not assigned'}</TableCell>
      <TableCell>
        <Badge 
          className={`cursor-pointer ${getStatusColor(release.status)}`}
          onClick={() => onStatusUpdate(release)}
        >
          {release.status}
        </Badge>
      </TableCell>
      <TableCell className="text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Manage Release</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => onStatusUpdate(release)}
              className="text-violet-600 font-medium"
            >
              <Pencil className="mr-2 h-4 w-4" />
              Update Status
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onIdentifiersUpdate(release)}
            >
              <Barcode className="mr-2 h-4 w-4" />
              Update Identifiers
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onStatsUpdate(release)}
            >
              <BarChart className="mr-2 h-4 w-4" />
              Update Analytics
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onLinksUpdate(release)}
            >
              <Link className="mr-2 h-4 w-4" />
              Update Streaming Links
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
};

export default ReleasesTableRow;
