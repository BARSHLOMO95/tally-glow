import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID')!;
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

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

// File source types
type FileSource = 'gmail_attachment' | 'gmail_external_link' | 'whatsapp' | 'manual_upload' | 'public_link';
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
  previewImageUrl: string | null;
  additionalImages: string[];
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
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json().catch(() => ({}));
    const { timeRange = 'month', action, invoiceId, connectionId } = body;

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

    // Handle retry action
    if (action === 'retry') {
      return await handleRetry(supabaseAdmin, user.id, invoiceId);
    }

    // Regular sync flow
    return await handleSync(supabaseAdmin, user.id, authHeader, timeRange, connectionId);

  } catch (error) {
    console.error('Gmail sync error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// ============= RETRY HANDLER =============
async function handleRetry(supabase: any, userId: string, invoiceId?: string): Promise<Response> {
  console.log(`Retry request for user ${userId}, invoiceId: ${invoiceId || 'all failed'}`);
  
  let query = supabase
    .from('invoices')
    .select('*')
    .eq('user_id', userId)
    .eq('storage_status', 'failed');
  
  if (invoiceId) {
    query = query.eq('id', invoiceId);
  }
  
  const { data: failedInvoices, error: fetchError } = await query;
  
  if (fetchError) {
    return new Response(JSON.stringify({ error: 'Failed to fetch invoices' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  
  if (!failedInvoices || failedInvoices.length === 0) {
    return new Response(JSON.stringify({ 
      success: true, 
      message: 'No failed invoices to retry',
      retried: 0,
      succeeded: 0,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  
  console.log(`Found ${failedInvoices.length} failed invoices to retry`);
  
  let succeeded = 0;
  let stillFailed = 0;
  
  for (const invoice of failedInvoices) {
    if (invoice.original_url && invoice.file_source === 'gmail_external_link') {
      console.log(`Retrying download for invoice ${invoice.id} from ${invoice.original_url}`);
      
      const result = await downloadAndUploadFromLink(supabase, userId, invoice.original_url);
      
      if (result.success && result.storageUrl) {
        // Generate PDF preview if it's a PDF
        let previewImageUrl: string | null = null;
        if (result.mimeType?.includes('pdf') && result.fileData) {
          previewImageUrl = await generatePdfPreview(supabase, userId, result.fileData, `retry_${invoice.id}.pdf`);
        }
        
        const { error: updateError } = await supabase
          .from('invoices')
          .update({
            image_url: result.storageUrl,
            preview_image_url: previewImageUrl,
            storage_status: 'success',
            storage_error: null,
            mime_type: result.mimeType,
            updated_at: new Date().toISOString(),
          })
          .eq('id', invoice.id);
        
        if (!updateError) {
          succeeded++;
          console.log(`Successfully retried invoice ${invoice.id}`);
        }
      } else {
        await supabase
          .from('invoices')
          .update({
            storage_error: result.error || 'Retry failed',
            updated_at: new Date().toISOString(),
          })
          .eq('id', invoice.id);
        stillFailed++;
        console.log(`Retry still failed for invoice ${invoice.id}: ${result.error}`);
      }
    } else {
      console.log(`Cannot retry invoice ${invoice.id} - no original_url or not an external link`);
      stillFailed++;
    }
  }
  
  return new Response(JSON.stringify({
    success: true,
    retried: failedInvoices.length,
    succeeded,
    stillFailed,
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// ============= SYNC HANDLER =============
async function handleSync(supabaseAdmin: any, userId: string, authHeader: string, timeRange: string, connectionId?: string): Promise<Response> {
  let query = supabaseAdmin
    .from('gmail_connections')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true);

  // If connectionId is provided, use it; otherwise, sync all active connections
  if (connectionId) {
    query = query.eq('id', connectionId);
  }

  const { data: connections, error: connError } = await query;

  if (connError || !connections || connections.length === 0) {
    return new Response(JSON.stringify({ error: 'Gmail not connected' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Process each connection
  let totalProcessed = 0;
  let totalInvoicesCreated = 0;
  let totalFound = 0;

  for (const connection of connections) {
    console.log(`Processing connection: ${connection.email} (${connection.account_label})`);

    let accessToken = connection.access_token;
    if (new Date(connection.token_expires_at) <= new Date()) {
      const refreshed = await refreshAccessToken(connection.refresh_token);
      if (refreshed.error) {
        console.error(`Token refresh failed for ${connection.email}`);
        await supabaseAdmin
          .from('gmail_connections')
          .update({ is_active: false })
          .eq('id', connection.id);

        // Continue to next connection instead of returning
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

    const afterDate = calculateAfterDate(timeRange);
    const query = buildSearchQuery(afterDate);

    console.log(`Searching ${connection.email} with query:`, query);

    const messages = await searchGmailMessages(accessToken, query);
    console.log(`Found ${messages.length} potential invoice emails in ${connection.email}`);

    let processedCount = 0;
    let invoicesCreated = 0;

    const messagesToProcess = messages.slice(0, 30);
    console.log(`Starting to process ${messagesToProcess.length} messages from ${connection.email}`);

    for (const messageId of messagesToProcess) {
      try {
        console.log(`Processing message: ${messageId} from ${connection.email}`);
        const result = await processMessage(supabaseAdmin, accessToken, messageId, userId);
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

    console.log(`Sync complete for ${connection.email}: processed=${processedCount}, created=${invoicesCreated}`);

    await supabaseAdmin
      .from('gmail_connections')
      .update({ last_sync_at: new Date().toISOString() })
      .eq('id', connection.id);

    if (invoicesCreated > 0) {
      await incrementDocumentUsage(supabaseAdmin, userId, invoicesCreated);
    }

    // Accumulate totals
    totalProcessed += processedCount;
    totalInvoicesCreated += invoicesCreated;
    totalFound += messages.length;
  }

  return new Response(JSON.stringify({
    success: true,
    processed: totalProcessed,
    invoicesCreated: totalInvoicesCreated,
    totalFound: totalFound,
    accountsProcessed: connections.length,
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// ============= GMAIL API FUNCTIONS =============
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

// ============= MESSAGE PROCESSING =============
async function processMessage(
  supabase: any,
  accessToken: string,
  messageId: string,
  userId: string
): Promise<{ created: boolean; reason?: string }> {
  const response = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  
  if (!response.ok) {
    console.error(`Failed to fetch message ${messageId}: ${response.status}`);
    return { created: false, reason: `fetch failed: ${response.status}` };
  }
  
  const message = await response.json();
  
  const headers = message.payload?.headers || [];
  const subject = headers.find((h: any) => h.name === 'Subject')?.value || '';
  const from = headers.find((h: any) => h.name === 'From')?.value || '';
  const date = headers.find((h: any) => h.name === 'Date')?.value || '';
  
  console.log(`Message subject: "${subject.substring(0, 50)}..." from: ${from.substring(0, 30)}`);
  
  const attachments = findAttachments(message.payload);
  console.log(`Found ${attachments.length} attachments in message`);
  
  const body = extractBody(message.payload);
  const invoiceLinks = findInvoiceLinks(body);
  console.log(`Found ${invoiceLinks.length} invoice links in message`);
  
  if (attachments.length === 0 && invoiceLinks.length === 0) {
    return { created: false, reason: 'no attachments or links' };
  }

  for (const attachment of attachments) {
    console.log(`Processing attachment: ${attachment.filename} (${attachment.mimeType})`);
    const result = await processAttachment(supabase, accessToken, messageId, userId, attachment, from, date);
    if (result.created) {
      return result;
    }
  }

  for (const link of invoiceLinks) {
    console.log(`Processing link: ${link.substring(0, 50)}...`);
    const result = await processExternalLink(supabase, userId, link, from, date);
    if (result.created) {
      return result;
    }
  }

  return { created: false, reason: 'failed to process attachments/links' };
}

// ============= ATTACHMENT PROCESSING =============
async function processAttachment(
  supabase: any,
  accessToken: string,
  messageId: string,
  userId: string,
  attachment: { filename: string; attachmentId: string; mimeType: string },
  fromEmail: string,
  emailDate: string
): Promise<{ created: boolean; reason?: string }> {
  const attachmentData = await getAttachmentFromGmail(accessToken, messageId, attachment.attachmentId);
  
  if (!attachmentData) {
    console.error(`Failed to download attachment: ${attachment.filename}`);
    await createInvoice(supabase, userId, {
      storageUrl: null,
      previewImageUrl: null,
      additionalImages: [],
      fileName: attachment.filename,
      mimeType: attachment.mimeType,
      fileSource: 'gmail_attachment',
      storageStatus: 'failed',
      originalUrl: null,
      storageError: 'Failed to download from Gmail API',
    }, fromEmail, emailDate);
    return { created: true, reason: 'attachment download failed' };
  }
  
  console.log(`Downloaded attachment: ${attachment.filename}, size: ${attachmentData.length} bytes`);

  // Upload the file to storage (PDFs will be converted to images by the browser later)
  const uploadResult = await uploadToStorage(supabase, userId, attachmentData, attachment.filename, attachment.mimeType);

  if (uploadResult.success && uploadResult.storageUrl) {
    console.log(`Uploaded to storage: ${uploadResult.storageUrl}`);

    // For PDFs: mark with null preview_image_url so the browser will convert them later
    const isPdf = attachment.mimeType.includes('pdf');

    await createInvoice(supabase, userId, {
      storageUrl: uploadResult.storageUrl,
      previewImageUrl: isPdf ? null : uploadResult.storageUrl, // null for PDFs = needs conversion
      additionalImages: [],
      fileName: attachment.filename,
      mimeType: attachment.mimeType,
      fileSource: 'gmail_attachment',
      storageStatus: 'success',
      originalUrl: null,
      storageError: null,
      fileData: attachmentData,
    }, fromEmail, emailDate);
    return { created: true };
  }

  // If we got here, upload failed
  console.error(`Failed to upload attachment: ${uploadResult.error}`);
  await createInvoice(supabase, userId, {
    storageUrl: null,
    previewImageUrl: null,
    additionalImages: [],
    fileName: attachment.filename,
    mimeType: attachment.mimeType,
    fileSource: 'gmail_attachment',
    storageStatus: 'failed',
    originalUrl: null,
    storageError: uploadResult.error || 'Storage upload failed',
    fileData: attachmentData,
  }, fromEmail, emailDate);
  return { created: true, reason: 'storage upload failed' };
}
}

// ============= EXTERNAL LINK PROCESSING =============
async function processExternalLink(
  supabase: any,
  userId: string,
  link: string,
  fromEmail: string,
  emailDate: string
): Promise<{ created: boolean; reason?: string }> {
  console.log(`Attempting to download file from link: ${link.substring(0, 80)}...`);
  
  const downloadResult = await downloadAndUploadFromLink(supabase, userId, link);
  
  if (downloadResult.success && downloadResult.storageUrl) {
    console.log(`Successfully uploaded from link: ${downloadResult.storageUrl}`);

    const mimeType = downloadResult.mimeType || 'application/pdf';
    const isPdf = mimeType.includes('pdf');

    // Store the file - PDFs will be converted to images by the browser later
    await createInvoice(supabase, userId, {
      storageUrl: downloadResult.storageUrl,
      previewImageUrl: isPdf ? null : downloadResult.storageUrl, // null for PDFs = needs conversion
      additionalImages: [],
      fileName: `gmail_link_${Date.now()}`,
      mimeType,
      fileSource: 'gmail_external_link',
      storageStatus: 'success',
      originalUrl: link,
      storageError: null,
      fileData: downloadResult.fileData,
    }, fromEmail, emailDate);
    return { created: true };
  } else {
    console.log(`Failed to download from link: ${downloadResult.error}`);
    await createInvoice(supabase, userId, {
      storageUrl: null,
      previewImageUrl: null,
      additionalImages: [],
      fileName: `gmail_link_${Date.now()}`,
      mimeType: 'application/pdf',
      fileSource: 'gmail_external_link',
      storageStatus: 'failed',
      originalUrl: link,
      storageError: downloadResult.error || 'Download failed',
    }, fromEmail, emailDate);
    return { created: true, reason: 'link download failed' };
  }
}

// ============= GMAIL ATTACHMENT DOWNLOAD =============
async function getAttachmentFromGmail(
  accessToken: string,
  messageId: string,
  attachmentId: string
): Promise<Uint8Array | null> {
  try {
    const response = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/attachments/${attachmentId}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    
    if (!response.ok) {
      console.error(`Gmail attachment API error: ${response.status}`);
      return null;
    }
    
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
    console.error('Error getting attachment from Gmail:', error);
  }
  return null;
}

// ============= EXTERNAL LINK DOWNLOAD =============
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
      return { success: false, error: `HTTP ${response.status}: ${response.statusText}` };
    }
    
    const contentType = response.headers.get('content-type') || '';
    
    const isPdf = contentType.includes('pdf') || link.toLowerCase().includes('.pdf');
    const isImage = contentType.includes('image') || 
      /\.(jpg|jpeg|png|gif|webp|bmp)(\?|$)/i.test(link);
    
    if (!isPdf && !isImage) {
      if (contentType.includes('html')) {
        return { success: false, error: 'Link returned HTML page, not a direct file' };
      }
      return { success: false, error: `Unsupported content type: ${contentType}` };
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const fileData = new Uint8Array(arrayBuffer);
    
    if (fileData.length > 10 * 1024 * 1024) {
      return { success: false, error: 'File too large (>10MB)' };
    }
    
    if (fileData.length < 1024) {
      return { success: false, error: 'File too small (<1KB), might be invalid' };
    }
    
    let extension = 'pdf';
    let mimeType = 'application/pdf';
    
    if (isImage) {
      if (contentType.includes('png')) {
        extension = 'png';
        mimeType = 'image/png';
      } else if (contentType.includes('gif')) {
        extension = 'gif';
        mimeType = 'image/gif';
      } else if (contentType.includes('webp')) {
        extension = 'webp';
        mimeType = 'image/webp';
      } else {
        extension = 'jpg';
        mimeType = 'image/jpeg';
      }
    }
    
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 8);
    const filename = `gmail_link_${timestamp}_${randomId}.${extension}`;
    const path = `${userId}/${filename}`;
    
    const { error } = await supabase.storage
      .from('invoices')
      .upload(path, fileData, {
        contentType: mimeType,
        upsert: false,
      });

    if (error) {
      console.error('Storage upload error:', error);
      return { success: false, error: `Storage upload failed: ${error.message}` };
    }

    const { data: urlData } = supabase.storage.from('invoices').getPublicUrl(path);
    
    return { 
      success: true, 
      storageUrl: urlData.publicUrl,
      fileData,
      mimeType,
    };
    
  } catch (error) {
    console.error('Error downloading from link:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Download failed' };
  }
}

// ============= STORAGE UPLOAD =============
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
      console.error('Upload error:', error);
      return { success: false, error: error.message };
    }

    const { data: urlData } = supabase.storage.from('invoices').getPublicUrl(path);
    return { success: true, storageUrl: urlData.publicUrl, mimeType: contentType };
  } catch (error) {
    console.error('Error uploading to storage:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Upload failed' };
  }
}

// ============= INVOICE CREATION =============
async function createInvoice(
  supabase: any,
  userId: string,
  metadata: InvoiceMetadata,
  fromEmail: string,
  emailDate: string
): Promise<void> {
  console.log(`Creating invoice: ${metadata.fileName}, source: ${metadata.fileSource}, status: ${metadata.storageStatus}`);
  
  let extractedData: any = {};
  
  if (metadata.fileData && metadata.mimeType && metadata.storageStatus === 'success') {
    extractedData = await extractInvoiceDataFromBytes(metadata.fileData, metadata.mimeType);
    console.log('Extracted data:', JSON.stringify(extractedData));
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
  
  const { error: insertError } = await supabase.from('invoices').insert({
    user_id: userId,
    supplier_name: supplierName,
    document_number: extractedData.document_number || '',
    document_date: documentDate,
    total_amount: extractedData.total_amount || 0,
    category: extractedData.category || 'אחר',
    business_type: extractedData.business_type || 'עוסק מורשה',
    // Only set image_url if storage succeeded - this controls printability!
    image_url: metadata.storageStatus === 'success' ? metadata.storageUrl : null,
    // NEW: Set preview_image_url for PDF previews
    preview_image_url: metadata.previewImageUrl,
    // NEW: Set additional_images for multi-page PDFs
    additional_images: metadata.additionalImages.length > 0 ? metadata.additionalImages : null,
    entry_method: 'gmail_sync',
    status,
    file_name: metadata.fileName,
    mime_type: metadata.mimeType,
    file_source: metadata.fileSource,
    storage_status: metadata.storageStatus,
    original_url: metadata.originalUrl,
    storage_error: metadata.storageError,
  });
  
  if (insertError) {
    console.error('Error inserting invoice:', insertError);
  } else {
    console.log(`Invoice created: storage_status=${metadata.storageStatus}, has_image_url=${!!metadata.storageUrl}, has_preview=${!!metadata.previewImageUrl}`);
  }
}

// ============= AI EXTRACTION =============
async function extractInvoiceDataFromBytes(data: Uint8Array, mimeType: string): Promise<any> {
  try {
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY not configured');
      return {};
    }
    
    console.log(`Extracting invoice data from ${mimeType} using Lovable AI...`);
    
    let binary = '';
    const bytes = new Uint8Array(data);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64Data = btoa(binary);
    
    let mediaType = mimeType;
    if (mimeType.includes('pdf')) {
      mediaType = 'application/pdf';
    } else if (mimeType.includes('image')) {
      mediaType = mimeType.includes('png') ? 'image/png' : 'image/jpeg';
    }
    
    const dataUrl = `data:${mediaType};base64,${base64Data}`;
    console.log(`Data URL size: ${base64Data.length} chars`);
    
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
            content: `You are an invoice data extraction assistant for Israeli invoices. Extract:
- supplier_name: The company/business name (Hebrew preferred)
- document_number: Invoice/receipt number
- document_date: Date in YYYY-MM-DD format
- total_amount: Total amount (number only, including VAT)
- category: One of: ${VALID_CATEGORIES.join(', ')}
- business_type: One of: עוסק מורשה, עוסק פטור, חברה בע"מ, ספק חו"ל

Respond in JSON only. Use null for fields you cannot extract.`
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Extract invoice data:' },
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
    
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (error) {
    console.error('Error extracting invoice data:', error);
  }
  return {};
}

// ============= UTILITY FUNCTIONS =============
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

function parseSupplierFromEmail(from: string): string {
  const nameMatch = from.match(/^([^<]+)/);
  if (nameMatch) {
    return nameMatch[1].trim().replace(/"/g, '');
  }
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
