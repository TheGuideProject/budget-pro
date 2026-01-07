import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface InvoiceSettings {
  id: string;
  user_id: string;
  work_start_label: string;
  work_end_label: string;
  project_name_label: string;
  project_location_label: string;
  show_work_dates: boolean;
  show_project_location: boolean;
  show_client_vat: boolean;
  default_payment_days: number;
  default_unit_price: number;
  // Company data fields
  company_name: string;
  company_address: string;
  company_country: string;
  company_iban: string;
  company_bic: string;
  company_bank_address: string;
  company_vat: string;
  company_email: string;
  created_at: string;
  updated_at: string;
}

export const DEFAULT_INVOICE_SETTINGS: Omit<InvoiceSettings, 'id' | 'user_id' | 'created_at' | 'updated_at'> = {
  work_start_label: 'Inizio Lavori',
  work_end_label: 'Fine Lavori',
  project_name_label: 'Nome Progetto / Nave',
  project_location_label: 'Luogo',
  show_work_dates: true,
  show_project_location: true,
  show_client_vat: true,
  default_payment_days: 60,
  default_unit_price: 500,
  company_name: '',
  company_address: '',
  company_country: 'Italia',
  company_iban: '',
  company_bic: '',
  company_bank_address: '',
  company_vat: '',
  company_email: '',
};

export function useInvoiceSettings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<InvoiceSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    if (!user) {
      setSettings(null);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('invoice_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        // Map DB fields to interface (handle potential nulls from DB)
        const mappedSettings: InvoiceSettings = {
          id: data.id,
          user_id: data.user_id,
          work_start_label: data.work_start_label || DEFAULT_INVOICE_SETTINGS.work_start_label,
          work_end_label: data.work_end_label || DEFAULT_INVOICE_SETTINGS.work_end_label,
          project_name_label: data.project_name_label || DEFAULT_INVOICE_SETTINGS.project_name_label,
          project_location_label: data.project_location_label || DEFAULT_INVOICE_SETTINGS.project_location_label,
          show_work_dates: data.show_work_dates ?? DEFAULT_INVOICE_SETTINGS.show_work_dates,
          show_project_location: data.show_project_location ?? DEFAULT_INVOICE_SETTINGS.show_project_location,
          show_client_vat: data.show_client_vat ?? DEFAULT_INVOICE_SETTINGS.show_client_vat,
          default_payment_days: data.default_payment_days ?? DEFAULT_INVOICE_SETTINGS.default_payment_days,
          default_unit_price: data.default_unit_price ?? DEFAULT_INVOICE_SETTINGS.default_unit_price,
          company_name: data.company_name || '',
          company_address: data.company_address || '',
          company_country: data.company_country || 'Italia',
          company_iban: data.company_iban || '',
          company_bic: data.company_bic || '',
          company_bank_address: data.company_bank_address || '',
          company_vat: data.company_vat || '',
          company_email: data.company_email || '',
          created_at: data.created_at || '',
          updated_at: data.updated_at || '',
        };
        setSettings(mappedSettings);
      } else {
        // Create default settings for new user
        const { data: newData, error: insertError } = await supabase
          .from('invoice_settings')
          .insert({
            user_id: user.id,
            ...DEFAULT_INVOICE_SETTINGS,
          })
          .select()
          .single();

        if (insertError) throw insertError;
        
        const mappedNewSettings: InvoiceSettings = {
          id: newData.id,
          user_id: newData.user_id,
          work_start_label: newData.work_start_label || DEFAULT_INVOICE_SETTINGS.work_start_label,
          work_end_label: newData.work_end_label || DEFAULT_INVOICE_SETTINGS.work_end_label,
          project_name_label: newData.project_name_label || DEFAULT_INVOICE_SETTINGS.project_name_label,
          project_location_label: newData.project_location_label || DEFAULT_INVOICE_SETTINGS.project_location_label,
          show_work_dates: newData.show_work_dates ?? DEFAULT_INVOICE_SETTINGS.show_work_dates,
          show_project_location: newData.show_project_location ?? DEFAULT_INVOICE_SETTINGS.show_project_location,
          show_client_vat: newData.show_client_vat ?? DEFAULT_INVOICE_SETTINGS.show_client_vat,
          default_payment_days: newData.default_payment_days ?? DEFAULT_INVOICE_SETTINGS.default_payment_days,
          default_unit_price: newData.default_unit_price ?? DEFAULT_INVOICE_SETTINGS.default_unit_price,
          company_name: newData.company_name || '',
          company_address: newData.company_address || '',
          company_country: newData.company_country || 'Italia',
          company_iban: newData.company_iban || '',
          company_bic: newData.company_bic || '',
          company_bank_address: newData.company_bank_address || '',
          company_vat: newData.company_vat || '',
          company_email: newData.company_email || '',
          created_at: newData.created_at || '',
          updated_at: newData.updated_at || '',
        };
        setSettings(mappedNewSettings);
      }
    } catch (error) {
      console.error('Error fetching invoice settings:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const updateSettings = async (updates: Partial<Omit<InvoiceSettings, 'id' | 'user_id' | 'created_at' | 'updated_at'>>): Promise<boolean> => {
    if (!user || !settings) return false;

    try {
      const { error } = await supabase
        .from('invoice_settings')
        .update(updates)
        .eq('id', settings.id)
        .eq('user_id', user.id);

      if (error) throw error;

      setSettings(prev => prev ? { ...prev, ...updates, updated_at: new Date().toISOString() } : null);
      toast.success('Impostazioni salvate');
      return true;
    } catch (error) {
      console.error('Error updating invoice settings:', error);
      toast.error('Errore nel salvataggio impostazioni');
      return false;
    }
  };

  // Return settings with defaults if not loaded yet
  const effectiveSettings = settings || {
    ...DEFAULT_INVOICE_SETTINGS,
    id: '',
    user_id: '',
    created_at: '',
    updated_at: '',
  };

  // Check if company data is configured
  const hasCompanyData = Boolean(
    effectiveSettings.company_name || 
    effectiveSettings.company_iban
  );

  return {
    settings: effectiveSettings,
    loading,
    updateSettings,
    refetch: fetchSettings,
    hasCompanyData,
  };
}
