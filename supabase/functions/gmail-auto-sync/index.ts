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

const INVOICE_KEYWORDS = [
  'חשבונית', 'קבלה', 'חשבונית מס', 'חשבון', 'invoice', 'receipt', 'bill',
  'payment', 'תשלום', 'הזמנה', 'order', 'אישור תשלום', 'confirmation'
];

const VALID_CATEGORIES = [
  'הנהלה וכללי', 'שיווק ופרסום', 'הוצאות משרד', 'נסיעות ורכב',
  'ייעוץ מקצועי', 'ציוד ומחשוב', 'תחזוקה', 'סופרים', 'אחר'
];

type FileSource = 'gmail_attachment' | 'gmail_external_link';
type StorageStatus = 'success' | 'failed' | 'pending';

interface StorageResult {
  success: boolean;
  storageUrl?: string;
  fileData?: Uint8Array;
  mimeType?: string;
  error?: string;
}

interface InvoiceMetadata {
  storageUrl: string | null;
  fileName: string;
  mimeType: string;
  fileSource: FileSource;
  storageStatus: StorageStatus;
  originalUrl: string | null;
  storageError: string | null;
  fileData?: Uint8Array;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    console.log('Starting automatic Gmail sync for all active connections...');

    const { data: connections, error: connError } = await supabaseAdmin
      .from('gmail_connections')
      .select('*')
      .eq('is_active', true);

    if (connError) {
      throw new Error(`Failed to fetch connections: ${connError.message}`);
    }

    if (!connections || connections.length === 0) {
      console.log('No active Gmail connections found');
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'No active connections',
        processed: 0 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Found ${connections.length} active Gmail connections`);

    let totalProcessed = 0;
    let totalInvoices = 0;
    const results: Array<{ email: string; processed: number; invoices: number; error?: string }> = [];

    for (const connection of connections) {
      try {
        console.log(`Processing connection for: ${connection.email}`);
        
        let accessToken = connection.access_token;
        if (new Date(connection.token_expires_at) <= new Date()) {
          const refreshed = await refreshAccessToken(connection.refresh_token);
          if (refreshed.error) {
            console.error(`Token refresh failed for ${connection.email}:`, refreshed.error);
            await supabaseAdmin
              .from('gmail_connections')
              .update({ is_active: false })
              .eq('id', connection.id);
            results.push({ email: connection.email, processed: 0, invoices: 0, error: 'Token expired' });
            continue;
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

        const afterDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const query = buildSearchQuery(afterDate);
        
        console.log(`Searching emails for ${connection.email}...`);
        const messages = await searchGmailMessages(accessToken, query);
        console.log(`Found ${messages.length} potential invoice emails`);

        let processedCount = 0;
        let invoicesCreated = 0;

        for (const messageId of messages.slice(0, 20)) {
          try {
            const result = await processMessage(supabaseAdmin, accessToken, messageId, connection.user_id);
            processedCount++;
            if (result.created) invoicesCreated++;
          } catch (error) {
            console.error(`Error processing message ${messageId}:`, error);
          }
        }

        await supabaseAdmin
          .from('gmail_connections')
          .update({ last_sync_at: new Date().toISOString() })
          .eq('id', connection.id);

        if (invoicesCreated > 0) {
          await incrementDocumentUsage(supabaseAdmin, connection.user_id, invoicesCreated);
        }

        totalProcessed += processedCount;
        totalInvoices += invoicesCreated;
        results.push({ email: connection.email, processed: processedCount, invoices: invoicesCreated });

      } catch (error) {
        console.error(`Error processing connection ${connection.email}:`, error);
        results.push({ 
          email: connection.email, 
          processed: 0, 
          invoices: 0, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    }

    console.log(`Auto-sync complete. Total: ${totalProcessed} processed, ${totalInvoices} invoices created`);

    return new Response(JSON.stringify({
      success: true,
      totalConnections: connections.length,
      totalProcessed,
      totalInvoices,
      results,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Gmail auto-sync error:', error);
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
    url.searchParams.set('maxResults', '50');
    if (pageToken) url.searchParams.set('pageToken', pageToken);

    const response = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const data = await response.json();
    
    if (data.messages) {
      messages.push(...data.messages.map((m: any) => m.id));
    }
    
    pageToken = data.nextPageToken;
  } while (pageToken && messages.length < 50);

  return messages;
}

async function processMessage(
  supabase: any,
  accessToken: string,
  messageId: string,
  userId: string
): Promise<{ created: boolean }> {
  const response = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  
  const message = await response.json();
  
  const headers = message.payload?.headers || [];
  const from = headers.find((h: any) => h.name === 'From')?.value || '';
  const date = headers.find((h: any) => h.name === 'Date')?.value || '';
  
  const attachments = findAttachments(message.payload);
  const body = extractBody(message.payload);
  const invoiceLinks = findInvoiceLinks(body);
  
  if (attachments.length === 0 && invoiceLinks.length === 0) {
    return { created: false };
  }

  for (const attachment of attachments) {
    const attachmentData = await getAttachmentFromGmail(accessToken, messageId, attachment.attachmentId);
    
    if (attachmentData) {
      const uploadResult = await uploadToStorage(supabase, userId, attachmentData, attachment.filename, attachment.mimeType);
      
      await createInvoice(supabase, userId, {
        storageUrl: uploadResult.success ? uploadResult.storageUrl! : null,
        fileName: attachment.filename,
        mimeType: attachment.mimeType,
        fileSource: 'gmail_attachment',
        storageStatus: uploadResult.success ? 'success' : 'failed',
        originalUrl: null,
        storageError: uploadResult.error || null,
        fileData: attachmentData,
      }, from, date);
      return { created: true };
    }
  }

  for (const link of invoiceLinks) {
    const downloadResult = await downloadAndUploadFromLink(supabase, userId, link);
    
    await createInvoice(supabase, userId, {
      storageUrl: downloadResult.success ? downloadResult.storageUrl! : null,
      fileName: `gmail_link_${Date.now()}`,
      mimeType: downloadResult.mimeType || 'application/pdf',
      fileSource: 'gmail_external_link',
      storageStatus: downloadResult.success ? 'success' : 'failed',
      originalUrl: link,
      storageError: downloadResult.error || null,
      fileData: downloadResult.fileData,
    }, from, date);
    return { created: true };
  }

  return { created: false };
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
  
  const invoicePatterns = ['invoice', 'receipt', 'bill', 'payment', 'download', 'pdf', 'view'];
  return urls.filter(url => 
    invoicePatterns.some(pattern => url.toLowerCase().includes(pattern))
  ).slice(0, 3);
}

async function getAttachmentFromGmail(accessToken: string, messageId: string, attachmentId: string): Promise<Uint8Array | null> {
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
  filename: string,
  mimeType: string
): Promise<StorageResult> {
  try {
    const timestamp = Date.now();
    const safeName = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
    const path = `${userId}/${timestamp}_${safeName}`;
    
    let contentType = mimeType;
    if (!contentType || contentType === '') {
      if (filename.toLowerCase().endsWith('.pdf')) {
        contentType = 'application/pdf';
      } else if (filename.toLowerCase().match(/\.(jpg|jpeg)$/)) {
        contentType = 'image/jpeg';
      } else if (filename.toLowerCase().endsWith('.png')) {
        contentType = 'image/png';
      } else {
        contentType = 'application/octet-stream';
      }
    }
    
    const { error } = await supabase.storage
      .from('invoices')
      .upload(path, data, {
        contentType,
        upsert: false,
      });

    if (error) {
      return { success: false, error: error.message };
    }

    const { data: urlData } = supabase.storage.from('invoices').getPublicUrl(path);
    return { success: true, storageUrl: urlData.publicUrl, mimeType: contentType };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Upload failed' };
  }
}

async function downloadAndUploadFromLink(
  supabase: any,
  userId: string,
  link: string
): Promise<StorageResult> {
  try {
    const response = await fetch(link, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; InvoiceBot/1.0)',
        'Accept': 'application/pdf,image/*,*/*',
      },
      redirect: 'follow',
    });
    
    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}` };
    }
    
    const contentType = response.headers.get('content-type') || '';
    const isPdf = contentType.includes('pdf') || link.toLowerCase().includes('.pdf');
    const isImage = contentType.includes('image') || /\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(link);
    
    if (!isPdf && !isImage) {
      if (contentType.includes('html')) {
        return { success: false, error: 'HTML page, not direct file' };
      }
      return { success: false, error: `Unsupported: ${contentType}` };
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const fileData = new Uint8Array(arrayBuffer);
    
    if (fileData.length > 10 * 1024 * 1024) {
      return { success: false, error: 'File too large (>10MB)' };
    }
    
    if (fileData.length < 1024) {
      return { success: false, error: 'File too small (<1KB)' };
    }
    
    let extension = 'pdf';
    let mimeType = 'application/pdf';
    
    if (isImage) {
      if (contentType.includes('png')) { extension = 'png'; mimeType = 'image/png'; }
      else if (contentType.includes('gif')) { extension = 'gif'; mimeType = 'image/gif'; }
      else { extension = 'jpg'; mimeType = 'image/jpeg'; }
    }
    
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 8);
    const path = `${userId}/gmail_link_${timestamp}_${randomId}.${extension}`;
    
    const { error } = await supabase.storage
      .from('invoices')
      .upload(path, fileData, { contentType: mimeType, upsert: false });

    if (error) {
      return { success: false, error: error.message };
    }

    const { data: urlData } = supabase.storage.from('invoices').getPublicUrl(path);
    return { success: true, storageUrl: urlData.publicUrl, fileData, mimeType };
    
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Download failed' };
  }
}

async function createInvoice(
  supabase: any,
  userId: string,
  metadata: InvoiceMetadata,
  fromEmail: string,
  emailDate: string
): Promise<void> {
  let extractedData: any = {};
  
  if (metadata.fileData && metadata.mimeType && metadata.storageStatus === 'success') {
    extractedData = await extractInvoiceDataFromBytes(metadata.fileData, metadata.mimeType);
  }
  
  const supplierName = extractedData.supplier_name || parseSupplierFromEmail(fromEmail);
  const documentDate = extractedData.document_date || parseDate(emailDate);
  
  let status: string;
  if (metadata.storageStatus === 'failed') {
    status = 'ממתין לבדיקה ידנית';
  } else if (extractedData.total_amount && extractedData.total_amount > 0) {
    status = 'חדש';
  } else {
    status = 'ממתין לבדיקה ידנית';
  }
  
  await supabase.from('invoices').insert({
    user_id: userId,
    supplier_name: supplierName,
    document_number: extractedData.document_number || '',
    document_date: documentDate,
    total_amount: extractedData.total_amount || 0,
    category: extractedData.category || 'אחר',
    business_type: extractedData.business_type || 'עוסק מורשה',
    image_url: metadata.storageStatus === 'success' ? metadata.storageUrl : null,
    entry_method: 'gmail_sync',
    status,
    file_name: metadata.fileName,
    mime_type: metadata.mimeType,
    file_source: metadata.fileSource,
    storage_status: metadata.storageStatus,
    original_url: metadata.originalUrl,
    storage_error: metadata.storageError,
  });
}

async function extractInvoiceDataFromBytes(data: Uint8Array, mimeType: string): Promise<any> {
  try {
    if (!LOVABLE_API_KEY) return {};
    
    let binary = '';
    const bytes = new Uint8Array(data);
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64Data = btoa(binary);
    
    let mediaType = mimeType.includes('pdf') ? 'application/pdf' : 
                    mimeType.includes('png') ? 'image/png' : 'image/jpeg';
    
    const dataUrl = `data:${mediaType};base64,${base64Data}`;
    
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
            content: `Extract from Israeli invoice: supplier_name, document_number, document_date (YYYY-MM-DD), total_amount (number), category (${VALID_CATEGORIES.join(', ')}), business_type (עוסק מורשה/עוסק פטור/חברה בע"מ/ספק חו"ל). JSON only.`
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Extract invoice data:' },
              { type: 'image_url', image_url: { url: dataUrl } }
            ]
          }
        ],
      }),
    });

    if (!response.ok) return {};

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content || '{}';
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error('AI extraction error:', error);
  }
  return {};
}

function parseSupplierFromEmail(from: string): string {
  const nameMatch = from.match(/^([^<]+)/);
  if (nameMatch) return nameMatch[1].trim().replace(/"/g, '');
  const domainMatch = from.match(/@([^.]+)/);
  if (domainMatch) return domainMatch[1].charAt(0).toUpperCase() + domainMatch[1].slice(1);
  return 'Unknown';
}

function parseDate(dateStr: string): string {
  try {
    return new Date(dateStr).toISOString().split('T')[0];
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
      .select('id, document_count')
      .eq('user_id', userId)
      .eq('month_year', monthYear)
      .maybeSingle();

    if (existing) {
      await supabase
        .from('document_usage')
        .update({ document_count: existing.document_count + count })
        .eq('id', existing.id);
    } else {
      await supabase
        .from('document_usage')
        .insert({ user_id: userId, month_year: monthYear, document_count: count });
    }
  } catch (error) {
    console.error('Error updating document usage:', error);
  }
}
