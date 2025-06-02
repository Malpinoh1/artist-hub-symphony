
import * as React from 'react';
import EmailTemplate from './EmailTemplate';

interface PasswordResetEmailProps {
  name: string;
  resetUrl: string;
}

const PasswordResetEmail: React.FC<PasswordResetEmailProps> = ({ name, resetUrl }) => {
  const content = (
    <>
      <p className="mb-4">Hello {name},</p>
      <p className="mb-4">We received a request to reset your password for your MALPINOHdistro account.</p>
      <p className="mb-4">If you requested this password reset, click the button below to create a new password:</p>
      
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
        <p className="text-blue-800 text-sm mb-2">
          <strong>Security Notice:</strong> This link will expire in 1 hour for your security.
        </p>
      </div>
      
      <p className="mb-4">If you didn't request this password reset, you can safely ignore this email. Your password will remain unchanged.</p>
      <p>For security reasons, if you continue to receive these emails, please contact our support team.</p>
    </>
  );

  return (
    <EmailTemplate
      title="Reset Your Password"
      content={content}
      actionLabel="Reset Password"
      actionUrl={resetUrl}
    />
  );
};

export default PasswordResetEmail;
