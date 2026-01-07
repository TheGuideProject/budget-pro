import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Authentication helper
async function authenticateRequest(req: Request): Promise<{ user: any; error: Response | null }> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return {
      user: null,
      error: new Response(JSON.stringify({ error: 'Non autorizzato' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }),
    };
  }

  const token = authHeader.replace('Bearer ', '');
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!
  );

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) {
    return {
      user: null,
      error: new Response(JSON.stringify({ error: 'Token non valido' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }),
    };
  }

  return { user, error: null };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Authenticate request
  const { user, error: authError } = await authenticateRequest(req);
  if (authError) return authError;
  console.log('Authenticated user:', user.id);

  try {
    const { primaryUserId, expenses } = await req.json();

    // Security check: user can only create expenses for themselves OR for their linked primary user
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Verify that the authenticated user has permission to create expenses for primaryUserId
    if (user.id !== primaryUserId) {
      // Check if user is linked to the primary user
      const { data: profile } = await supabaseAdmin
        .from('user_profiles')
        .select('linked_to_user_id')
        .eq('user_id', user.id)
        .single();

      if (!profile || profile.linked_to_user_id !== primaryUserId) {
        return new Response(
          JSON.stringify({ success: false, error: 'Non autorizzato a creare spese per questo utente' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    console.log('Creating primary expenses for user:', primaryUserId);
    console.log('Number of expenses to create:', expenses?.length || 0);

    if (!expenses || expenses.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing expenses' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const dbRows = expenses.map((e: any) => ({
      description: e.description || 'Trasferimento familiare',
      amount: e.amount,
      category: e.category || 'fissa',
      date: e.date,
      is_family_expense: true,
      is_paid: true,
      payment_method: e.payment_method || 'bonifico',
      expense_type: e.expense_type || 'privata',
      user_id: primaryUserId,
      recurring: false,
    }));

    console.log('Inserting expenses:', JSON.stringify(dbRows, null, 2));

    const { data, error } = await supabaseAdmin
      .from('expenses')
      .insert(dbRows)
      .select();

    if (error) {
      console.error('Error inserting expenses:', error);
      return new Response(
        JSON.stringify({ success: false, error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Successfully created', data?.length || 0, 'expenses for primary user');

    return new Response(
      JSON.stringify({ success: true, count: data?.length || 0 }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in create-primary-expenses:', errorMessage);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
