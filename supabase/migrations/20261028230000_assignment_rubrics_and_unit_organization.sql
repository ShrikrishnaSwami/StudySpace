alter table public.assignments
  add column if not exists assignment_questions text not null default '',
  add column if not exists rubric_text text not null default '',
  add column if not exists unit_name text not null default 'General';

alter table public.course_notes
  add column if not exists unit_name text not null default 'General',
  add column if not exists category text not null default 'Lecture notes',
  add column if not exists source_file_name text,
  add column if not exists source_mime_type text;

alter table public.course_resources
  add column if not exists unit_name text not null default 'General',
  add column if not exists category text not null default 'Resource';

create index if not exists course_notes_user_course_unit_idx
  on public.course_notes(user_id, course_id, unit_name);
create index if not exists course_resources_user_course_unit_idx
  on public.course_resources(user_id, course_id, unit_name);
create index if not exists assignments_user_course_unit_idx
  on public.assignments(user_id, course_id, unit_name);

comment on column public.assignments.assignment_questions is
  'The assignment prompt, question list, and required deliverables used by StudySpace AI grading.';
comment on column public.assignments.rubric_text is
  'The grading rubric used as reference by StudySpace AI grading.';
