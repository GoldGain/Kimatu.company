-- Migration: Add motto column to schools table
-- This fixes the "Could not find the 'motto' column of 'schools' in the schema cache" error

ALTER TABLE schools ADD COLUMN IF NOT EXISTS motto TEXT;
