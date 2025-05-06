
import React from 'react';
import { AlertTriangle } from 'lucide-react';
import TakeDownRequestForm from '../TakeDownRequestForm';

interface TakeDownSectionProps {
  artistId: string | null;
  releaseId: string;
  releaseStatus: string;
  takeDownRequest: any | null;
  showTakeDownForm: boolean;
  onShowTakeDownForm: () => void;
  onRequestSubmitted: () => void;
}

const TakeDownSection: React.FC<TakeDownSectionProps> = ({
  artistId,
  releaseId,
  releaseStatus,
  takeDownRequest,
  showTakeDownForm,
  onShowTakeDownForm,
  onRequestSubmitted
}) => {
  if (!artistId) return null;
  
  if (releaseStatus !== 'approved' || takeDownRequest) return null;
  
  return (
    <div className="mt-6">
      {showTakeDownForm ? (
        <TakeDownRequestForm 
          releaseId={releaseId}
          artistId={artistId}
          onRequestSubmitted={onRequestSubmitted}
        />
      ) : (
        <button
          onClick={onShowTakeDownForm}
          className="mt-4 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 text-sm font-medium flex items-center gap-1"
        >
          <AlertTriangle className="w-4 h-4" />
          Request Take Down
        </button>
      )}
    </div>
  );
};

export default TakeDownSection;
