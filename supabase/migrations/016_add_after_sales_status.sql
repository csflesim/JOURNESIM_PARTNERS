-- Add missing status column to after_sales table
alter table after_sales add column if not exists status text default 'pending';
