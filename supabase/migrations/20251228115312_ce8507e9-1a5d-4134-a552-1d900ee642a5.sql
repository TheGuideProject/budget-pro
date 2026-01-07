-- Create project_notes table for tracking work reports
CREATE TABLE public.project_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  title TEXT,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.project_notes ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own project notes" ON public.project_notes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own project notes" ON public.project_notes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own project notes" ON public.project_notes FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own project notes" ON public.project_notes FOR DELETE USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_project_notes_updated_at
BEFORE UPDATE ON public.project_notes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();