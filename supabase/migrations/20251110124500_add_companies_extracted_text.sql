/*
  # Add extracted_text column to companies

  1. Changes
    - Add a new text column to store concatenated extracted document text
*/

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS extracted_text text;

