
import * as React from 'react';
import { Card, CardContent } from "@/components/ui/card";

interface EmailTemplateProps {
  title: string;
  content: React.ReactNode;
  actionLabel?: string;
  actionUrl?: string;
  footerText?: string;
}

const EmailTemplate: React.FC<EmailTemplateProps> = ({
  title,
  content,
  actionLabel,
  actionUrl,
  footerText = "© 2025 MALPINOHdistro. All rights reserved."
}) => {
  const previewText = `MALPINOHdistro - ${title}`;
  
  return (
    <div className="max-w-[600px] mx-auto bg-white">
      {/* Hidden preview text for email clients */}
      <div className="hidden">{previewText}</div>
      
      {/* Header */}
      <div className="bg-primary py-6 px-4 text-center">
        <h1 className="text-2xl font-bold text-white">MALPINOHdistro</h1>
        <p className="text-sm text-primary-foreground/80">GLOBAL MUSIC DISTRIBUTION SERVICE</p>
      </div>
      
      {/* Main Content */}
      <Card className="mx-4 my-6 border-none shadow-lg">
        <CardContent className="p-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">{title}</h2>
          <div className="text-gray-600 mb-6">
            {content}
          </div>
          
          {actionLabel && actionUrl && (
            <div className="text-center mt-6 mb-4">
              <a 
                href={actionUrl}
                className="inline-block bg-primary hover:bg-primary/90 text-white font-medium py-3 px-6 rounded-md no-underline transition-colors"
                target="_blank" 
                rel="noopener noreferrer"
              >
                {actionLabel}
              </a>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Footer */}
      <div className="py-6 px-4 text-center border-t border-gray-200 text-sm text-gray-500">
        <p className="mb-2">{footerText}</p>
        <p>
          <a href="#" className="text-primary hover:underline mx-2">Privacy Policy</a>
          <span className="mx-1">•</span>
          <a href="#" className="text-primary hover:underline mx-2">Terms of Service</a>
          <span className="mx-1">•</span>
          <a href="#" className="text-primary hover:underline mx-2">Contact Support</a>
        </p>
      </div>
    </div>
  );
};

export default EmailTemplate;
