
import { supabase } from "../integrations/supabase/client";
import { ReactElement } from 'react';
import ReactDOMServer from 'react-dom/server';

// Email types
export type EmailTemplate = 'welcome' | 'release-approved' | 'earnings-update' | 'withdrawal-confirmation' | 'takedown-request' | 'release-submission';

// Function to render React component to HTML
export const renderEmailToHTML = (component: ReactElement): string => {
  return ReactDOMServer.renderToStaticMarkup(component);
};

// Function to send emails
export const sendEmail = async (to: string, subject: string, htmlContent: string) => {
  try {
    console.log('Sending email to:', to);
    console.log('Subject:', subject);
    
    const { data, error } = await supabase.functions.invoke('send-email', {
      body: {
        to,
        subject,
        html: htmlContent
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

// Function to send a release submission confirmation email
export const sendReleaseSubmissionEmail = async (to: string, releaseTitle: string, artistName: string) => {
  const subject = `Your release "${releaseTitle}" has been submitted`;
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
      <div style="text-align: center; margin-bottom: 20px;">
        <h1 style="color: #2563eb;">MALPINOHdistro</h1>
      </div>
      <div style="background-color: #f3f4f6; padding: 20px; border-radius: 5px;">
        <h2>Release Submission Confirmation</h2>
        <p>Dear ${artistName},</p>
        <p>Your release <strong>${releaseTitle}</strong> has been successfully submitted for review.</p>
        <p>Our team will review your submission and get back to you soon. You can check the status of your release in your dashboard.</p>
        <p>Please remember to complete your payment to process your release.</p>
      </div>
      <div style="margin-top: 20px; padding: 10px; background-color: #f0fdf4; border-radius: 5px; border-left: 4px solid #16a34a;">
        <p style="margin: 0;"><strong>Payment Information:</strong></p>
        <p style="margin: 5px 0;">Account Name: ABDULKADIR IBRAHIM OLUWASHINA</p>
        <p style="margin: 5px 0;">Account Number: 8168940582</p>
        <p style="margin: 5px 0;">Bank: OPAY DIGITAL BANK</p>
        <p style="margin: 5px 0;">Include your artist name as reference when making the payment.</p>
      </div>
      <div style="text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px;">
        <p>&copy; 2025 MALPINOHdistro. All rights reserved.</p>
      </div>
    </div>
  `;
  
  return sendEmail(to, subject, htmlContent);
};
