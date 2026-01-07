export interface CalendarEvent {
  id: string;
  userId: string;
  title: string;
  description?: string;
  eventDate: Date;
  eventTime?: string;
  eventType: EventType;
  isRecurring: boolean;
  recurrenceInterval?: RecurrenceInterval;
  color: string;
  isCompleted: boolean;
  reminderDaysBefore: number;
  createdAt: Date;
  updatedAt: Date;
}

export type EventType = 'scadenza' | 'promemoria' | 'appuntamento' | 'altro';
export type RecurrenceInterval = 'daily' | 'weekly' | 'monthly' | 'yearly';

export const EVENT_TYPES: { value: EventType; label: string; color: string }[] = [
  { value: 'scadenza', label: 'Scadenza', color: '#ef4444' },
  { value: 'promemoria', label: 'Promemoria', color: '#eab308' },
  { value: 'appuntamento', label: 'Appuntamento', color: '#3b82f6' },
  { value: 'altro', label: 'Altro', color: '#6b7280' },
];

export const RECURRENCE_OPTIONS: { value: RecurrenceInterval; label: string }[] = [
  { value: 'daily', label: 'Giornaliera' },
  { value: 'weekly', label: 'Settimanale' },
  { value: 'monthly', label: 'Mensile' },
  { value: 'yearly', label: 'Annuale' },
];

export const EVENT_COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#3b82f6', // blue
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#6b7280', // gray
];
