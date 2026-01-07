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
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Authenticate request
  const { user, error: authError } = await authenticateRequest(req);
  if (authError) return authError;
  console.log('Authenticated user for sync:', user.id);

  try {
    console.log('Starting robust family transfers sync...');

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get all budget transfers
    const { data: transfers, error: transfersError } = await supabaseAdmin
      .from('budget_transfers')
      .select('*');

    if (transfersError) {
      console.error('Error fetching transfers:', transfersError);
      throw transfersError;
    }

    console.log(`Found ${transfers?.length || 0} transfers to sync`);

    // Get all expenses that have a linked_transfer_id (family expenses linked to transfers)
    const { data: linkedExpenses, error: expensesError } = await supabaseAdmin
      .from('expenses')
      .select('*')
      .not('linked_transfer_id', 'is', null);

    if (expensesError) {
      console.error('Error fetching linked expenses:', expensesError);
      throw expensesError;
    }

    console.log(`Found ${linkedExpenses?.length || 0} existing linked expenses`);

    // Create a map of existing expenses by linked_transfer_id for quick lookup
    const expensesByTransferId = new Map<string, any>();
    for (const expense of linkedExpenses || []) {
      expensesByTransferId.set(expense.linked_transfer_id, expense);
    }

    // Create a set of all transfer IDs for orphan detection
    const transferIds = new Set((transfers || []).map(t => t.id));

    let created = 0;
    let updated = 0;
    let deleted = 0;
    let unchanged = 0;

    // Process each transfer
    for (const transfer of transfers || []) {
      const [year, month] = transfer.month.split('-').map(Number);
      const expenseDate = new Date(year, month - 1, 15); // Middle of the month

      const existingExpense = expensesByTransferId.get(transfer.id);

      if (existingExpense) {
        // Check if update is needed
        const needsUpdate = 
          Number(existingExpense.amount) !== Number(transfer.amount) ||
          existingExpense.description !== (transfer.description || 'Trasferimento familiare');

        if (needsUpdate) {
          const { error: updateError } = await supabaseAdmin
            .from('expenses')
            .update({
              amount: Number(transfer.amount),
              description: transfer.description || 'Trasferimento familiare',
              updated_at: new Date().toISOString(),
            })
            .eq('id', existingExpense.id);

          if (updateError) {
            console.error(`Error updating expense ${existingExpense.id}:`, updateError);
          } else {
            updated++;
            console.log(`Updated expense for transfer ${transfer.id}`);
          }
        } else {
          unchanged++;
        }
      } else {
        // Create new expense with linked_transfer_id
        const { error: insertError } = await supabaseAdmin
          .from('expenses')
          .insert({
            description: transfer.description || 'Trasferimento familiare',
            amount: Number(transfer.amount),
            category: 'fissa',
            date: expenseDate.toISOString(),
            is_family_expense: true,
            is_paid: true,
            payment_method: 'bonifico',
            expense_type: 'privata',
            user_id: transfer.from_user_id,
            recurring: false,
            linked_transfer_id: transfer.id, // Critical: Link to transfer!
          });

        if (insertError) {
          // Check if it's a unique constraint violation (already exists)
          if (insertError.code === '23505') {
            console.log(`Expense already exists for transfer ${transfer.id}, skipping`);
            unchanged++;
          } else {
            console.error(`Error creating expense for transfer ${transfer.id}:`, insertError);
          }
        } else {
          created++;
          console.log(`Created expense for transfer ${transfer.id}`);
        }
      }
    }

    // Delete orphan expenses (linked to transfers that no longer exist)
    const orphanExpenses = (linkedExpenses || []).filter(
      expense => !transferIds.has(expense.linked_transfer_id)
    );

    if (orphanExpenses.length > 0) {
      const orphanIds = orphanExpenses.map(e => e.id);
      const { error: deleteError } = await supabaseAdmin
        .from('expenses')
        .delete()
        .in('id', orphanIds);

      if (deleteError) {
        console.error('Error deleting orphan expenses:', deleteError);
      } else {
        deleted = orphanExpenses.length;
        console.log(`Deleted ${deleted} orphan expenses`);
      }
    }

    const summary = {
      success: true,
      transfers: transfers?.length || 0,
      created,
      updated,
      deleted,
      unchanged,
    };

    console.log('Sync completed:', summary);

    return new Response(
      JSON.stringify(summary),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in sync-family-transfers:', errorMessage);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
