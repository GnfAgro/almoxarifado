-- ============================================================
-- GNF AGRO — Sistema de Almoxarifado
-- Schema Supabase (Postgres) — instalação do zero.
-- Rode este arquivo inteiro no SQL Editor do Supabase.
-- (Se você já tem o banco da versão anterior, use migracao-v2.sql.)
-- ============================================================

create extension if not exists "uuid-ossp";

-- ---------- PERFIS (admin / almoxarife) ----------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null,
  role text not null check (role in ('admin', 'almoxarife')),
  created_at timestamptz not null default now()
);

create or replace function public.get_my_role()
returns text
language sql
security definer
stable
as $$
  select role from public.profiles where id = auth.uid()
$$;

-- ---------- CATEGORIA -> TIPO -> FUNÇÃO ----------
create table public.categorias (
  id uuid primary key default uuid_generate_v4(),
  nome text not null unique,
  created_at timestamptz not null default now()
);

create table public.tipos (
  id uuid primary key default uuid_generate_v4(),
  categoria_id uuid not null references public.categorias(id) on delete cascade,
  nome text not null,
  created_at timestamptz not null default now(),
  unique (categoria_id, nome)
);

create table public.funcoes (
  id uuid primary key default uuid_generate_v4(),
  tipo_id uuid not null references public.tipos(id) on delete cascade,
  nome text not null,
  created_at timestamptz not null default now(),
  unique (tipo_id, nome)
);

-- ---------- ITENS ----------
create table public.itens (
  id uuid primary key default uuid_generate_v4(),
  nome text not null,
  apelidos text[] not null default '{}',
  categoria_id uuid not null references public.categorias(id),
  tipo_id uuid not null references public.tipos(id),
  funcao_id uuid references public.funcoes(id),
  codigo text,
  unidade text not null,
  quantidade numeric not null default 0 check (quantidade >= 0),          -- disponível no almoxarifado
  quantidade_emprestada numeric not null default 0 check (quantidade_emprestada >= 0),
  quantidade_minima numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index itens_categoria_idx on public.itens(categoria_id);
create index itens_tipo_idx on public.itens(tipo_id);
create index itens_apelidos_idx on public.itens using gin(apelidos);

-- ---------- REQUISIÇÕES / HISTÓRICO ----------
-- tipo: entrada | saida (baixa feita pelo admin) | compra | emprestimo
-- status: pendente | aprovado | rejeitado | devolvido (empréstimo aprovado = "emprestado")
create table public.requisicoes (
  id uuid primary key default uuid_generate_v4(),
  item_id uuid not null references public.itens(id),
  quantidade numeric not null check (quantidade > 0),
  tipo text not null check (tipo in ('entrada', 'saida', 'compra', 'emprestimo')),
  status text not null default 'pendente'
    check (status in ('pendente', 'aprovado', 'rejeitado', 'devolvido')),
  almoxarife_id uuid references public.profiles(id),   -- quem pediu (vazio quando o admin registra direto)
  admin_id uuid references public.profiles(id),
  servidor_nome text,            -- servidor que pegou emprestado / retirou
  observacao text,               -- comentário
  -- entrada
  fornecedor text,
  nota_fiscal text,
  data_recebimento date,
  receita_agronomica boolean,
  -- empréstimo
  data_vencimento date,
  devolvido_em timestamptz,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  constraint requisicoes_campos_check check (
    (tipo <> 'entrada' or (fornecedor is not null and nota_fiscal is not null
       and data_recebimento is not null and receita_agronomica is not null))
    and (tipo <> 'emprestimo' or (servidor_nome is not null and data_vencimento is not null))
    and (tipo <> 'saida' or servidor_nome is not null)
  )
);

create index requisicoes_status_idx on public.requisicoes(status);
create index requisicoes_item_idx on public.requisicoes(item_id);

-- ============================================================
-- REGRAS DE ACESSO (RLS)
-- ============================================================
alter table public.profiles enable row level security;
alter table public.categorias enable row level security;
alter table public.tipos enable row level security;
alter table public.funcoes enable row level security;
alter table public.itens enable row level security;
alter table public.requisicoes enable row level security;

-- PERFIS
drop policy if exists "ver proprio perfil" on public.profiles;
drop policy if exists "ver perfis da equipe" on public.profiles;
create policy "ver proprio perfil" on public.profiles
  for select using (auth.uid() = id);
create policy "ver perfis da equipe" on public.profiles
  for select using (public.get_my_role() in ('admin', 'almoxarife'));

-- CATEGORIAS / TIPOS / FUNÇÕES: todos leem, só o admin altera
drop policy if exists "leitura publica categorias" on public.categorias;
drop policy if exists "escrita admin categorias" on public.categorias;
create policy "leitura publica categorias" on public.categorias for select using (true);
create policy "escrita admin categorias" on public.categorias
  for all using (public.get_my_role() = 'admin')
  with check (public.get_my_role() = 'admin');

drop policy if exists "leitura publica tipos" on public.tipos;
drop policy if exists "escrita admin tipos" on public.tipos;
create policy "leitura publica tipos" on public.tipos for select using (true);
create policy "escrita admin tipos" on public.tipos
  for all using (public.get_my_role() = 'admin')
  with check (public.get_my_role() = 'admin');

drop policy if exists "leitura publica funcoes" on public.funcoes;
drop policy if exists "escrita admin funcoes" on public.funcoes;
create policy "leitura publica funcoes" on public.funcoes for select using (true);
create policy "escrita admin funcoes" on public.funcoes
  for all using (public.get_my_role() = 'admin')
  with check (public.get_my_role() = 'admin');

-- ITENS: todos leem (funcionário sem login inclusive), só o admin cadastra/edita.
-- A quantidade só muda pelas funções abaixo (entrada, baixa, empréstimo, devolução).
drop policy if exists "leitura publica itens" on public.itens;
drop policy if exists "escrita admin itens" on public.itens;
create policy "leitura publica itens" on public.itens for select using (true);
create policy "escrita admin itens" on public.itens
  for all using (public.get_my_role() = 'admin')
  with check (public.get_my_role() = 'admin');

-- REQUISIÇÕES: admin e almoxarife leem; só o almoxarife cria (sempre pendente);
-- o admin só exclui histórico finalizado. Aprovar/rejeitar é pelas funções abaixo.
drop policy if exists "equipe ve requisicoes" on public.requisicoes;
drop policy if exists "almoxarife cria requisicoes" on public.requisicoes;
drop policy if exists "admin exclui historico" on public.requisicoes;
create policy "equipe ve requisicoes" on public.requisicoes
  for select using (public.get_my_role() in ('admin', 'almoxarife'));
create policy "almoxarife cria requisicoes" on public.requisicoes
  for insert with check (
    public.get_my_role() = 'almoxarife'
    and almoxarife_id = auth.uid()
    and status = 'pendente'
    and tipo in ('entrada', 'compra', 'emprestimo')
  );
create policy "admin exclui historico" on public.requisicoes
  for delete using (
    public.get_my_role() = 'admin'
    and (status in ('rejeitado', 'devolvido') or (status = 'aprovado' and tipo <> 'emprestimo'))
  );

-- ============================================================
-- FUNÇÕES (mexem no estoque com segurança, checando o papel)
-- ============================================================

-- Admin aprova uma requisição pendente
create or replace function public.aprovar_requisicao(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare r public.requisicoes%rowtype;
begin
  if public.get_my_role() is distinct from 'admin' then
    raise exception 'Apenas o admin pode aprovar.';
  end if;
  select * into r from public.requisicoes where id = p_id for update;
  if not found then raise exception 'Requisição não encontrada.'; end if;
  if r.status <> 'pendente' then raise exception 'Esta requisição já foi decidida.'; end if;

  if r.tipo = 'entrada' then
    update public.itens set quantidade = quantidade + r.quantidade, updated_at = now()
      where id = r.item_id;
  elsif r.tipo = 'emprestimo' then
    update public.itens
      set quantidade = quantidade - r.quantidade,
          quantidade_emprestada = quantidade_emprestada + r.quantidade,
          updated_at = now()
      where id = r.item_id and quantidade >= r.quantidade;
    if not found then raise exception 'Estoque insuficiente para este empréstimo.'; end if;
  end if;
  -- compra: só registra a aprovação (o estoque só muda quando o material chegar, via entrada)

  update public.requisicoes
    set status = 'aprovado', admin_id = auth.uid(), resolved_at = now()
    where id = p_id;
end $$;

-- Admin rejeita uma requisição pendente
create or replace function public.rejeitar_requisicao(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.get_my_role() is distinct from 'admin' then
    raise exception 'Apenas o admin pode rejeitar.';
  end if;
  update public.requisicoes
    set status = 'rejeitado', admin_id = auth.uid(), resolved_at = now()
    where id = p_id and status = 'pendente';
  if not found then raise exception 'Requisição não encontrada ou já decidida.'; end if;
end $$;

-- Admin dá baixa direta no material
create or replace function public.registrar_saida(
  p_item uuid, p_qtd numeric, p_servidor text, p_obs text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.get_my_role() is distinct from 'admin' then
    raise exception 'Apenas o admin pode dar baixa no material.';
  end if;
  if p_qtd is null or p_qtd <= 0 then raise exception 'Quantidade inválida.'; end if;
  if p_servidor is null or btrim(p_servidor) = '' then
    raise exception 'Informe o servidor que retirou o material.';
  end if;
  update public.itens set quantidade = quantidade - p_qtd, updated_at = now()
    where id = p_item and quantidade >= p_qtd;
  if not found then raise exception 'Estoque insuficiente ou item não encontrado.'; end if;
  insert into public.requisicoes
    (item_id, quantidade, tipo, status, servidor_nome, admin_id, observacao, resolved_at)
  values
    (p_item, p_qtd, 'saida', 'aprovado', btrim(p_servidor), auth.uid(), p_obs, now());
end $$;

-- Admin registra entrada direta de material
create or replace function public.registrar_entrada(
  p_item uuid, p_qtd numeric, p_fornecedor text, p_nf text, p_data date,
  p_receita boolean, p_obs text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.get_my_role() is distinct from 'admin' then
    raise exception 'Apenas o admin pode registrar entrada direta.';
  end if;
  if p_qtd is null or p_qtd <= 0 then raise exception 'Quantidade inválida.'; end if;
  update public.itens set quantidade = quantidade + p_qtd, updated_at = now()
    where id = p_item;
  if not found then raise exception 'Item não encontrado.'; end if;
  insert into public.requisicoes
    (item_id, quantidade, tipo, status, admin_id, fornecedor, nota_fiscal,
     data_recebimento, receita_agronomica, observacao, resolved_at)
  values
    (p_item, p_qtd, 'entrada', 'aprovado', auth.uid(), p_fornecedor, p_nf,
     p_data, p_receita, p_obs, now());
end $$;

-- Admin ou almoxarife registra a devolução de um empréstimo
create or replace function public.registrar_devolucao(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare r public.requisicoes%rowtype;
begin
  if public.get_my_role() is null then
    raise exception 'Sem permissão.';
  end if;
  select * into r from public.requisicoes where id = p_id for update;
  if not found then raise exception 'Empréstimo não encontrado.'; end if;
  if r.tipo <> 'emprestimo' or r.status <> 'aprovado' then
    raise exception 'Este empréstimo não está em aberto.';
  end if;
  update public.itens
    set quantidade = quantidade + r.quantidade,
        quantidade_emprestada = greatest(quantidade_emprestada - r.quantidade, 0),
        updated_at = now()
    where id = r.item_id;
  update public.requisicoes
    set status = 'devolvido', devolvido_em = now()
    where id = p_id;
end $$;

-- Admin limpa o histórico finalizado (mantém pendentes e empréstimos em aberto)
create or replace function public.limpar_historico()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare n integer;
begin
  if public.get_my_role() is distinct from 'admin' then
    raise exception 'Apenas o admin pode excluir histórico.';
  end if;
  delete from public.requisicoes
    where status in ('rejeitado', 'devolvido')
       or (status = 'aprovado' and tipo <> 'emprestimo');
  get diagnostics n = row_count;
  return n;
end $$;

-- Só usuários logados podem chamar as funções
revoke all on function public.aprovar_requisicao(uuid) from public, anon;
revoke all on function public.rejeitar_requisicao(uuid) from public, anon;
revoke all on function public.registrar_saida(uuid, numeric, text, text) from public, anon;
revoke all on function public.registrar_entrada(uuid, numeric, text, text, date, boolean, text) from public, anon;
revoke all on function public.registrar_devolucao(uuid) from public, anon;
revoke all on function public.limpar_historico() from public, anon;
grant execute on function public.aprovar_requisicao(uuid) to authenticated;
grant execute on function public.rejeitar_requisicao(uuid) to authenticated;
grant execute on function public.registrar_saida(uuid, numeric, text, text) to authenticated;
grant execute on function public.registrar_entrada(uuid, numeric, text, text, date, boolean, text) to authenticated;
grant execute on function public.registrar_devolucao(uuid) to authenticated;
grant execute on function public.limpar_historico() to authenticated;

-- ============================================================
-- COMO CRIAR O PRIMEIRO ADMIN E ALMOXARIFE
-- ============================================================
-- 1. Supabase > Authentication > Users > Add user (um para o admin, outro para o almoxarife)
-- 2. Copie o UUID de cada um e rode, trocando os valores:
--    insert into public.profiles (id, nome, role) values
--      ('uuid-do-admin-aqui', 'Nome do Admin', 'admin'),
--      ('uuid-do-almoxarife-aqui', 'Nome do Almoxarife', 'almoxarife');
