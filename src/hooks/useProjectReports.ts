import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface ProjectReport {
  id: string;
  project_id: string;
  user_id: string;
  title: string;
  content: string;
  chat_history: ChatMessage[];
  status: 'draft' | 'final';
  created_at: string;
  updated_at: string;
}

export function useProjectReports(projectId?: string) {
  const { user } = useAuth();
  const [reports, setReports] = useState<ProjectReport[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReports = useCallback(async () => {
    if (!user || !projectId) {
      setReports([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('project_reports')
        .select('*')
        .eq('project_id', projectId)
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      // Map the data and ensure chat_history is an array
      const mappedReports = (data || []).map(report => ({
        ...report,
        chat_history: Array.isArray(report.chat_history) 
          ? (report.chat_history as unknown as ChatMessage[])
          : [],
        status: report.status as 'draft' | 'final'
      }));

      setReports(mappedReports);
    } catch (error) {
      console.error('Error fetching reports:', error);
      toast.error('Errore nel caricamento dei report');
    } finally {
      setLoading(false);
    }
  }, [user, projectId]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const createReport = async (title: string): Promise<ProjectReport | null> => {
    if (!user || !projectId) {
      toast.error('Devi essere autenticato');
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('project_reports')
        .insert({
          project_id: projectId,
          user_id: user.id,
          title,
          content: '',
          chat_history: [],
          status: 'draft'
        })
        .select()
        .single();

      if (error) throw error;

      const newReport: ProjectReport = {
        ...data,
        chat_history: [],
        status: data.status as 'draft' | 'final'
      };

      setReports(prev => [newReport, ...prev]);
      return newReport;
    } catch (error) {
      console.error('Error creating report:', error);
      toast.error('Errore nella creazione del report');
      return null;
    }
  };

  const updateReport = async (
    reportId: string, 
    updates: Partial<Pick<ProjectReport, 'title' | 'content' | 'chat_history' | 'status'>>
  ): Promise<boolean> => {
    if (!user) return false;

    try {
      const dbUpdates: Record<string, unknown> = {};
      if (updates.title !== undefined) dbUpdates.title = updates.title;
      if (updates.content !== undefined) dbUpdates.content = updates.content;
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.chat_history !== undefined) dbUpdates.chat_history = updates.chat_history as unknown;

      const { error } = await supabase
        .from('project_reports')
        .update(dbUpdates)
        .eq('id', reportId)
        .eq('user_id', user.id);

      if (error) throw error;

      setReports(prev => prev.map(r => 
        r.id === reportId ? { ...r, ...updates } : r
      ));
      return true;
    } catch (error) {
      console.error('Error updating report:', error);
      toast.error('Errore nell\'aggiornamento del report');
      return false;
    }
  };

  const deleteReport = async (reportId: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('project_reports')
        .delete()
        .eq('id', reportId)
        .eq('user_id', user.id);

      if (error) throw error;

      setReports(prev => prev.filter(r => r.id !== reportId));
      toast.success('Report eliminato');
      return true;
    } catch (error) {
      console.error('Error deleting report:', error);
      toast.error('Errore nell\'eliminazione del report');
      return false;
    }
  };

  return {
    reports,
    loading,
    createReport,
    updateReport,
    deleteReport,
    refetch: fetchReports
  };
}
