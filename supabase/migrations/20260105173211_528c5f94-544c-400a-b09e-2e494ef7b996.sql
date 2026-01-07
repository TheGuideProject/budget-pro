
-- Create enum for app roles
CREATE TYPE public.app_role AS ENUM ('admin', 'super_admin', 'user');

-- Create user_roles table (separate from profiles as per security guidelines)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create function to check if user is any admin
CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin', 'super_admin')
  )
$$;

-- RLS policies for user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
USING (public.is_admin(auth.uid()));

CREATE POLICY "Super admins can insert roles"
ON public.user_roles
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can update roles"
ON public.user_roles
FOR UPDATE
USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can delete roles"
ON public.user_roles
FOR DELETE
USING (public.has_role(auth.uid(), 'super_admin'));

-- Create subscription_plans table
CREATE TABLE public.subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  billing_period TEXT NOT NULL DEFAULT 'monthly', -- monthly, yearly
  features JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on subscription_plans
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

-- Everyone can view active plans
CREATE POLICY "Anyone can view active plans"
ON public.subscription_plans
FOR SELECT
USING (is_active = true);

-- Admins can view all plans
CREATE POLICY "Admins can view all plans"
ON public.subscription_plans
FOR SELECT
USING (public.is_admin(auth.uid()));

-- Admins can manage plans
CREATE POLICY "Admins can insert plans"
ON public.subscription_plans
FOR INSERT
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update plans"
ON public.subscription_plans
FOR UPDATE
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete plans"
ON public.subscription_plans
FOR DELETE
USING (public.is_admin(auth.uid()));

-- Create user_subscriptions table
CREATE TABLE public.user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  plan_id UUID REFERENCES public.subscription_plans(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active', -- active, cancelled, expired, trial
  current_period_start TIMESTAMPTZ DEFAULT now(),
  current_period_end TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on user_subscriptions
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can view their own subscriptions
CREATE POLICY "Users can view their own subscriptions"
ON public.user_subscriptions
FOR SELECT
USING (auth.uid() = user_id);

-- Admins can view all subscriptions
CREATE POLICY "Admins can view all subscriptions"
ON public.user_subscriptions
FOR SELECT
USING (public.is_admin(auth.uid()));

-- Admins can manage subscriptions
CREATE POLICY "Admins can insert subscriptions"
ON public.user_subscriptions
FOR INSERT
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update subscriptions"
ON public.user_subscriptions
FOR UPDATE
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete subscriptions"
ON public.user_subscriptions
FOR DELETE
USING (public.is_admin(auth.uid()));

-- Fix security warning: Add DELETE policy for user_financial_settings
CREATE POLICY "Users can delete their own settings"
ON public.user_financial_settings
FOR DELETE
USING (auth.uid() = user_id);

-- Create admin_activity_log for audit trail
CREATE TABLE public.admin_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL,
  action TEXT NOT NULL,
  target_table TEXT,
  target_id UUID,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on admin_activity_log
ALTER TABLE public.admin_activity_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view activity logs
CREATE POLICY "Admins can view activity logs"
ON public.admin_activity_log
FOR SELECT
USING (public.is_admin(auth.uid()));

-- Admins can insert activity logs
CREATE POLICY "Admins can insert activity logs"
ON public.admin_activity_log
FOR INSERT
WITH CHECK (public.is_admin(auth.uid()));

-- Insert default subscription plans
INSERT INTO public.subscription_plans (name, description, price, billing_period, features, sort_order) VALUES
('Free', 'Piano base gratuito', 0, 'monthly', '["Gestione spese base", "Max 50 spese/mese", "1 progetto"]'::jsonb, 1),
('Pro', 'Per utenti avanzati', 9.99, 'monthly', '["Spese illimitate", "Progetti illimitati", "OCR scansione", "Analisi AI", "Export PDF"]'::jsonb, 2),
('Pro Annuale', 'Risparmia 2 mesi', 99.99, 'yearly', '["Tutto di Pro", "Supporto prioritario", "Backup automatici"]'::jsonb, 3),
('Business', 'Per professionisti', 29.99, 'monthly', '["Tutto di Pro", "Multi-utente", "Fatturazione", "API access", "White-label"]'::jsonb, 4);

-- Trigger for updated_at
CREATE TRIGGER update_user_roles_updated_at
  BEFORE UPDATE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_subscription_plans_updated_at
  BEFORE UPDATE ON public.subscription_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_subscriptions_updated_at
  BEFORE UPDATE ON public.user_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
