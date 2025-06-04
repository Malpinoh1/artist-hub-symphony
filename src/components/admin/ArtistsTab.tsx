
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
  onArtistUpdate: (id: string, status: string, updatedData?: any) => void;
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
      cell: ({ row }) => (
        <div className="max-w-[100px] truncate" title={row.getValue("id")}>
          {row.getValue("id")}
        </div>
      ),
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
      cell: ({ row }) => {
        const status = row.getValue("status") as string;
        return (
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            status === 'ACTIVE' 
              ? 'bg-green-100 text-green-700' 
              : 'bg-red-100 text-red-700'
          }`}>
            {status}
          </span>
        );
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const artist = row.original;
        const isActive = artist.status === 'ACTIVE';
        
        return (
          <div className="flex gap-2">
            <Button 
              variant={isActive ? "destructive" : "default"}
              size="sm"
              onClick={() => handleStatusChange(artist.id, isActive ? 'INACTIVE' : 'ACTIVE')}
              className={isActive ? "bg-red-500 hover:bg-red-600" : "bg-green-500 hover:bg-green-600"}
            >
              {isActive ? 'Deactivate' : 'Activate'}
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

  const handleStatusChange = async (artistId: string, newStatus: string) => {
    console.log(`Attempting to update artist ${artistId} status to ${newStatus}`);
    
    try {
      const result = await updateArtistStatus(artistId, newStatus);
      
      if (result.success && result.data) {
        toast.success(`Artist status updated to ${newStatus} successfully`);
        // Pass the actual updated data from the backend
        onArtistUpdate(artistId, newStatus, result.data);
      } else {
        console.error('Failed to update artist status:', result.error);
        toast.error(`Failed to update artist status: ${result.error?.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error updating artist status:', error);
      toast.error('An error occurred while updating status');
    }
  };

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Artists Management</h3>
        <div className="text-sm text-gray-600">
          Total Artists: {artists.length}
        </div>
      </div>
      
      <div className="border rounded-lg">
        <Table>
          <TableCaption>List of all artists in the system.</TableCaption>
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
                <TableCell colSpan={columns.length} className="text-center py-8">
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                    <span className="ml-2">Loading artists...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : artists.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center py-8">
                  No artists found.
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} className="hover:bg-gray-50">
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
    </div>
  );
};

export default ArtistsTab;
