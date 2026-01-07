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

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

const SYSTEM_PROMPT = `You are an expert assistant in creating professional technical reports for naval/maritime projects, specifically PINFABB service reports.

LANGUAGE RULES - VERY IMPORTANT:
1. During the conversation, respond in the SAME LANGUAGE the user is currently using
2. When the user asks to generate a report, CHECK if they specified a different language for the output
3. If the user says "generate report in English", "write in English", "report in inglese" -> generate the report in ENGLISH regardless of conversation language
4. If the user says "genera report in italiano", "scrivi in italiano", "report in Italian" -> generate the report in ITALIAN regardless of conversation language
5. If NO specific language is requested for the report, use the conversation's current language

YOUR PRIMARY GOAL: Collect all information needed for a PINFABB service report template.
During the conversation, actively gather these details:
- Ship name and IMO number
- Flag (nationality)
- Port of work
- Work dates (start date and end date)
- Number of technicians
- Overtime hours and night hours (if any)
- Spare parts used (if any)
- Detailed description of the service performed
- Names for signatures (Chief Engineer, Service Engineer)

CONVERSATION BEHAVIOR:
- When the user describes work, extract relevant data and ask for missing information naturally
- Keep track of all collected data throughout the conversation
- Be friendly and professional

CRITICAL - DATA EXTRACTION:
At the END of EVERY response that contains or discusses project/work information, you MUST include a JSON block with extracted PINFABB data.
Format it EXACTLY like this at the very end of your message:

\`\`\`pinfabb_data
{
  "shipName": "extracted ship name or empty string",
  "imoNumber": "extracted IMO or empty string",
  "flag": "extracted flag/nationality or empty string",
  "port": "extracted port or empty string",
  "dateStart": "DD/MM/YYYY format or empty string",
  "dateEnd": "DD/MM/YYYY format or empty string",
  "numberOfTechnicians": number or 1,
  "overtimeHours": number or 0,
  "nightHours": number or 0,
  "spareParts": "extracted spare parts list or empty string",
  "serviceReport": "the detailed service description text",
  "stabilizationPlant": "plant description or PINFABB Stabilizers",
  "chiefEngineerName": "name if mentioned or empty string",
  "serviceEngineerName": "name if mentioned or empty string"
}
\`\`\`

IMPORTANT: 
- Include this JSON block in EVERY response where you discuss or receive work details
- The JSON should contain ALL data collected so far (cumulative)
- If generating a final report, still include the JSON block with all data
- The serviceReport field should contain the full detailed description of the work done

When the user says "generate report", "genera report finale" or similar:
- Create a professional narrative service report
- Use the language requested (or conversation language if not specified)
- Still include the pinfabb_data JSON block at the end`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Authenticate request
  const { user, error: authError } = await authenticateRequest(req);
  if (authError) return authError;
  console.log('Authenticated user:', user.id);

  try {
    const { messages, projectName, projectDescription, stream = false } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      throw new Error('Messages array is required');
    }

    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Build context with project info
    let systemContent = SYSTEM_PROMPT;
    if (projectName) {
      systemContent += `\n\nProgetto corrente: ${projectName}`;
    }
    if (projectDescription) {
      systemContent += `\nDescrizione: ${projectDescription}`;
    }

    const fullMessages = [
      { role: 'system' as const, content: systemContent },
      ...messages.map((m: ChatMessage) => {
        const role = m.role === 'user' ? 'user' as const : 'assistant' as const;
        return { role, content: m.content };
      })
    ];

    console.log('Sending to OpenAI:', { messageCount: fullMessages.length, stream });

    if (stream) {
      // Streaming response
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: fullMessages,
          stream: true,
          max_tokens: 4000,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('OpenAI API error:', response.status, errorText);
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      return new Response(response.body, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    } else {
      // Non-streaming response
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: fullMessages,
          max_tokens: 4000,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('OpenAI API error:', response.status, errorText);
        
        if (response.status === 429) {
          return new Response(JSON.stringify({ error: 'Limite richieste superato, riprova tra poco' }), {
            status: 429,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;

      if (!content) {
        throw new Error('No response content from AI');
      }

      return new Response(JSON.stringify({ content }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  } catch (error) {
    console.error('Generate report error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Errore nella generazione' }), 
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
