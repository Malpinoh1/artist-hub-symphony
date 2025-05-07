
import React from 'react';
import {
  ColumnDef,
  flexRender,
  useReactTable,
  getCoreRowModel,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Artist, updateArtistStatus } from '@/services/adminService';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

interface ArtistsTabProps {
  artists: Artist[];
  loading: boolean;
  onArtistUpdate: (id: string, status: string) => void;
}

const ArtistsTab: React.FC<ArtistsTabProps> = ({
  artists,
  loading,
  onArtistUpdate
}) => {
  const columns: ColumnDef<Artist>[] = [
    {
      accessorKey: "id",
      header: "ID",
    },
    {
      accessorKey: "name",
      header: "Name",
    },
    {
      accessorKey: "email",
      header: "Email",
    },
    {
      accessorKey: "status",
      header: "Status",
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const artist = row.original;
        return (
          <div className="flex gap-2">
            <Button 
              variant="outline"
              size="sm"
              onClick={() => handleStatusChange(artist.id, artist.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE')}
            >
              {artist.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
            </Button>
          </div>
        );
      },
    },
  ];

  const table = useReactTable({
    data: artists,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const handleStatusChange = async (artistId: string, status: string) => {
    try {
      const result = await updateArtistStatus(artistId, status);
      
      if (result.success) {
        toast.success('Artist status updated successfully');
        onArtistUpdate(artistId, status);
      } else {
        toast.error('Failed to update artist status');
      }
    } catch (error) {
      console.error('Error updating artist status:', error);
      toast.error('An error occurred while updating status');
    }
  };

  return (
    <div className="w-full">
      <Table>
        <TableCaption>List of all artists.</TableCaption>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                return (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                )
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={columns.length} className="text-center">
                Loading artists...
              </TableCell>
            </TableRow>
          ) : artists.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length} className="text-center">
                No artists found.
              </TableCell>
            </TableRow>
          ) : (
            table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
};

export default ArtistsTab;
