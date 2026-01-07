import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface UserClient {
  id: string;
  user_id: string;
  name: string;
  address: string | null;
  vat: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateClientData {
  name: string;
  address?: string;
  vat?: string;
  email?: string;
  phone?: string;
  notes?: string;
  is_favorite?: boolean;
}

export function useUserClients() {
  const { user } = useAuth();
  const [clients, setClients] = useState<UserClient[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchClients = useCallback(async () => {
    if (!user) {
      setClients([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_clients')
        .select('*')
        .eq('user_id', user.id)
        .order('is_favorite', { ascending: false })
        .order('name', { ascending: true });

      if (error) throw error;
      setClients((data as UserClient[]) || []);
    } catch (error) {
      console.error('Error fetching clients:', error);
      toast.error('Errore nel caricamento clienti');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const addClient = async (clientData: CreateClientData): Promise<UserClient | null> => {
    if (!user) {
      toast.error('Devi essere autenticato');
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('user_clients')
        .insert({
          user_id: user.id,
          name: clientData.name,
          address: clientData.address || null,
          vat: clientData.vat || null,
          email: clientData.email || null,
          phone: clientData.phone || null,
          notes: clientData.notes || null,
          is_favorite: clientData.is_favorite || false,
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          toast.error('Cliente già esistente con questo nome');
        } else {
          throw error;
        }
        return null;
      }

      const newClient = data as UserClient;
      setClients(prev => [...prev, newClient].sort((a, b) => {
        if (a.is_favorite !== b.is_favorite) return b.is_favorite ? 1 : -1;
        return a.name.localeCompare(b.name);
      }));
      
      toast.success('Cliente aggiunto');
      return newClient;
    } catch (error) {
      console.error('Error adding client:', error);
      toast.error('Errore nell\'aggiunta cliente');
      return null;
    }
  };

  const updateClient = async (id: string, updates: Partial<CreateClientData>): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('user_clients')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      setClients(prev => prev.map(c => 
        c.id === id ? { ...c, ...updates, updated_at: new Date().toISOString() } : c
      ).sort((a, b) => {
        if (a.is_favorite !== b.is_favorite) return b.is_favorite ? 1 : -1;
        return a.name.localeCompare(b.name);
      }));

      toast.success('Cliente aggiornato');
      return true;
    } catch (error) {
      console.error('Error updating client:', error);
      toast.error('Errore nell\'aggiornamento cliente');
      return false;
    }
  };

  const deleteClient = async (id: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('user_clients')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      setClients(prev => prev.filter(c => c.id !== id));
      toast.success('Cliente eliminato');
      return true;
    } catch (error) {
      console.error('Error deleting client:', error);
      toast.error('Errore nell\'eliminazione cliente');
      return false;
    }
  };

  const toggleFavorite = async (id: string): Promise<boolean> => {
    const client = clients.find(c => c.id === id);
    if (!client) return false;

    return updateClient(id, { is_favorite: !client.is_favorite });
  };

  const findClientByName = (name: string): UserClient | undefined => {
    return clients.find(c => c.name.toLowerCase() === name.toLowerCase());
  };

  return {
    clients,
    loading,
    addClient,
    updateClient,
    deleteClient,
    toggleFavorite,
    findClientByName,
    refetch: fetchClients,
  };
}
