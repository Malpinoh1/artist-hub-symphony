
import * as React from 'react';
import EmailTemplate from './EmailTemplate';

interface MarketingEmailProps {
  name: string;
  title: string;
  content: string;
  actionLabel?: string;
  actionUrl?: string;
}

const MarketingEmail: React.FC<MarketingEmailProps> = ({ 
  name, 
  title,
  content,
  actionLabel,
  actionUrl 
}) => {
  const emailContent = (
    <>
      <p className="mb-4">Hello {name},</p>
      <div className="mb-4" dangerouslySetInnerHTML={{ __html: content }} />
      
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
        <p className="text-blue-800 text-sm">
          <strong>Stay Connected:</strong> Follow us on social media for the latest updates and music industry tips!
        </p>
      </div>
    </>
  );

  return (
    <EmailTemplate
      title={title}
      content={emailContent}
      actionLabel={actionLabel}
      actionUrl={actionUrl}
      footerText="© 2025 MALPINOHdistro. All rights reserved. You're receiving this because you're a valued member of our community."
    />
  );
};

export default MarketingEmail;
