SELECT 'Empty Topics' as CheckName, count(*) FROM sp_topics WHERE title IS NULL OR title = '';
SELECT 'Empty Posts' as CheckName, count(*) FROM sp_posts WHERE title IS NULL OR title = '';
SELECT * FROM sp_topics WHERE title IS NULL OR title = '' LIMIT 10;
