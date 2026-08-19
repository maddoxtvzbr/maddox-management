-- MADDOX Management — Migração 002
-- Permite o novo status "cancelado" em events (mantém "confirmado" como já
-- era). Não apaga nenhuma tabela, não apaga nenhum dado.
--
-- COMO USAR: SQL Editor do Supabase -> New query -> colar e Run.
-- Seguro para rodar mesmo se já tiver sido aplicada antes.

alter table public.events drop constraint if exists events_status_check;
alter table public.events
  add constraint events_status_check check (status in ('confirmado', 'cancelado'));
