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

// Process base64 in chunks to prevent memory issues
function processBase64Chunks(base64String: string, chunkSize = 32768) {
  const chunks: Uint8Array[] = [];
  let position = 0;
  
  while (position < base64String.length) {
    const chunk = base64String.slice(position, position + chunkSize);
    const binaryChunk = atob(chunk);
    const bytes = new Uint8Array(binaryChunk.length);
    
    for (let i = 0; i < binaryChunk.length; i++) {
      bytes[i] = binaryChunk.charCodeAt(i);
    }
    
    chunks.push(bytes);
    position += chunkSize;
  }

  const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;

  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }

  return result;
}

// Get the correct content type for OpenAI Whisper
function getContentType(mimeType?: string, extension?: string): string {
  // Prioritize explicit extension
  if (extension === 'm4a' || extension === 'mp4') {
    return 'audio/mp4';
  }
  if (extension === 'webm') {
    return 'audio/webm';
  }
  if (extension === 'ogg') {
    return 'audio/ogg';
  }
  
  // Fallback to mimeType parsing
  if (mimeType) {
    if (mimeType.includes('mp4') || mimeType.includes('m4a')) {
      return 'audio/mp4';
    }
    if (mimeType.includes('webm')) {
      return 'audio/webm';
    }
    if (mimeType.includes('ogg')) {
      return 'audio/ogg';
    }
  }
  
  // Default to mp4 (most compatible)
  return 'audio/mp4';
}

// Get the correct file extension for OpenAI Whisper
function getFileExtension(mimeType?: string, extension?: string): string {
  if (extension && ['m4a', 'mp4', 'webm', 'ogg', 'mp3', 'wav'].includes(extension)) {
    return extension;
  }
  
  if (mimeType) {
    if (mimeType.includes('mp4') || mimeType.includes('m4a')) {
      return 'm4a';
    }
    if (mimeType.includes('webm')) {
      return 'webm';
    }
    if (mimeType.includes('ogg')) {
      return 'ogg';
    }
  }
  
  return 'm4a';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Authenticate request
  const { user, error: authError } = await authenticateRequest(req);
  if (authError) return authError;
  console.log('Authenticated user:', user.id);

  try {
    const { audio, mimeType, extension } = await req.json();
    
    if (!audio) {
      console.error('No audio data provided');
      return new Response(
        JSON.stringify({ error: 'Nessun audio ricevuto. Riprova a registrare.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Received audio data, length:', audio.length);
    console.log('Provided MIME type:', mimeType);
    console.log('Provided extension:', extension);

    // Validate audio size
    if (audio.length < 1000) {
      console.error('Audio data too small:', audio.length);
      return new Response(
        JSON.stringify({ error: 'Audio troppo corto. Tieni premuto e parla per almeno 1 secondo.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Process audio in chunks
    let binaryAudio: Uint8Array;
    try {
      binaryAudio = processBase64Chunks(audio);
      console.log('Processed binary audio, size:', binaryAudio.length, 'bytes');
    } catch (decodeError) {
      console.error('Base64 decode error:', decodeError);
      return new Response(
        JSON.stringify({ error: 'Errore decodifica audio. Riprova.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate binary size
    if (binaryAudio.length < 5000) {
      console.error('Binary audio too small:', binaryAudio.length);
      return new Response(
        JSON.stringify({ error: 'Registrazione vuota o corrotta. Controlla i permessi del microfono.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const contentType = getContentType(mimeType, extension);
    const fileExt = getFileExtension(mimeType, extension);
    const fileName = `audio.${fileExt}`;
    
    console.log('Using content type:', contentType);
    console.log('Using filename:', fileName);
    
    // Prepare form data
    const formData = new FormData();
    // Create a new ArrayBuffer copy to satisfy TypeScript
    const bufferCopy = new ArrayBuffer(binaryAudio.byteLength);
    new Uint8Array(bufferCopy).set(binaryAudio);
    const blob = new Blob([bufferCopy], { type: contentType });
    formData.append('file', blob, fileName);
    formData.append('model', 'whisper-1');
    formData.append('language', 'it'); // Italian language

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      console.error('OPENAI_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Servizio vocale non configurato. Contatta l\'assistenza.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Sending request to OpenAI Whisper API...');

    // Send to OpenAI
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      
      // Provide user-friendly error messages
      if (errorText.includes('Invalid file format') || errorText.includes('audio duration')) {
        return new Response(
          JSON.stringify({ 
            error: 'Formato audio non supportato. Su iPhone, usa Safari e parla per almeno 2 secondi.' 
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Troppe richieste. Attendi qualche secondo e riprova.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: 'Errore nel servizio vocale. Riprova tra poco.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = await response.json();
    console.log('Transcription result:', result.text);

    if (!result.text || result.text.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Nessuna voce rilevata. Parla più forte e vicino al microfono.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ text: result.text }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Voice-to-text error:', error);
    return new Response(
      JSON.stringify({ error: 'Errore elaborazione audio. Riprova.' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
