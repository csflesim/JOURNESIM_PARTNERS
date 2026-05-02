create table if not exists translations (
  key      text primary key,
  zh_tw    text not null default '',
  zh_cn    text not null default '',
  en       text not null default '',
  ja       text not null default '',
  ko       text not null default '',
  updated_at timestamptz default now()
);
