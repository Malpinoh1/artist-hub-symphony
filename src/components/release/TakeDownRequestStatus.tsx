
import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface TakeDownRequestStatusProps {
  takeDownRequest: any;
}

const TakeDownRequestStatus: React.FC<TakeDownRequestStatusProps> = ({ takeDownRequest }) => {
  if (!takeDownRequest) return null;
  
  return (
    <div className="mt-6 bg-amber-50 dark:bg-amber-900/20 p-4 rounded-lg border border-amber-200 dark:border-amber-800">
      <div className="flex items-start gap-2">
        <AlertTriangle className="text-amber-600 dark:text-amber-500 w-5 h-5 mt-0.5" />
        <div>
          <h3 className="font-medium text-amber-800 dark:text-amber-400">Take Down Request Submitted</h3>
          <p className="text-sm text-amber-700 dark:text-amber-300">
            Status: <span className="font-medium">{takeDownRequest.status}</span>
          </p>
          <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
            Submitted on {new Date(takeDownRequest.created_at).toLocaleDateString()}
          </p>
        </div>
      </div>
    </div>
  );
};

export default TakeDownRequestStatus;
