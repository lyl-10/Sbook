update storage.buckets
set allowed_mime_types = array[
  'application/pdf',
  'text/plain',
  'text/markdown',
  'image/png'
]
where id = 'knowledge-files';
