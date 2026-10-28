update storage.buckets
set file_size_limit = 20971520,
    allowed_mime_types = array['application/pdf','text/plain','image/png','image/jpeg','image/webp']
where id = 'homework';

update storage.buckets
set file_size_limit = 52428800,
    allowed_mime_types = array[
      'application/pdf','application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv','text/plain','application/zip','application/x-zip-compressed',
      'image/png','image/jpeg','image/webp'
    ]
where id in ('assignment-files','assignment-submissions');
