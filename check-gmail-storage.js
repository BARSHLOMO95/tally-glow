// Script to check Gmail invoice storage status
// Run: node check-gmail-storage.js

console.log(`
=== HOW TO CHECK GMAIL INVOICE STORAGE ===

1. Open Supabase Dashboard: https://supabase.com/dashboard
2. Go to your project: osqanpfiprsbcontotlq
3. Click on "Table Editor"
4. Open the "invoices" table
5. Find invoices with entry_method = 'gmail_sync'

Check these fields:
- storage_status: Should be 'success' (not 'failed' or 'pending')
- image_url: Should start with https://osqanpfiprsbcontotlq.supabase.co/storage/...
- file_source: Will be 'gmail_attachment' or 'gmail_external_link'
- storage_error: Should be NULL (if not - shows the error)

If storage_status = 'failed':
  → The file was not uploaded to Storage
  → Check storage_error for the reason
  → May need to retry the download

If image_url is NULL or empty:
  → No file was saved
  → The invoice cannot be printed

If image_url exists but broken in print:
  → Possible CORS issue
  → Possible Storage bucket permissions issue

To fix CORS, I'll update the print code next.
`);
