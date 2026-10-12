-- ============================================================
-- GNF AGRO — MIGRAÇÃO v2 (rode UMA vez no SQL Editor do Supabase)
-- ATENÇÃO: apaga itens e requisições de teste e os tipos/funções antigos.
-- As categorias existentes são mantidas.
-- ============================================================
begin;

-- 1) Remove regras e view antigas
drop policy if exists "escrita almoxarife/admin categorias" on public.categorias;
drop policy if exists "escrita almoxarife/admin tipos" on public.tipos;
drop policy if exists "escrita almoxarife/admin funcoes" on public.funcoes;
drop policy if exists "escrita almoxarife/admin itens" on public.itens;
drop policy if exists "almoxarife ve proprias requisicoes" on public.requisicoes;
drop policy if exists "almoxarife atualiza urgencia propria" on public.requisicoes;
drop policy if exists "admin atualiza requisicoes" on public.requisicoes;
drop view if exists public.itens_publico;

-- 2) Apaga dados de teste
delete from public.requisicoes;
delete from public.itens;
delete from public.funcoes;
delete from public.tipos;

-- 3) Tipos pertencem a uma categoria; funções pertencem a um tipo
alter table public.tipos drop constraint if exists tipos_nome_key;
alter table public.tipos
  add column categoria_id uuid not null references public.categorias(id) on delete cascade;
alter table public.tipos
  add constraint tipos_categoria_nome_key unique (categoria_id, nome);

alter table public.funcoes drop constraint if exists funcoes_nome_key;
alter table public.funcoes
  add column tipo_id uuid not null references public.tipos(id) on delete cascade;
alter table public.funcoes
  add constraint funcoes_tipo_nome_key unique (tipo_id, nome);

-- 4) Itens: NF/data/loja saem do item (agora ficam na entrada); entra "emprestado"
alter table public.itens
  drop column if exists nota_fiscal,
  drop column if exists data_compra,
  drop column if exists loja,
  add column quantidade_emprestada numeric not null default 0
    check (quantidade_emprestada >= 0);

-- 5) Requisições: novos campos e tipos
alter table public.requisicoes drop constraint if exists requisicoes_tipo_check;
alter table public.requisicoes drop constraint if exists requisicoes_status_check;
alter table public.requisicoes drop column if exists urgente;
alter table public.requisicoes rename column funcionario_nome to servidor_nome;
alter table public.requisicoes alter column almoxarife_id drop not null;
alter table public.requisicoes
  add column fornecedor text,
  add column nota_fiscal text,
  add column data_recebimento date,
  add column receita_agronomica boolean,
  add column data_vencimento date,
  add column devolvido_em timestamptz;
alter table public.requisicoes
  add constraint requisicoes_tipo_check
    check (tipo in ('entrada', 'saida', 'compra', 'emprestimo')),
  add constraint requisicoes_status_check
    check (status in ('pendente', 'aprovado', 'rejeitado', 'devolvido')),
  add constraint requisicoes_campos_check check (
    (tipo <> 'entrada' or (fornecedor is not null and nota_fiscal is not null
       and data_recebimento is not null and receita_agronomica is not null))
    and (tipo <> 'emprestimo' or (servidor_nome is not null and data_vencimento is not null))
    and (tipo <> 'saida' or servidor_nome is not null)
  );

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

commit;
