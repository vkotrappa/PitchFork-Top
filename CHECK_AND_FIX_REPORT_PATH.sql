-- Check the actual file path stored in the database for team-analysis reports
SELECT 
  id,
  report_type,
  file_name,
  file_path,
  generated_at
FROM analysis_reports
WHERE report_type = 'team-analysis'
ORDER BY generated_at DESC
LIMIT 5;

-- If the file exists in storage but the path is wrong, you can manually update it:
-- UPDATE analysis_reports
-- SET file_path = '4819f923-493f-40c9-9d8b-5679662acbdf/correct-filename.pdf'
-- WHERE id = 'report-id-here';














