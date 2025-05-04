
import React from 'react';
import AnimatedCard from '../AnimatedCard';
import WithdrawalForm from '../WithdrawalForm';
import PaymentInfo from './PaymentInfo';

interface WithdrawalPanelProps {
  availableBalance: number;
  userId: string;
  artistId: string;
  onSuccess: () => void;
}

const WithdrawalPanel: React.FC<WithdrawalPanelProps> = ({ 
  availableBalance, 
  userId, 
  artistId, 
  onSuccess 
}) => {
  return (
    <AnimatedCard className="lg:col-span-1">
      <WithdrawalForm 
        availableBalance={availableBalance}
        userId={userId}
        artistId={artistId} 
        onSuccess={onSuccess}
      />
      <PaymentInfo />
    </AnimatedCard>
  );
};

export default WithdrawalPanel;
