
import * as React from 'react';
import EmailTemplate from './EmailTemplate';

interface WelcomeEmailProps {
  name: string;
  loginUrl: string;
}

const WelcomeEmail: React.FC<WelcomeEmailProps> = ({ name, loginUrl }) => {
  const content = (
    <>
      <p className="mb-4">Hello {name},</p>
      <p className="mb-4">Welcome to MALPINOHdistro! We're excited to have you join our global music distribution platform.</p>
      <p className="mb-4">With MALPINOHdistro, you can:</p>
      <ul className="list-disc pl-5 mb-4 space-y-2">
        <li>Distribute your music to major streaming platforms worldwide</li>
        <li>Track your earnings and statistics in real-time</li>
        <li>Manage all your releases in one place</li>
        <li>Get paid quickly and reliably</li>
      </ul>
      <p>To get started, click the button below to access your dashboard.</p>
    </>
  );

  return (
    <EmailTemplate
      title="Welcome to MALPINOHdistro!"
      content={content}
      actionLabel="Access Your Dashboard"
      actionUrl={loginUrl}
      footerText="© 2025 MALPINOHdistro. All rights reserved."
    />
  );
};

export default WelcomeEmail;
