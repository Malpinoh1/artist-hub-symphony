
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from '@/components/ui/button';
import { Release } from '@/services/adminService';

interface IdentifiersUpdateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  release: Release | null;
  upc: string;
  isrc: string;
  onUpcChange: (upc: string) => void;
  onIsrcChange: (isrc: string) => void;
  onSave: () => void;
}

const IdentifiersUpdateDialog: React.FC<IdentifiersUpdateDialogProps> = ({
  open,
  onOpenChange,
  release,
  upc,
  isrc,
  onUpcChange,
  onIsrcChange,
  onSave
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Update Release Identifiers</DialogTitle>
          <DialogDescription>
            Update the UPC and ISRC for "{release?.title}"
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="upc" className="text-right">
              UPC
            </Label>
            <Input
              id="upc"
              value={upc}
              onChange={(e) => onUpcChange(e.target.value)}
              className="col-span-3"
              placeholder="Enter UPC"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="isrc" className="text-right">
              ISRC
            </Label>
            <Input
              id="isrc"
              value={isrc}
              onChange={(e) => onIsrcChange(e.target.value)}
              className="col-span-3"
              placeholder="Enter ISRC"
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={onSave}>
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default IdentifiersUpdateDialog;
