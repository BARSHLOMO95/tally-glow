import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID')!;
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

// Invoice-related keywords in Hebrew and English
const INVOICE_KEYWORDS = [
  'חשבונית', 'קבלה', 'חשבונית מס', 'חשבון', 'invoice', 'receipt', 'bill',
  'payment', 'תשלום', 'הזמנה', 'order', 'אישור תשלום', 'confirmation'
];

// Categories for AI extraction
const VALID_CATEGORIES = [
  'הנהלה וכללי', 'שיווק ופרסום', 'הוצאות משרד', 'נסיעות ורכב',
  'ייעוץ מקצועי', 'ציוד ומחשוב', 'תחזוקה', 'סופרים', 'אחר'
];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { timeRange = 'month' } = await req.json().catch(() => ({ timeRange: 'month' }));

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    // Get user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid user' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get Gmail connection
    const { data: connection, error: connError } = await supabaseAdmin
      .from('gmail_connections')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (connError || !connection) {
      return new Response(JSON.stringify({ error: 'Gmail not connected' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Refresh token if expired
    let accessToken = connection.access_token;
    if (new Date(connection.token_expires_at) <= new Date()) {
      const refreshed = await refreshAccessToken(connection.refresh_token);
      if (refreshed.error) {
        // Token invalid, mark connection as inactive
        await supabaseAdmin
          .from('gmail_connections')
          .update({ is_active: false })
          .eq('id', connection.id);
        
        return new Response(JSON.stringify({ error: 'Gmail authorization expired. Please reconnect.' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      accessToken = refreshed.access_token;
      const expiresAt = new Date(Date.now() + (refreshed.expires_in * 1000));
      
      await supabaseAdmin
        .from('gmail_connections')
        .update({
          access_token: accessToken,
          token_expires_at: expiresAt.toISOString(),
        })
        .eq('id', connection.id);
    }

    // Calculate date based on time range
    const afterDate = calculateAfterDate(timeRange as string);
    const query = buildSearchQuery(afterDate);
    
    console.log('Searching Gmail with query:', query);
    
    const messages = await searchGmailMessages(accessToken, query);
    console.log(`Found ${messages.length} potential invoice emails`);

    let processedCount = 0;
    let invoicesCreated = 0;

    const messagesToProcess = messages.slice(0, 30); // Limit to 30 per sync
    console.log(`Starting to process ${messagesToProcess.length} messages`);

    for (const messageId of messagesToProcess) {
      try {
        console.log(`Processing message: ${messageId}`);
        const result = await processMessage(supabaseAdmin, accessToken, messageId, user.id);
        processedCount++;
        if (result.created) {
          invoicesCreated++;
          console.log(`Created invoice from message ${messageId}`);
        } else {
          console.log(`No invoice created from message ${messageId} - ${result.reason || 'no attachments/links'}`);
        }
      } catch (error) {
        console.error(`Error processing message ${messageId}:`, error);
      }
    }

    console.log(`Sync complete: processed=${processedCount}, created=${invoicesCreated}`);

    // Update last sync time
    await supabaseAdmin
      .from('gmail_connections')
      .update({ last_sync_at: new Date().toISOString() })
      .eq('id', connection.id);

    // Update document usage
    if (invoicesCreated > 0) {
      await incrementDocumentUsage(supabaseAdmin, user.id, invoicesCreated);
    }

    return new Response(JSON.stringify({
      success: true,
      processed: processedCount,
      invoicesCreated,
      totalFound: messages.length,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Gmail sync error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function refreshAccessToken(refreshToken: string) {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      grant_type: 'refresh_token',
    }),
  });
  return response.json();
}

function calculateAfterDate(timeRange: string): Date {
  const now = new Date();
  switch (timeRange) {
    case 'week':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case 'month':
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    case '3months':
      return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    case 'year':
    default:
      const yearAgo = new Date();
      yearAgo.setFullYear(yearAgo.getFullYear() - 1);
      return yearAgo;
  }
}

function buildSearchQuery(afterDate: Date): string {
  const dateStr = afterDate.toISOString().split('T')[0].replace(/-/g, '/');
  const keywordQuery = INVOICE_KEYWORDS.map(k => `"${k}"`).join(' OR ');
  return `(${keywordQuery}) after:${dateStr} (has:attachment OR from:invoice OR from:receipt OR from:billing)`;
}

async function searchGmailMessages(accessToken: string, query: string): Promise<string[]> {
  const messages: string[] = [];
  let pageToken: string | undefined;

  do {
    const url = new URL('https://gmail.googleapis.com/gmail/v1/users/me/messages');
    url.searchParams.set('q', query);
    url.searchParams.set('maxResults', '100');
    if (pageToken) url.searchParams.set('pageToken', pageToken);

    const response = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const data = await response.json();
    
    if (data.messages) {
      messages.push(...data.messages.map((m: any) => m.id));
    }
    
    pageToken = data.nextPageToken;
  } while (pageToken && messages.length < 200);

  return messages;
}

async function processMessage(
  supabase: any,
  accessToken: string,
  messageId: string,
  userId: string
): Promise<{ created: boolean; reason?: string }> {
  // Get full message
  const response = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  
  if (!response.ok) {
    console.error(`Failed to fetch message ${messageId}: ${response.status}`);
    return { created: false, reason: `fetch failed: ${response.status}` };
  }
  
  const message = await response.json();
  
  // Extract message details
  const headers = message.payload?.headers || [];
  const subject = headers.find((h: any) => h.name === 'Subject')?.value || '';
  const from = headers.find((h: any) => h.name === 'From')?.value || '';
  const date = headers.find((h: any) => h.name === 'Date')?.value || '';
  
  console.log(`Message subject: "${subject.substring(0, 50)}..." from: ${from.substring(0, 30)}`);
  
  // Check for attachments (PDF, images)
  const attachments = findAttachments(message.payload);
  console.log(`Found ${attachments.length} attachments in message`);
  
  // Check for invoice links in body
  const body = extractBody(message.payload);
  const invoiceLinks = findInvoiceLinks(body);
  console.log(`Found ${invoiceLinks.length} invoice links in message`);
  
  if (attachments.length === 0 && invoiceLinks.length === 0) {
    return { created: false, reason: 'no attachments or links' };
  }

  // Process attachments
  for (const attachment of attachments) {
    console.log(`Processing attachment: ${attachment.filename} (${attachment.mimeType})`);
    const attachmentData = await getAttachment(accessToken, messageId, attachment.attachmentId);
    if (attachmentData) {
      console.log(`Got attachment data, size: ${attachmentData.length} bytes`);
      const imageUrl = await uploadToStorage(supabase, userId, attachmentData, attachment.filename);
      if (imageUrl) {
        console.log(`Uploaded to storage: ${imageUrl}`);
        // Pass the binary data for AI extraction (especially important for PDFs)
        await createInvoiceFromImage(supabase, userId, imageUrl, from, date, attachmentData, attachment.mimeType);
        return { created: true };
      } else {
        console.error(`Failed to upload attachment: ${attachment.filename}`);
      }
    } else {
      console.error(`Failed to get attachment data: ${attachment.filename}`);
    }
  }

  // Process invoice links
  for (const link of invoiceLinks) {
    console.log(`Creating invoice from link: ${link.substring(0, 50)}...`);
    await createInvoiceFromLink(supabase, userId, link, from, date);
    return { created: true };
  }

  return { created: false, reason: 'failed to process attachments/links' };
}

function findAttachments(payload: any): Array<{ filename: string; attachmentId: string; mimeType: string }> {
  const attachments: Array<{ filename: string; attachmentId: string; mimeType: string }> = [];
  
  function traverse(part: any) {
    if (part.filename && part.body?.attachmentId) {
      const mimeType = part.mimeType || '';
      if (mimeType.includes('pdf') || mimeType.includes('image')) {
        attachments.push({
          filename: part.filename,
          attachmentId: part.body.attachmentId,
          mimeType,
        });
      }
    }
    if (part.parts) {
      part.parts.forEach(traverse);
    }
  }
  
  traverse(payload);
  return attachments;
}

function extractBody(payload: any): string {
  let body = '';
  
  function traverse(part: any) {
    if (part.mimeType === 'text/plain' || part.mimeType === 'text/html') {
      if (part.body?.data) {
        body += atob(part.body.data.replace(/-/g, '+').replace(/_/g, '/'));
      }
    }
    if (part.parts) {
      part.parts.forEach(traverse);
    }
  }
  
  traverse(payload);
  return body;
}

function findInvoiceLinks(body: string): string[] {
  const urlRegex = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/g;
  const urls = body.match(urlRegex) || [];
  
  // Filter for likely invoice links
  const invoicePatterns = ['invoice', 'receipt', 'bill', 'payment', 'download', 'pdf', 'view'];
  return urls.filter(url => 
    invoicePatterns.some(pattern => url.toLowerCase().includes(pattern))
  ).slice(0, 3); // Max 3 links per email
}

async function getAttachment(accessToken: string, messageId: string, attachmentId: string): Promise<Uint8Array | null> {
  try {
    const response = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/attachments/${attachmentId}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    
    const data = await response.json();
    if (data.data) {
      const base64 = data.data.replace(/-/g, '+').replace(/_/g, '/');
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      return bytes;
    }
  } catch (error) {
    console.error('Error getting attachment:', error);
  }
  return null;
}

async function uploadToStorage(
  supabase: any,
  userId: string,
  data: Uint8Array,
  filename: string
): Promise<string | null> {
  try {
    const timestamp = Date.now();
    const safeName = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
    const path = `${userId}/${timestamp}_${safeName}`;
    
    const { error } = await supabase.storage
      .from('invoices')
      .upload(path, data, {
        contentType: filename.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg',
        upsert: false,
      });

    if (error) {
      console.error('Upload error:', error);
      return null;
    }

    const { data: urlData } = supabase.storage.from('invoices').getPublicUrl(path);
    return urlData.publicUrl;
  } catch (error) {
    console.error('Error uploading to storage:', error);
    return null;
  }
}

async function createInvoiceFromImage(
  supabase: any,
  userId: string,
  imageUrl: string,
  fromEmail: string,
  emailDate: string,
  fileData?: Uint8Array,
  mimeType?: string
): Promise<void> {
  console.log(`Creating invoice from image, URL: ${imageUrl.substring(0, 80)}...`);
  
  // Extract data using AI - pass base64 for PDFs since URL won't work
  let extractedData: any = {};
  
  if (fileData && mimeType) {
    // For files we have the binary data - convert to base64 and send
    extractedData = await extractInvoiceDataFromBytes(fileData, mimeType);
  } else {
    // For image URLs, try direct extraction
    extractedData = await extractInvoiceDataFromUrl(imageUrl);
  }
  
  console.log('Extracted data:', JSON.stringify(extractedData));
  
  // Parse supplier from email if not extracted
  const supplierName = extractedData.supplier_name || parseSupplierFromEmail(fromEmail);
  
  // Parse date
  const documentDate = extractedData.document_date || parseDate(emailDate);
  
  const { error: insertError } = await supabase.from('invoices').insert({
    user_id: userId,
    supplier_name: supplierName,
    document_number: extractedData.document_number || '',
    document_date: documentDate,
    total_amount: extractedData.total_amount || 0,
    category: extractedData.category || 'אחר',
    business_type: extractedData.business_type || 'עוסק מורשה',
    image_url: imageUrl,
    entry_method: 'gmail_sync',
    status: extractedData.total_amount ? 'חדש' : 'ממתין לבדיקה ידנית',
  });
  
  if (insertError) {
    console.error('Error inserting invoice:', insertError);
  } else {
    console.log('Invoice inserted successfully');
  }
}

async function createInvoiceFromLink(
  supabase: any,
  userId: string,
  link: string,
  fromEmail: string,
  emailDate: string
): Promise<void> {
  const supplierName = parseSupplierFromEmail(fromEmail);
  const documentDate = parseDate(emailDate);
  
  await supabase.from('invoices').insert({
    user_id: userId,
    supplier_name: supplierName,
    document_number: '',
    document_date: documentDate,
    total_amount: 0,
    category: 'אחר',
    business_type: 'עוסק מורשה',
    image_url: link,
    entry_method: 'gmail_sync',
    status: 'ממתין לבדיקה ידנית',
  });
}

// Extract from URL (for images)
async function extractInvoiceDataFromUrl(imageUrl: string): Promise<any> {
  try {
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY not configured');
      return {};
    }
    
    console.log('Extracting invoice data from URL using Lovable AI...');
    
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are an invoice data extraction assistant for Israeli invoices. Extract the following from the invoice:
- supplier_name: The company/business name that issued the invoice (in Hebrew if available)
- document_number: Invoice number or receipt number
- document_date: Date in YYYY-MM-DD format
- total_amount: Total amount in numbers only (the final total including VAT)
- category: One of these categories only: ${VALID_CATEGORIES.join(', ')}
- business_type: One of: עוסק מורשה, עוסק פטור, חברה בע"מ, ספק חו"ל

Respond in JSON format only. If you cannot extract a field, use null.`
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Extract invoice data from this document:' },
              { type: 'image_url', image_url: { url: imageUrl } }
            ]
          }
        ],
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      console.error('Lovable AI error:', response.status, await response.text());
      return {};
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '{}';
    console.log('AI response:', content);
    
    // Parse JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (error) {
    console.error('Error extracting invoice data from URL:', error);
  }
  return {};
}

// Extract from binary data (for PDFs and images)
async function extractInvoiceDataFromBytes(data: Uint8Array, mimeType: string): Promise<any> {
  try {
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY not configured');
      return {};
    }
    
    console.log(`Extracting invoice data from ${mimeType} using Lovable AI (base64)...`);
    
    // Convert to base64
    let binary = '';
    const bytes = new Uint8Array(data);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64Data = btoa(binary);
    
    // Determine media type for Gemini
    let mediaType = mimeType;
    if (mimeType.includes('pdf')) {
      mediaType = 'application/pdf';
    } else if (mimeType.includes('image')) {
      mediaType = mimeType.includes('png') ? 'image/png' : 'image/jpeg';
    }
    
    const dataUrl = `data:${mediaType};base64,${base64Data}`;
    console.log(`Created data URL with media type: ${mediaType}, size: ${base64Data.length} chars`);
    
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are an invoice data extraction assistant for Israeli invoices. Extract the following from the invoice:
- supplier_name: The company/business name that issued the invoice (in Hebrew if available)
- document_number: Invoice number or receipt number
- document_date: Date in YYYY-MM-DD format
- total_amount: Total amount in numbers only (the final total including VAT)
- category: One of these categories only: ${VALID_CATEGORIES.join(', ')}
- business_type: One of: עוסק מורשה, עוסק פטור, חברה בע"מ, ספק חו"ל

Respond in JSON format only. If you cannot extract a field, use null.`
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Extract invoice data from this document:' },
              { type: 'image_url', image_url: { url: dataUrl } }
            ]
          }
        ],
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI error:', response.status, errorText);
      return {};
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content || '{}';
    console.log('AI response:', content);
    
    // Parse JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (error) {
    console.error('Error extracting invoice data from bytes:', error);
  }
  return {};
}

function parseSupplierFromEmail(from: string): string {
  // Extract name from email format "Name <email@domain.com>"
  const nameMatch = from.match(/^([^<]+)/);
  if (nameMatch) {
    return nameMatch[1].trim().replace(/"/g, '');
  }
  // Extract domain if no name
  const domainMatch = from.match(/@([^.]+)/);
  if (domainMatch) {
    return domainMatch[1].charAt(0).toUpperCase() + domainMatch[1].slice(1);
  }
  return 'Unknown';
}

function parseDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toISOString().split('T')[0];
  } catch {
    return new Date().toISOString().split('T')[0];
  }
}

async function incrementDocumentUsage(supabase: any, userId: string, count: number): Promise<void> {
  try {
    const now = new Date();
    const monthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    
    const { data: existing } = await supabase
      .from('document_usage')
      .select('document_count')
      .eq('user_id', userId)
      .eq('month_year', monthYear)
      .maybeSingle();
    
    const currentCount = existing?.document_count || 0;
    
    await supabase
      .from('document_usage')
      .upsert({
        user_id: userId,
        month_year: monthYear,
        document_count: currentCount + count,
      }, {
        onConflict: 'user_id,month_year',
      });
  } catch (error) {
    console.error('Error incrementing document usage:', error);
  }
}
