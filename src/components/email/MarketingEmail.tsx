
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
      <div className="text-center mb-6 p-6 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg">
        <h1 className="text-2xl font-bold text-white mb-2">MALPINOHdistro</h1>
        <p className="text-blue-100">Your Premier Music Distribution Partner</p>
      </div>
      
      <p className="mb-4 text-lg">Hello {name},</p>
      
      <div className="mb-6 leading-relaxed" dangerouslySetInnerHTML={{ __html: content }} />
      
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-l-4 border-blue-500 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
          <div>
            <p className="text-blue-800 text-sm font-medium">
              <strong>Stay Connected with MALPINOHdistro:</strong>
            </p>
            <p className="text-blue-700 text-sm mt-1">
              Follow us on social media for the latest updates, music industry tips, and exclusive artist features!
            </p>
          </div>
        </div>
      </div>

      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-4">
        <p className="text-slate-700 text-sm">
          <strong>Why choose MALPINOHdistro?</strong>
        </p>
        <ul className="text-slate-600 text-sm mt-2 space-y-1">
          <li>• Global distribution to 150+ platforms</li>
          <li>• Keep 100% of your royalties</li>
          <li>• Professional support team</li>
          <li>• Advanced analytics and reporting</li>
        </ul>
      </div>
    </>
  );

  return (
    <EmailTemplate
      title={title}
      content={emailContent}
      actionLabel={actionLabel}
      actionUrl={actionUrl}
      footerText="© 2025 MALPINOHdistro. All rights reserved. You're receiving this because you're a valued member of our community and have opted-in to receive marketing emails."
    />
  );
};

export default MarketingEmail;
