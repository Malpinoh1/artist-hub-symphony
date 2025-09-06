import { supabase } from '../integrations/supabase/client';

export interface TwoFactorSetupData {
  secret: string;
  qrCodeUrl: string;
  backupCodes: string[];
}

export const generateTwoFactorSecret = async (): Promise<TwoFactorSetupData> => {
  try {
    const { data, error } = await supabase.functions.invoke('setup-2fa');
    
    if (error) throw error;
    
    return data;
  } catch (error) {
    console.error('Error generating 2FA secret:', error);
    throw new Error('Failed to generate 2FA secret');
  }
};

export const enableTwoFactor = async (token: string, secret: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase.functions.invoke('enable-2fa', {
      body: { token, secret }
    });
    
    if (error) throw error;
    
    return data.success;
  } catch (error) {
    console.error('Error enabling 2FA:', error);
    throw new Error('Failed to enable 2FA');
  }
};

export const verifyTwoFactorToken = async (token: string, email?: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase.functions.invoke('verify-2fa', {
      body: { token, email }
    });
    
    if (error) {
      console.error('2FA verification error:', error);
      return false;
    }
    
    return data?.valid || false;
  } catch (error) {
    console.error('Error verifying 2FA token:', error);
    return false;
  }
};

export const disableTwoFactor = async (password: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase.functions.invoke('disable-2fa', {
      body: { password }
    });
    
    if (error) throw error;
    
    return data.success;
  } catch (error) {
    console.error('Error disabling 2FA:', error);
    throw new Error('Failed to disable 2FA');
  }
};