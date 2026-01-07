import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

interface SendInvoiceRequest {
  recipientEmail: string;
  recipientName: string;
  senderName: string;
  senderEmail?: string;
  invoiceNumber: string;
  totalAmount: number;
  dueDate: string;
  pdfBase64: string;
  projectName?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Authenticate request
  const { user, error: authError } = await authenticateRequest(req);
  if (authError) return authError;
  console.log('Authenticated user for email send:', user.id);

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      console.error("RESEND_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: "Servizio email non configurato. Contatta l'amministratore." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    const resend = new Resend(RESEND_API_KEY);
    
    const {
      recipientEmail,
      recipientName,
      senderName,
      senderEmail,
      invoiceNumber,
      totalAmount,
      dueDate,
      pdfBase64,
      projectName,
    }: SendInvoiceRequest = await req.json();

    console.log(`Sending invoice ${invoiceNumber} to ${recipientEmail}`);

    // Validate required fields
    if (!recipientEmail || !invoiceNumber || !pdfBase64) {
      return new Response(
        JSON.stringify({ error: "Campi obbligatori mancanti: email destinatario, numero fattura, PDF" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Format amount
    const formattedAmount = new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
    }).format(totalAmount);

    // Format due date
    const formattedDueDate = new Date(dueDate).toLocaleDateString('it-IT', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });

    // Extract base64 data (remove data URL prefix if present)
    let pdfData = pdfBase64;
    if (pdfBase64.startsWith('data:')) {
      pdfData = pdfBase64.split(',')[1];
    }

    // Build email HTML
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Fattura ${invoiceNumber}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #0284c7 0%, #0d9488 100%); color: white; padding: 30px; border-radius: 12px 12px 0 0; text-align: center; }
          .header h1 { margin: 0; font-size: 24px; }
          .header p { margin: 10px 0 0; opacity: 0.9; }
          .content { background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; }
          .invoice-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e2e8f0; }
          .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f1f5f9; }
          .detail-row:last-child { border-bottom: none; }
          .detail-label { color: #64748b; }
          .detail-value { font-weight: 600; color: #0f172a; }
          .total-row { background: linear-gradient(135deg, #0284c7 0%, #0d9488 100%); color: white; padding: 15px 20px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; }
          .total-label { font-size: 14px; opacity: 0.9; }
          .total-amount { font-size: 28px; font-weight: 700; }
          .footer { text-align: center; padding: 20px; color: #64748b; font-size: 14px; }
          .cta { display: inline-block; background: #0284c7; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Fattura N° ${invoiceNumber}</h1>
          <p>da ${senderName}</p>
        </div>
        <div class="content">
          <p>Gentile ${recipientName},</p>
          <p>In allegato trovi la fattura N° <strong>${invoiceNumber}</strong>${projectName ? ` relativa a <strong>${projectName}</strong>` : ''}.</p>
          
          <div class="invoice-details">
            <div class="detail-row">
              <span class="detail-label">Numero Fattura</span>
              <span class="detail-value">${invoiceNumber}</span>
            </div>
            ${projectName ? `
            <div class="detail-row">
              <span class="detail-label">Progetto</span>
              <span class="detail-value">${projectName}</span>
            </div>
            ` : ''}
            <div class="detail-row">
              <span class="detail-label">Scadenza Pagamento</span>
              <span class="detail-value">${formattedDueDate}</span>
            </div>
          </div>
          
          <div class="total-row">
            <span class="total-label">Importo Totale</span>
            <span class="total-amount">${formattedAmount}</span>
          </div>
          
          <p style="margin-top: 20px;">Per qualsiasi chiarimento, non esitare a contattarci.</p>
          
          <p>Cordiali saluti,<br><strong>${senderName}</strong></p>
        </div>
        <div class="footer">
          <p>Questa email è stata inviata automaticamente. La fattura è allegata in formato PDF.</p>
        </div>
      </body>
      </html>
    `;

    // Send email with PDF attachment
    const emailResponse = await resend.emails.send({
      from: senderEmail ? `${senderName} <${senderEmail}>` : `${senderName} <onboarding@resend.dev>`,
      to: [recipientEmail],
      subject: `Fattura N° ${invoiceNumber} - ${senderName}`,
      html: emailHtml,
      attachments: [
        {
          filename: `Fattura_${invoiceNumber.replace(/\//g, '-')}.pdf`,
          content: pdfData,
        },
      ],
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: emailResponse,
        message: `Fattura inviata a ${recipientEmail}` 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error in send-invoice-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Errore nell'invio email" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
