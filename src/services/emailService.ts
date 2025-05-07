
import { supabase } from "../integrations/supabase/client";
import { ReactElement } from 'react';
import ReactDOMServer from 'react-dom/server';

// Email types
export type EmailTemplate = 'welcome' | 'release-approved' | 'earnings-update' | 'withdrawal-confirmation' | 'takedown-request';

// Function to render React component to HTML
export const renderEmailToHTML = (component: ReactElement): string => {
  return ReactDOMServer.renderToStaticMarkup(component);
};

// Function to send emails
export const sendEmail = async (to: string, subject: string, htmlContent: string) => {
  try {
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

    return { success: true, data };
  } catch (error) {
    console.error('Error in sendEmail:', error);
    return { success: false, error };
  }
};
