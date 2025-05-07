
import * as React from 'react';
import EmailTemplate from './EmailTemplate';

interface ReleaseApprovedEmailProps {
  name: string;
  releaseName: string;
  releaseUrl: string;
}

const ReleaseApprovedEmail: React.FC<ReleaseApprovedEmailProps> = ({ 
  name, 
  releaseName,
  releaseUrl 
}) => {
  const content = (
    <>
      <p className="mb-4">Hello {name},</p>
      <p className="mb-4">Great news! Your release <strong>{releaseName}</strong> has been approved and is now being distributed to all selected platforms.</p>
      <p className="mb-4">You can expect your music to appear on the various streaming platforms within the next 3-5 business days, though some platforms may take longer.</p>
      <p className="mb-4">You can track the distribution status and performance of your release in your dashboard.</p>
      <p>Thank you for choosing MALPINOHdistro for your music distribution needs!</p>
    </>
  );

  return (
    <EmailTemplate
      title="Your Release Has Been Approved!"
      content={content}
      actionLabel="View Release Details"
      actionUrl={releaseUrl}
    />
  );
};

export default ReleaseApprovedEmail;
