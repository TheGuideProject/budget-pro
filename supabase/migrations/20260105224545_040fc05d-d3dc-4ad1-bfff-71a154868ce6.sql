-- Create user_clients table for storing private clients per user
CREATE TABLE public.user_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  address TEXT,
  vat TEXT,
  email TEXT,
  phone TEXT,
  notes TEXT,
  is_favorite BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, name)
);

-- Enable RLS for complete privacy
ALTER TABLE public.user_clients ENABLE ROW LEVEL SECURITY;

-- RLS Policies - each user can only see/manage their own clients
CREATE POLICY "Users can view their own clients"
  ON public.user_clients FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own clients"
  ON public.user_clients FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own clients"
  ON public.user_clients FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own clients"
  ON public.user_clients FOR DELETE
  USING (auth.uid() = user_id);

-- Create invoice_settings table for customizable form fields
CREATE TABLE public.invoice_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  
  -- Custom field labels
  work_start_label TEXT DEFAULT 'Inizio Lavori',
  work_end_label TEXT DEFAULT 'Fine Lavori',
  project_name_label TEXT DEFAULT 'Nome Progetto / Nave',
  project_location_label TEXT DEFAULT 'Luogo',
  
  -- Field visibility toggles
  show_work_dates BOOLEAN DEFAULT TRUE,
  show_project_location BOOLEAN DEFAULT TRUE,
  show_client_vat BOOLEAN DEFAULT TRUE,
  
  -- Default values
  default_payment_days INTEGER DEFAULT 60,
  default_unit_price NUMERIC DEFAULT 500,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.invoice_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for invoice_settings
CREATE POLICY "Users can view their own invoice settings"
  ON public.invoice_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own invoice settings"
  ON public.invoice_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own invoice settings"
  ON public.invoice_settings FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own invoice settings"
  ON public.invoice_settings FOR DELETE
  USING (auth.uid() = user_id);

-- Add trigger for updated_at on user_clients
CREATE TRIGGER update_user_clients_updated_at
  BEFORE UPDATE ON public.user_clients
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add trigger for updated_at on invoice_settings
CREATE TRIGGER update_invoice_settings_updated_at
  BEFORE UPDATE ON public.invoice_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();