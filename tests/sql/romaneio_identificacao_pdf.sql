begin;
do $$
declare
 a record; b record; d uuid := gen_random_uuid(); legado uuid := gen_random_uuid(); falhou boolean;
begin
 select u.id,u.auth_user_id,u.nome into a from public.usuarios u where u.auth_user_id is not null and u.ativo is not false and u.perfil='administrador' limit 1;
 select u.id,u.auth_user_id,u.nome into b from public.usuarios u where u.auth_user_id is not null and u.ativo is not false and u.id<>a.id and u.perfil='administrador' limit 1;
 if a.id is null or b.id is null then raise exception 'Teste requer dois administradores existentes'; end if;
 perform set_config('request.jwt.claim.sub',a.auth_user_id::text,true);
 insert into public.romaneios(id,numero,tipo,status,fiscalizacao_nome,transporte_nome)
 values(d,'__PDF_'||d,'retirada','pendente','Fiscal de teste','Transportador de teste');
 if (select expedicao_nome from public.romaneios where id=d) is distinct from a.nome then raise exception 'Expedição não identificada'; end if;
 perform set_config('request.jwt.claim.sub',b.auth_user_id::text,true);
 if public.romaneio_dados_expedicao(d)->>'nome' is distinct from a.nome then raise exception 'Visualizador substituiu expedidor'; end if;
 update public.romaneios set status='aprovado' where id=d;
 if (select expedicao_nome from public.romaneios where id=d) is distinct from b.nome then raise exception 'Aprovação não registrou expedidor'; end if;
 falhou:=false;
 begin update public.romaneios set assinatura_retirada='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==',fiscalizacao_nome='Outro fiscal' where id=d;
 exception when others then falhou:=true; end;
 if not falhou then raise exception 'Assinatura permitiu alterar fiscalização do aprovado'; end if;
 update public.romaneios set assinatura_retirada='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==' where id=d;
 if (select transporte_nome from public.romaneios where id=d)<>'Transportador de teste' then raise exception 'Transporte não preservado'; end if;
 perform set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
 insert into public.romaneios(id,numero,tipo,status,conferido_por) values(legado,'__PDF_'||legado,'retirada','pendente',a.id);
 perform set_config('request.jwt.claim.sub',b.auth_user_id::text,true);
 if public.romaneio_dados_expedicao(legado)->>'nome' is distinct from a.nome then raise exception 'Histórico usou usuário errado'; end if;
 perform set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
 falhou:=false;
 begin perform public.romaneio_dados_expedicao(d); exception when insufficient_privilege then falhou:=true; end;
 if not falhou then raise exception 'Consulta ignorou permissão'; end if;
end $$;
rollback;
