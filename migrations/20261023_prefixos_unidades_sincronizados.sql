-- Peças acompanham o código atual do cadastro pai; ids, patrimônios e vínculos permanecem.
begin;
lock table public.materiais_equipamentos, public.material_unidades in share row exclusive mode;
create temporary table prefixos_corrigir on commit drop as
 select u.id, u.codigo antigo, m.codigo || '-' || u.sequencia::text novo,
   to_jsonb(u) - 'codigo' - 'updated_at' dados_preservados
 from public.material_unidades u join public.materiais_equipamentos m on m.id=u.material_equipamento_id
 where u.codigo is distinct from m.codigo || '-' || u.sequencia::text;
do $$ begin
 if exists(select 1 from prefixos_corrigir c join public.material_unidades u on u.codigo=c.novo and u.id<>c.id) then
   raise exception 'Código de destino já ocupado; correção revertida.';
 end if;
end $$;
with corrigidas as (
 update public.material_unidades u set codigo=c.novo from prefixos_corrigir c where u.id=c.id returning u.id
)
insert into public.log_sistema(usuario_id,acao,tabela,registro_id,dados_anteriores,dados_novos)
select public.app_usuario_id(),'material_unidades.corrigir_prefixo','material_unidades',c.id,
 jsonb_build_object('codigo',c.antigo),jsonb_build_object('codigo',c.novo)
 from prefixos_corrigir c join corrigidas a using(id);
do $$ begin
 if exists(select 1 from prefixos_corrigir c join public.material_unidades u using(id)
   where c.dados_preservados is distinct from to_jsonb(u) - 'codigo' - 'updated_at') then
   raise exception 'Correção modificou dados além do código; operação revertida.';
 end if;
end $$;

create or replace function public.material_unidades_codigo_do_pai()
returns trigger language plpgsql security definer set search_path=public as $$
declare v_codigo text;
begin
 select codigo into v_codigo from public.materiais_equipamentos
  where id=new.material_equipamento_id for key share;
 if nullif(btrim(v_codigo),'') is null then raise exception 'Material pai sem código válido.'; end if;
 new.codigo := v_codigo || '-' || new.sequencia::text;
 return new;
end $$;
drop trigger if exists trg_material_unidades_codigo_do_pai on public.material_unidades;
create trigger trg_material_unidades_codigo_do_pai
 before insert or update of codigo, sequencia, material_equipamento_id on public.material_unidades
 for each row execute function public.material_unidades_codigo_do_pai();

create or replace function public.material_sincronizar_codigos_unidades()
returns trigger language plpgsql security definer set search_path=public as $$
begin
 if nullif(btrim(new.codigo),'') is null and exists(select 1 from public.material_unidades where material_equipamento_id=new.id) then
   raise exception 'Material com peças não pode ficar sem código.';
 end if;
 update public.material_unidades set codigo=new.codigo || '-' || sequencia::text
  where material_equipamento_id=new.id and codigo is distinct from new.codigo || '-' || sequencia::text;
 return new;
end $$;
drop trigger if exists trg_material_sincronizar_codigos_unidades on public.materiais_equipamentos;
create trigger trg_material_sincronizar_codigos_unidades
 after update of codigo on public.materiais_equipamentos
 for each row when(old.codigo is distinct from new.codigo)
 execute function public.material_sincronizar_codigos_unidades();
commit;
