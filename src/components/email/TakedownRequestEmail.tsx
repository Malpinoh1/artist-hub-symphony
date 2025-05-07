
import * as React from 'react';
import EmailTemplate from './EmailTemplate';

interface TakedownRequestEmailProps {
  name: string;
  releaseName: string;
  requestDate: string;
  estimatedCompletionDate: string;
  reason: string;
  releaseUrl: string;
}

const TakedownRequestEmail: React.FC<TakedownRequestEmailProps> = ({ 
  name, 
  releaseName,
  requestDate,
  estimatedCompletionDate,
  reason,
  releaseUrl 
}) => {
  const content = (
    <>
      <p className="mb-4">Hello {name},</p>
      <p className="mb-4">We have received your request to take down your release <strong>{releaseName}</strong>.</p>
      
      <div className="bg-amber-50 border border-amber-100 rounded-lg p-4 mb-4">
        <h3 className="font-medium text-amber-800 mb-2">Takedown Request Details:</h3>
        <ul className="space-y-2 text-amber-800">
          <li><span className="font-medium">Date Requested:</span> {requestDate}</li>
          <li><span className="font-medium">Estimated Completion:</span> {estimatedCompletionDate}</li>
          <li><span className="font-medium">Reason Provided:</span> {reason}</li>
        </ul>
      </div>
      
      <p className="mb-4">We will process your takedown request as quickly as possible. Please note that while we submit takedown requests to platforms immediately, each platform has its own timeline for removing content, which can take between 1-14 business days.</p>
      <p>You can check the status of your takedown request in your dashboard. If you have any questions, please contact our support team.</p>
    </>
  );

  return (
    <EmailTemplate
      title="Takedown Request Received"
      content={content}
      actionLabel="View Release Details"
      actionUrl={releaseUrl}
    />
  );
};

export default TakedownRequestEmail;
