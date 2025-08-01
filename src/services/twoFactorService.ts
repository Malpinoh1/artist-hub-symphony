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

export const verifyTwoFactorToken = async (token: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase.functions.invoke('verify-2fa', {
      body: { token }
    });
    
    if (error) throw error;
    
    return data.valid;
  } catch (error) {
    console.error('Error verifying 2FA token:', error);
    throw new Error('Failed to verify 2FA token');
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