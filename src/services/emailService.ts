
import { supabase } from "../integrations/supabase/client";
import { ReactElement } from 'react';
import ReactDOMServer from 'react-dom/server';
import WelcomeEmail from '../components/email/WelcomeEmail';
import ReleaseApprovedEmail from '../components/email/ReleaseApprovedEmail';
import EarningsUpdateEmail from '../components/email/EarningsUpdateEmail';
import WithdrawalConfirmationEmail from '../components/email/WithdrawalConfirmationEmail';
import TakedownRequestEmail from '../components/email/TakedownRequestEmail';
import PasswordResetEmail from '../components/email/PasswordResetEmail';
import MarketingEmail from '../components/email/MarketingEmail';

// Email types
export type EmailTemplate = 'welcome' | 'release-approved' | 'earnings-update' | 'withdrawal-confirmation' | 'takedown-request' | 'release-submission' | 'password-reset' | 'marketing';

// Function to render React component to HTML
export const renderEmailToHTML = (component: ReactElement): string => {
  return ReactDOMServer.renderToStaticMarkup(component);
};

// Function to send emails
export const sendEmail = async (to: string, subject: string, htmlContent: string, from?: string) => {
  try {
    console.log('Sending email to:', to);
    console.log('Subject:', subject);
    
    const { data, error } = await supabase.functions.invoke('send-email', {
      body: {
        to,
        subject,
        html: htmlContent,
        from
      }
    });

    if (error) {
      console.error('Error sending email:', error);
      return { success: false, error };
    }

    console.log('Email sent successfully:', data);
    return { success: true, data };
  } catch (error) {
    console.error('Error in sendEmail:', error);
    return { success: false, error };
  }
};

// Function to send welcome email
export const sendWelcomeEmail = async (to: string, name: string) => {
  const loginUrl = `${window.location.origin}/auth`;
  
  const emailComponent = WelcomeEmail({ 
    name, 
    loginUrl 
  });
  
  const htmlContent = renderEmailToHTML(emailComponent);
  const subject = `Welcome to MALPINOHdistro, ${name}!`;
  
  return sendEmail(to, subject, htmlContent);
};

// Function to send release approval email
export const sendReleaseApprovalEmail = async (to: string, name: string, releaseName: string, releaseId: string) => {
  const releaseUrl = `${window.location.origin}/release/${releaseId}`;
  
  const emailComponent = ReleaseApprovedEmail({ 
    name, 
    releaseName,
    releaseUrl 
  });
  
  const htmlContent = renderEmailToHTML(emailComponent);
  const subject = `Great News! Your release "${releaseName}" has been approved`;
  
  return sendEmail(to, subject, htmlContent);
};

// Function to send earnings update email
export const sendEarningsUpdateEmail = async (to: string, name: string, amount: number, period: string) => {
  const earningsUrl = `${window.location.origin}/earnings`;
  
  const emailComponent = EarningsUpdateEmail({ 
    name, 
    amount,
    period,
    earningsUrl 
  });
  
  const htmlContent = renderEmailToHTML(emailComponent);
  const subject = `Earnings Update for ${period}`;
  
  return sendEmail(to, subject, htmlContent);
};

// Function to send withdrawal confirmation email
export const sendWithdrawalConfirmationEmail = async (
  to: string, 
  name: string, 
  amount: number, 
  withdrawalDate: string, 
  estimatedArrivalDate: string, 
  paymentMethod: string, 
  referenceId: string
) => {
  const earningsUrl = `${window.location.origin}/earnings`;
  
  const emailComponent = WithdrawalConfirmationEmail({ 
    name, 
    amount,
    withdrawalDate,
    estimatedArrivalDate,
    paymentMethod,
    referenceId,
    earningsUrl 
  });
  
  const htmlContent = renderEmailToHTML(emailComponent);
  const subject = `Withdrawal Confirmation - ${referenceId}`;
  
  return sendEmail(to, subject, htmlContent);
};

// Function to send takedown request email
export const sendTakedownRequestEmail = async (
  to: string, 
  name: string, 
  releaseName: string, 
  requestDate: string, 
  estimatedCompletionDate: string, 
  reason: string, 
  releaseId: string
) => {
  const releaseUrl = `${window.location.origin}/release/${releaseId}`;
  
  const emailComponent = TakedownRequestEmail({ 
    name, 
    releaseName,
    requestDate,
    estimatedCompletionDate,
    reason,
    releaseUrl 
  });
  
  const htmlContent = renderEmailToHTML(emailComponent);
  const subject = `Takedown Request Received for "${releaseName}"`;
  
  return sendEmail(to, subject, htmlContent);
};

// Function to send password reset email
export const sendPasswordResetEmail = async (to: string, name: string, resetUrl: string) => {
  const emailComponent = PasswordResetEmail({ 
    name, 
    resetUrl 
  });
  
  const htmlContent = renderEmailToHTML(emailComponent);
  const subject = 'Reset Your MALPINOHdistro Password';
  
  return sendEmail(to, subject, htmlContent);
};

// Function to send marketing email
export const sendMarketingEmail = async (
  to: string, 
  name: string, 
  title: string, 
  content: string, 
  actionLabel?: string, 
  actionUrl?: string
) => {
  const emailComponent = MarketingEmail({ 
    name, 
    title,
    content,
    actionLabel,
    actionUrl 
  });
  
  const htmlContent = renderEmailToHTML(emailComponent);
  const subject = title;
  
  return sendEmail(to, subject, htmlContent);
};

// Function to send a release submission confirmation email
export const sendReleaseSubmissionEmail = async (to: string, releaseTitle: string, artistName: string) => {
  const subject = `Your release "${releaseTitle}" has been submitted`;
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px; background-color: white;">
      <div style="text-align: center; margin-bottom: 20px;">
        <h1 style="color: #2563eb; margin: 0;">MALPINOHdistro</h1>
        <p style="color: #6b7280; margin: 5px 0;">GLOBAL MUSIC DISTRIBUTION SERVICE</p>
      </div>
      <div style="background-color: #f8fafc; padding: 20px; border-radius: 5px; border-left: 4px solid #2563eb;">
        <h2 style="color: #1f2937; margin-top: 0;">Release Submission Confirmation</h2>
        <p style="color: #374151;">Dear ${artistName},</p>
        <p style="color: #374151;">Your release <strong>${releaseTitle}</strong> has been successfully submitted for review.</p>
        <p style="color: #374151;">Our team will review your submission and get back to you soon. You can check the status of your release in your dashboard.</p>
        <p style="color: #374151;">Please remember to complete your payment to process your release.</p>
      </div>
      <div style="margin-top: 20px; padding: 15px; background-color: #ecfdf5; border-radius: 5px; border-left: 4px solid #059669;">
        <p style="margin: 0; color: #065f46;"><strong>Payment Information:</strong></p>
        <p style="margin: 5px 0; color: #065f46;">Account Name: ABDULKADIR IBRAHIM OLUWASHINA</p>
        <p style="margin: 5px 0; color: #065f46;">Account Number: 8168940582</p>
        <p style="margin: 5px 0; color: #065f46;">Bank: OPAY DIGITAL BANK</p>
        <p style="margin: 5px 0; color: #065f46;">Include your artist name as reference when making the payment.</p>
      </div>
      <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px;">
        <p style="margin: 0;">&copy; 2025 MALPINOHdistro. All rights reserved.</p>
      </div>
    </div>
  `;
  
  return sendEmail(to, subject, htmlContent);
};
