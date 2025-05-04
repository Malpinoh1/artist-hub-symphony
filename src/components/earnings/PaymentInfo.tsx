
import React from 'react';

const PaymentInfo: React.FC = () => {
  return (
    <div className="mt-6 glass-panel p-6">
      <h3 className="text-xl font-semibold mb-4">Payment Information</h3>
      <p className="text-slate-600 mb-4">
        Once your withdrawal request is approved, you'll receive payment to the bank account you provide.
        Processing typically takes 1-3 business days.
      </p>
      <div className="text-sm text-slate-500 space-y-2">
        <div className="flex items-start">
          <div className="mr-2">•</div>
          <div>Minimum withdrawal amount: $50</div>
        </div>
        <div className="flex items-start">
          <div className="mr-2">•</div>
          <div>Bank transfers available to all major banks</div>
        </div>
        <div className="flex items-start">
          <div className="mr-2">•</div>
          <div>International withdrawals require additional verification</div>
        </div>
      </div>
    </div>
  );
};

export default PaymentInfo;
