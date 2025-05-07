
import * as React from 'react';
import EmailTemplate from './EmailTemplate';

interface WithdrawalConfirmationEmailProps {
  name: string;
  amount: number;
  withdrawalDate: string;
  estimatedArrivalDate: string;
  paymentMethod: string;
  referenceId: string;
  earningsUrl: string;
}

const WithdrawalConfirmationEmail: React.FC<WithdrawalConfirmationEmailProps> = ({ 
  name, 
  amount,
  withdrawalDate,
  estimatedArrivalDate,
  paymentMethod,
  referenceId,
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
      <p className="mb-4">Your withdrawal request has been confirmed and is being processed.</p>
      
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
        <h3 className="font-medium text-gray-800 mb-2">Withdrawal Details:</h3>
        <ul className="space-y-2 text-gray-700">
          <li><span className="font-medium">Amount:</span> {formatCurrency(amount)}</li>
          <li><span className="font-medium">Date Requested:</span> {withdrawalDate}</li>
          <li><span className="font-medium">Estimated Arrival:</span> {estimatedArrivalDate}</li>
          <li><span className="font-medium">Payment Method:</span> {paymentMethod}</li>
          <li><span className="font-medium">Reference ID:</span> {referenceId}</li>
        </ul>
      </div>
      
      <p className="mb-4">Please note that it may take 3-5 business days for the funds to appear in your account, depending on your financial institution.</p>
      <p>If you have any questions about your withdrawal, please contact our support team.</p>
    </>
  );

  return (
    <EmailTemplate
      title="Withdrawal Confirmation"
      content={content}
      actionLabel="View Earnings Dashboard"
      actionUrl={earningsUrl}
    />
  );
};

export default WithdrawalConfirmationEmail;
