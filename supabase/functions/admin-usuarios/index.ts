import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!

/**
 * Origens autorizadas a chamar esta funcao pelo navegador.
 * Configuravel pela variavel de ambiente ORIGENS_PERMITIDAS (separada por virgula).
 * Requisicoes sem cabecalho Origin (servidor para servidor, curl) sao aceitas,
 * pois ainda precisam de um JWT de administrador valido.
 */
const ORIGENS_PERMITIDAS = (
  Deno.env.get("ORIGENS_PERMITIDAS") ??
  "https://balimax.com.br,https://www.balimax.com.br," +
    "https://almoxarifadobalimax.vercel.app,http://localhost:5173"
)
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean)

/**
 * Deploys de previa da Vercel nascem com um endereco novo a cada push
 * (almoxarifadobalimax-git-main-treze1310.vercel.app). Liberar o projeto pelo
 * prefixo evita ter que reconfigurar a cada previa, sem abrir para qualquer
 * site hospedado na vercel.app.
 */
const PREVIA_VERCEL = /^https:\/\/almoxarifadobalimax(-[a-z0-9-]+)?\.vercel\.app$/

const origemAutorizada = (origin: string | null) =>
  !origin || ORIGENS_PERMITIDAS.includes(origin) || PREVIA_VERCEL.test(origin)

/** Limites por janela de tempo: [maximo, minutos] */
const LIMITES: Record<string, [number, number]> = {
  _ip: [30, 5], // teto geral por IP
  create: [10, 5],
  reset_password: [5, 5],
  delete: [10, 5],
}

const corsHeaders = (origin: string | null) => {
  if (!origemAutorizada(origin)) return null
  return {
    "Access-Control-Allow-Origin": origin ?? ORIGENS_PERMITIDAS[0],
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  }
}

/**
 * Procura no Auth a conta de um e-mail. O Auth nao tem busca direta por
 * e-mail, entao a lista e paginada; com a quantidade de usuarios do
 * almoxarifado isso cabe em uma ou duas paginas.
 */
const contaDoEmail = async (
  admin: ReturnType<typeof createClient>,
  email: string | null,
): Promise<string | null> => {
  if (!email) return null
  const alvo = email.trim().toLowerCase()
  for (let pagina = 1; pagina <= 10; pagina++) {
    const { data, error } = await admin.auth.admin.listUsers({ page: pagina, perPage: 200 })
    if (error || !data?.users?.length) return null
    const achado = data.users.find((u) => (u.email ?? "").toLowerCase() === alvo)
    if (achado) return achado.id
    if (data.users.length < 200) return null
  }
  return null
}

const json = (body: unknown, status: number, cors: Record<string, string> | null) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...(cors ?? {}), "Content-Type": "application/json" },
  })

const ipDaRequisicao = (req: Request) => {
  const encaminhado = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim()
  return (
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-real-ip") ||
    encaminhado ||
    "desconhecido"
  )
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("Origin")
  const cors = corsHeaders(origin)
  const ip = ipDaRequisicao(req)

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

  /** Registra tentativa negada na trilha de auditoria */
  const registrarNegado = async (motivo: string, usuarioId: string | null = null) => {
    try {
      await admin.from("log_sistema").insert({
        usuario_id: usuarioId,
        acao: "seguranca.acesso_negado",
        tabela: "admin-usuarios",
        dados_novos: { motivo, origem: origin, ip },
        user_agent: req.headers.get("user-agent"),
      })
    } catch (_) {
      // nunca deixar o log impedir a resposta
    }
  }

  /** true quando o limite foi excedido */
  const limiteExcedido = async (chave: string, limite: [number, number]) => {
    const [maximo, minutos] = limite
    const desde = new Date(Date.now() - minutos * 60_000).toISOString()

    const { count } = await admin
      .from("seguranca_rate_limit")
      .select("id", { count: "exact", head: true })
      .eq("chave", chave)
      .gte("ocorrido_em", desde)

    // Nao registra quando o limite ja foi atingido, para a tabela nao crescer
    // indefinidamente sob abuso.
    if ((count ?? 0) >= maximo) return true

    await admin.from("seguranca_rate_limit").insert({ chave })
    if (Math.random() < 0.02) await admin.rpc("seguranca_limpar_rate_limit")

    return false
  }

  // Origem fora da allowlist: nem responde com cabecalho CORS
  if (!cors) {
    await registrarNegado("origem nao autorizada")
    return new Response(JSON.stringify({ error: "Origem nao autorizada" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    })
  }

  if (req.method === "OPTIONS") return new Response("ok", { headers: cors })
  if (req.method !== "POST") return json({ error: "Metodo nao permitido" }, 405, cors)

  const authHeader = req.headers.get("Authorization") ?? ""
  if (!authHeader) {
    await registrarNegado("sem autenticacao")
    return json({ error: "Nao autenticado" }, 401, cors)
  }

  // Identifica quem esta chamando a funcao
  const caller = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  })
  const { data: userData, error: userError } = await caller.auth.getUser()
  if (userError || !userData?.user) {
    await registrarNegado("sessao invalida")
    return json({ error: "Sessao invalida" }, 401, cors)
  }

  // Somente administradores ativos podem gerenciar usuarios
  const { data: perfilChamador } = await admin
    .from("usuarios")
    .select("id, ativo, perfil, perfis_acesso:perfil_acesso_id(nome)")
    .eq("auth_user_id", userData.user.id)
    .maybeSingle()

  const isAdmin =
    !!perfilChamador?.ativo &&
    (perfilChamador?.perfil === "administrador" ||
      (perfilChamador as any)?.perfis_acesso?.nome === "Administrador")

  if (!isAdmin) {
    await registrarNegado("usuario nao e administrador", perfilChamador?.id ?? null)
    return json({ error: "Apenas administradores podem gerenciar usuarios" }, 403, cors)
  }

  // Limites de taxa apenas depois de confirmar que quem chama e administrador:
  // assim uma requisicao sem credencial valida nao gera escrita no banco.
  if (await limiteExcedido(`ip:${ip}`, LIMITES._ip)) {
    await registrarNegado("limite por IP excedido", perfilChamador!.id)
    return json({ error: "Muitas requisicoes. Tente novamente em alguns minutos." }, 429, {
      ...cors,
      "Retry-After": "300",
    })
  }

  let payload: any
  try {
    payload = await req.json()
  } catch {
    return json({ error: "Corpo da requisicao invalido" }, 400, cors)
  }

  const { action } = payload ?? {}

  // Limite por acao, por administrador
  if (action && LIMITES[action]) {
    if (await limiteExcedido(`${perfilChamador!.id}:${action}`, LIMITES[action])) {
      await registrarNegado(`limite da acao ${action} excedido`, perfilChamador!.id)
      return json({ error: "Muitas operacoes em sequencia. Aguarde alguns minutos." }, 429, {
        ...cors,
        "Retry-After": "300",
      })
    }
  }

  try {
    if (action === "create") {
      const { nome, email, senha, perfil, perfil_acesso_id, centro_custo_id } = payload
      if (!nome || !email || !senha) {
        return json({ error: "Nome, email e senha sao obrigatorios" }, 400, cors)
      }
      if (String(senha).length < 8) {
        return json({ error: "A senha deve ter ao menos 8 caracteres" }, 400, cors)
      }

      const { data: created, error: createError } = await admin.auth.admin.createUser({
        email,
        password: senha,
        email_confirm: true,
        user_metadata: { nome },
      })
      if (createError) return json({ error: createError.message }, 400, cors)

      const row = {
        auth_user_id: created.user!.id,
        email,
        nome,
        perfil: perfil ?? "visualizador",
        perfil_acesso_id: perfil_acesso_id ?? null,
        centro_custo_id: centro_custo_id ?? null,
        ativo: true,
      }

      // O registro pode ja existir (cadastro previo sem login) — nesse caso apenas vincula
      const { data: existente } = await admin
        .from("usuarios")
        .select("id")
        .eq("email", email)
        .maybeSingle()

      if (existente) {
        const { error: updErr } = await admin.from("usuarios").update(row).eq("id", existente.id)
        if (updErr) return json({ error: updErr.message }, 400, cors)
        return json({ data: { id: existente.id, auth_user_id: created.user!.id } }, 200, cors)
      }

      const { data: inserted, error: insErr } = await admin
        .from("usuarios")
        .insert(row)
        .select("id")
        .single()
      if (insErr) {
        // Evita deixar um usuario no Auth sem registro correspondente
        await admin.auth.admin.deleteUser(created.user!.id)
        return json({ error: insErr.message }, 400, cors)
      }
      return json({ data: { id: inserted.id, auth_user_id: created.user!.id } }, 200, cors)
    }

    if (action === "reset_password") {
      const { usuario_id, senha } = payload
      if (!usuario_id || !senha) {
        return json({ error: "Usuario e senha sao obrigatorios" }, 400, cors)
      }
      if (String(senha).length < 8) {
        return json({ error: "A senha deve ter ao menos 8 caracteres" }, 400, cors)
      }

      const { data: usuario } = await admin
        .from("usuarios")
        .select("auth_user_id, email, nome")
        .eq("id", usuario_id)
        .maybeSingle()
      if (!usuario) return json({ error: "Usuario nao encontrado" }, 404, cors)

      // O vinculo pode estar apontando para uma conta que nao existe mais
      // (login recriado pelo painel, por exemplo). Nesse estado a pessoa
      // entra no sistema mas nao consegue ler o proprio cadastro, e fica
      // sem perfil. Aqui o vinculo e refeito pelo e-mail, que e unico no
      // Auth, antes de qualquer coisa.
      const contaReal = await contaDoEmail(admin, usuario.email)
      if (contaReal && contaReal !== usuario.auth_user_id) {
        await admin
          .from("usuarios")
          .update({ auth_user_id: contaReal })
          .eq("id", usuario_id)
        usuario.auth_user_id = contaReal
      }

      if (usuario.auth_user_id) {
        const { error } = await admin.auth.admin.updateUserById(usuario.auth_user_id, {
          password: senha,
        })
        if (error) return json({ error: error.message }, 400, cors)
        return json({ data: { atualizado: true } }, 200, cors)
      }

      // Usuario sem login: cria o acesso agora e vincula
      const { data: created, error: createError } = await admin.auth.admin.createUser({
        email: usuario.email,
        password: senha,
        email_confirm: true,
        user_metadata: { nome: usuario.nome },
      })
      if (createError) return json({ error: createError.message }, 400, cors)

      await admin
        .from("usuarios")
        .update({ auth_user_id: created.user!.id })
        .eq("id", usuario_id)
      return json({ data: { criado: true } }, 200, cors)
    }

    if (action === "delete") {
      const { usuario_id } = payload
      if (!usuario_id) return json({ error: "Usuario obrigatorio" }, 400, cors)
      if (usuario_id === perfilChamador?.id) {
        return json({ error: "Nao e possivel excluir o proprio usuario" }, 400, cors)
      }

      const { data: usuario } = await admin
        .from("usuarios")
        .select("auth_user_id")
        .eq("id", usuario_id)
        .maybeSingle()

      const { error } = await admin.from("usuarios").delete().eq("id", usuario_id)
      if (error) return json({ error: error.message }, 400, cors)

      if (usuario?.auth_user_id) {
        await admin.auth.admin.deleteUser(usuario.auth_user_id)
      }
      return json({ data: { excluido: true } }, 200, cors)
    }

    return json({ error: "Acao desconhecida" }, 400, cors)
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Erro inesperado" }, 500, cors)
  }
})
