create index if not exists grade_items_course_idx on public.grade_items(course_id);
create index if not exists flashcard_decks_course_idx on public.flashcard_decks(course_id);
create index if not exists flashcards_user_idx on public.flashcards(user_id);
create index if not exists study_group_posts_user_idx on public.study_group_posts(user_id);
