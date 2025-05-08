
import { useState } from 'react';
import { toast } from 'sonner';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Artist } from '@/services/adminService';
import { updateArtistEarnings } from '@/services/adminService';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ArtistEarningsEditorProps {
  artist: Artist;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

const ArtistEarningsEditor = ({ artist, isOpen, onClose, onUpdate }: ArtistEarningsEditorProps) => {
  const [totalEarnings, setTotalEarnings] = useState(artist.total_earnings?.toString() || '0');
  const [availableBalance, setAvailableBalance] = useState(artist.available_balance?.toString() || '0');
  const [walletBalance, setWalletBalance] = useState(artist.wallet_balance?.toString() || '0');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateForm = () => {
    const total = parseFloat(totalEarnings);
    const available = parseFloat(availableBalance);
    const wallet = parseFloat(walletBalance);
    
    if (isNaN(total) || isNaN(available) || isNaN(wallet)) {
      setError("All values must be valid numbers");
      return false;
    }
    
    if (total < 0 || available < 0 || wallet < 0) {
      setError("Earnings values cannot be negative");
      return false;
    }
    
    setError(null);
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await updateArtistEarnings(
        artist.id, 
        parseFloat(totalEarnings), 
        parseFloat(availableBalance), 
        parseFloat(walletBalance)
      );
      
      if (result.success) {
        toast.success("Artist earnings updated successfully");
        onUpdate();
        onClose();
      } else {
        setError("Failed to update artist earnings");
        toast.error("Failed to update artist earnings");
      }
    } catch (error) {
      console.error("Error updating artist earnings:", error);
      setError("An error occurred while updating earnings");
      toast.error("An error occurred while updating earnings");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Update Earnings for {artist.name}</DialogTitle>
          <DialogDescription>
            Manually update earnings balances for this artist
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-200 text-red-700 rounded-md text-sm">
              {error}
            </div>
          )}
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="totalEarnings" className="text-right">
                Total Earnings
              </Label>
              <div className="col-span-3 relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500 dark:text-gray-400">$</span>
                <Input
                  id="totalEarnings"
                  type="number"
                  step="0.01"
                  value={totalEarnings}
                  onChange={(e) => setTotalEarnings(e.target.value)}
                  className="pl-7"
                  placeholder="0.00"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="availableBalance" className="text-right">
                Available Balance
              </Label>
              <div className="col-span-3 relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500 dark:text-gray-400">$</span>
                <Input
                  id="availableBalance"
                  type="number"
                  step="0.01"
                  value={availableBalance}
                  onChange={(e) => setAvailableBalance(e.target.value)}
                  className="pl-7"
                  placeholder="0.00"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="walletBalance" className="text-right">
                Wallet Balance
              </Label>
              <div className="col-span-3 relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500 dark:text-gray-400">$</span>
                <Input
                  id="walletBalance"
                  type="number"
                  step="0.01"
                  value={walletBalance}
                  onChange={(e) => setWalletBalance(e.target.value)}
                  className="pl-7"
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button 
              type="submit"
              disabled={loading}
            >
              {loading ? "Updating..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ArtistEarningsEditor;
