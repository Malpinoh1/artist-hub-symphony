
import * as React from 'react';
import EmailTemplate from './EmailTemplate';

interface EarningsUpdateEmailProps {
  name: string;
  amount: number;
  period: string;
  earningsUrl: string;
}

const EarningsUpdateEmail: React.FC<EarningsUpdateEmailProps> = ({ 
  name, 
  amount,
  period,
  earningsUrl 
}) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  const content = (
    <>
      <p className="mb-4">Hello {name},</p>
      <p className="mb-4">We're pleased to inform you that your earnings have been updated for {period}.</p>
      
      <div className="bg-green-50 border border-green-100 rounded-lg p-4 mb-4">
        <p className="text-green-800 font-medium">New Earnings: {formatCurrency(amount)}</p>
      </div>
      
      <p className="mb-4">These earnings will be available for withdrawal according to our payment schedule. You can view detailed breakdowns of your earnings by platform, country, and track in your dashboard.</p>
      <p>Thank you for distributing your music with MALPINOHdistro!</p>
    </>
  );

  return (
    <EmailTemplate
      title={`Earnings Update for ${period}`}
      content={content}
      actionLabel="View Earnings Details"
      actionUrl={earningsUrl}
    />
  );
};

export default EarningsUpdateEmail;
