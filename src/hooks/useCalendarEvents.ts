import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { CalendarEvent, EventType, RecurrenceInterval } from '@/types/calendar';

interface CreateEventInput {
  title: string;
  description?: string;
  eventDate: Date;
  eventTime?: string;
  eventType: EventType;
  isRecurring?: boolean;
  recurrenceInterval?: RecurrenceInterval;
  color?: string;
  reminderDaysBefore?: number;
}

interface UpdateEventInput extends Partial<CreateEventInput> {
  isCompleted?: boolean;
}

export function useCalendarEvents() {
  const { user } = useAuth();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEvents = useCallback(async () => {
    if (!user) {
      setEvents([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('user_id', user.id)
        .order('event_date', { ascending: true });

      if (error) {
        console.error('Error fetching events:', error);
        return;
      }

      setEvents(data?.map(mapDbToEvent) || []);
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const createEvent = async (input: CreateEventInput) => {
    if (!user) return { error: new Error('Not authenticated') };

    const { data, error } = await supabase
      .from('calendar_events')
      .insert({
        user_id: user.id,
        title: input.title,
        description: input.description || null,
        event_date: input.eventDate.toISOString().split('T')[0],
        event_time: input.eventTime || null,
        event_type: input.eventType,
        is_recurring: input.isRecurring || false,
        recurrence_interval: input.recurrenceInterval || null,
        color: input.color || '#3b82f6',
        reminder_days_before: input.reminderDaysBefore || 0,
      })
      .select()
      .single();

    if (!error && data) {
      setEvents(prev => [...prev, mapDbToEvent(data)]);
    }

    return { error, data: data ? mapDbToEvent(data) : null };
  };

  const updateEvent = async (id: string, input: UpdateEventInput) => {
    if (!user) return { error: new Error('Not authenticated') };

    const updateData: Record<string, unknown> = {};
    
    if (input.title !== undefined) updateData.title = input.title;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.eventDate !== undefined) updateData.event_date = input.eventDate.toISOString().split('T')[0];
    if (input.eventTime !== undefined) updateData.event_time = input.eventTime;
    if (input.eventType !== undefined) updateData.event_type = input.eventType;
    if (input.isRecurring !== undefined) updateData.is_recurring = input.isRecurring;
    if (input.recurrenceInterval !== undefined) updateData.recurrence_interval = input.recurrenceInterval;
    if (input.color !== undefined) updateData.color = input.color;
    if (input.reminderDaysBefore !== undefined) updateData.reminder_days_before = input.reminderDaysBefore;
    if (input.isCompleted !== undefined) updateData.is_completed = input.isCompleted;

    const { data, error } = await supabase
      .from('calendar_events')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (!error && data) {
      setEvents(prev => prev.map(e => e.id === id ? mapDbToEvent(data) : e));
    }

    return { error, data: data ? mapDbToEvent(data) : null };
  };

  const deleteEvent = async (id: string) => {
    if (!user) return { error: new Error('Not authenticated') };

    const { error } = await supabase
      .from('calendar_events')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (!error) {
      setEvents(prev => prev.filter(e => e.id !== id));
    }

    return { error };
  };

  const toggleCompleted = async (id: string) => {
    const event = events.find(e => e.id === id);
    if (!event) return { error: new Error('Event not found') };

    return updateEvent(id, { isCompleted: !event.isCompleted });
  };

  return {
    events,
    loading,
    createEvent,
    updateEvent,
    deleteEvent,
    toggleCompleted,
    refetch: fetchEvents,
  };
}

function mapDbToEvent(data: Record<string, unknown>): CalendarEvent {
  return {
    id: data.id as string,
    userId: data.user_id as string,
    title: data.title as string,
    description: data.description as string | undefined,
    eventDate: new Date(data.event_date as string),
    eventTime: data.event_time as string | undefined,
    eventType: data.event_type as EventType,
    isRecurring: data.is_recurring as boolean,
    recurrenceInterval: data.recurrence_interval as RecurrenceInterval | undefined,
    color: data.color as string,
    isCompleted: data.is_completed as boolean,
    reminderDaysBefore: data.reminder_days_before as number,
    createdAt: new Date(data.created_at as string),
    updatedAt: new Date(data.updated_at as string),
  };
}
