import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import bcrypt from "npm:bcryptjs@2.4.3";

// Login do Painel do Aventureiro. Praticamente o auth-api do SistemaDH, sem a ponte para a
// autenticação antiga (aqui todo jogador já nasce com bcrypt, inclusive os importados).

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, authorization, apikey, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const MAX_TENTATIVAS = 5;
const BLOQUEIO_MS = 15 * 60 * 1000;
const SESSAO_DIAS = 60;

function resposta(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { ...cors, "content-type": "application/json; charset=utf-8" } });
}
function ok(dados: unknown) { return resposta({ ok: true, dados }); }
function falha(codigo: string, mensagem: string, extra: unknown = null, status = 400) {
  return resposta({ ok: false, erro: { codigo, mensagem, extra } }, status);
}
function normalizarNome(nome: unknown) {
  return String(nome || "").trim().replace(/\s+/g, " ").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}
function validarNome(nome: unknown) {
  const limpo = String(nome || "").trim().replace(/\s+/g, " ");
  if (limpo.length < 2 || limpo.length > 24) return { ok: false, erro: "O nome precisa ter entre 2 e 24 caracteres." };
  if (!/^[\p{L}\p{N} ._'-]+$/u.test(limpo)) return { ok: false, erro: "O nome tem caracteres não permitidos." };
  return { ok: true, valor: limpo };
}
function validarCodigo(codigo: unknown) {
  const limpo = String(codigo || "").trim();
  if (limpo.length < 4 || limpo.length > 32) return { ok: false, erro: "O código precisa ter entre 4 e 32 caracteres." };
  return { ok: true, valor: limpo };
}
function jogadorPublico(j: any) { return { id: j.id, nome: j.nome, papel: j.papel, ehMestre: j.papel === "mestre" }; }
function hexAleatorio(bytes = 32) {
  const arr = new Uint8Array(bytes); crypto.getRandomValues(arr);
  return Array.from(arr).map(b => b.toString(16).padStart(2, "0")).join("");
}
async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, "0")).join("");
}
async function registrarLog(db: any, jogador: any, acao: string, detalhe = "") {
  try { await db.from("log").insert({ quandoEm: new Date().toISOString(), jogadorId: jogador?.id || "", jogadorNome: jogador?.nome || "", acao, detalhe: String(detalhe).slice(0, 500) }); } catch (_) {}
}
async function criarSessao(db: any, jogadorId: string) {
  const token = hexAleatorio(32);
  const agora = new Date();
  const expira = new Date(agora.getTime() + SESSAO_DIAS * 24 * 3600 * 1000);
  const { error } = await db.from("sessoes").insert({ tokenHash: await sha256Hex(token), jogadorId, criadoEm: agora.toISOString(), expiraEm: expira.toISOString(), ultimoUsoEm: agora.toISOString() });
  if (error) throw error;
  return token;
}
async function exigirJogador(db: any, token: string) {
  if (!token) return null;
  const { data: sessao, error: e1 } = await db.from("sessoes").select("row_id,jogadorId,expiraEm").eq("tokenHash", await sha256Hex(token)).maybeSingle();
  if (e1) throw e1;
  if (!sessao || !sessao.expiraEm || new Date(sessao.expiraEm).getTime() < Date.now()) return null;
  const { data: jogador, error: e2 } = await db.from("jogadores").select("*").eq("id", sessao.jogadorId).maybeSingle();
  if (e2) throw e2;
  if (!jogador || jogador.ativo === false) return null;
  await db.from("sessoes").update({ ultimoUsoEm: new Date().toISOString() }).eq("row_id", sessao.row_id);
  return jogador;
}
async function limite(db: any, chave: string) {
  const { data, error } = await db.from("auth_rate_limits").select("*").eq("chave", chave).maybeSingle();
  if (error) throw error;
  if (!data) return { bloqueado: false, tentativas: 0 };
  const ate = data.bloqueado_ate ? new Date(data.bloqueado_ate).getTime() : 0;
  if (ate && ate > Date.now()) return { bloqueado: true, tentativas: Number(data.tentativas) || 0 };
  if (ate && ate <= Date.now()) {
    await db.from("auth_rate_limits").delete().eq("chave", chave);
    return { bloqueado: false, tentativas: 0 };
  }
  return { bloqueado: false, tentativas: Number(data.tentativas) || 0 };
}
async function falhou(db: any, chave: string) {
  const atual = await limite(db, chave);
  const n = atual.tentativas + 1;
  const bloqueadoAte = n >= MAX_TENTATIVAS ? new Date(Date.now() + BLOQUEIO_MS).toISOString() : null;
  await db.from("auth_rate_limits").upsert({ chave, tentativas: n, bloqueado_ate: bloqueadoAte, atualizado_em: new Date().toISOString() }, { onConflict: "chave" });
}
async function limparFalhas(db: any, chave: string) { await db.from("auth_rate_limits").delete().eq("chave", chave); }
async function login(db: any, jogador: any, codigo: string, chaveRate: string) {
  if (!bcrypt.compareSync(codigo, String(jogador.codigoHash || ""))) {
    await falhou(db, chaveRate);
    return { erro: falha("CREDENCIAL_INVALIDA", "Nome ou código incorreto.", null, 401) };
  }
  await limparFalhas(db, chaveRate);
  await db.from("jogadores").update({ ultimoAcessoEm: new Date().toISOString() }).eq("id", jogador.id);
  const token = await criarSessao(db, jogador.id);
  await registrarLog(db, jogador, "login", "supabase");
  return { token, jogador };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return falha("DADOS_INVALIDOS", "Método não suportado.", null, 405);
  try {
    const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
    const p = await req.json();
    const acao = String(p?.acao || "");

    if (acao === "registrar") {
      const vn = validarNome(p?.nome); if (!vn.ok) return falha("DADOS_INVALIDOS", vn.erro!);
      const vc = validarCodigo(p?.codigo); if (!vc.ok) return falha("DADOS_INVALIDOS", vc.erro!);
      const chaveNome = normalizarNome(vn.valor);
      const { data: existente, error: e1 } = await db.from("jogadores").select("id").eq("chaveNome", chaveNome).maybeSingle();
      if (e1) throw e1;
      if (existente) return falha("NOME_EM_USO", "Já existe um jogador com esse nome.");
      const agora = new Date().toISOString();
      const jogador = { id: crypto.randomUUID(), nome: vn.valor, chaveNome, papel: "jogador", codigoHash: bcrypt.hashSync(vc.valor, 12), salt: "bcrypt", ativo: true, criadoEm: agora, ultimoAcessoEm: agora };
      const { error: e2 } = await db.from("jogadores").insert(jogador); if (e2) throw e2;
      const token = await criarSessao(db, jogador.id);
      await registrarLog(db, jogador, "registro", "novo jogador");
      return ok({ token, jogador: jogadorPublico(jogador) });
    }

    if (acao === "entrar") {
      const chave = normalizarNome(p?.nome);
      const l = await limite(db, `j:${chave}`);
      if (l.bloqueado) return falha("BLOQUEADO", "Muitas tentativas. Tente de novo em 15 minutos.", null, 429);
      const { data: jogador, error } = await db.from("jogadores").select("*").eq("chaveNome", chave).maybeSingle();
      if (error) throw error;
      if (!jogador || jogador.ativo === false || jogador.papel === "mestre") { await falhou(db, `j:${chave}`); return falha("CREDENCIAL_INVALIDA", "Nome ou código incorreto.", null, 401); }
      const r = await login(db, jogador, String(p?.codigo || "").trim(), `j:${chave}`);
      if (r.erro) return r.erro;
      return ok({ token: r.token, jogador: jogadorPublico(r.jogador) });
    }

    if (acao === "entrarMestre") {
      const l = await limite(db, "mestre");
      if (l.bloqueado) return falha("BLOQUEADO", "Muitas tentativas. Tente de novo em 15 minutos.", null, 429);
      const { data: mestre, error } = await db.from("jogadores").select("*").eq("id", "mestre").maybeSingle();
      if (error) throw error;
      if (!mestre || mestre.ativo === false) return falha("MESTRE_NAO_CONFIGURADO", "Mestre não configurado.", null, 409);
      const r = await login(db, mestre, String(p?.codigo || "").trim(), "mestre");
      if (r.erro) return r.erro;
      return ok({ token: r.token, jogador: jogadorPublico(r.jogador) });
    }

    if (acao === "eu") {
      const jogador = await exigirJogador(db, String(p?.token || ""));
      if (!jogador) return falha("NAO_AUTENTICADO", "Sessão inválida ou expirada.", null, 401);
      return ok({ jogador: jogadorPublico(jogador) });
    }

    if (acao === "sair") {
      const token = String(p?.token || "");
      if (token) await db.from("sessoes").delete().eq("tokenHash", await sha256Hex(token));
      return ok({ saiu: true });
    }

    if (acao === "trocarCodigo") {
      const jogador = await exigirJogador(db, String(p?.token || ""));
      if (!jogador) return falha("NAO_AUTENTICADO", "Faça login para continuar.", null, 401);
      const atual = String(p?.codigoAtual || "").trim();
      if (!bcrypt.compareSync(atual, String(jogador.codigoHash || ""))) return falha("CREDENCIAL_INVALIDA", "O código atual está incorreto.", null, 401);
      const novo = validarCodigo(p?.codigoNovo); if (!novo.ok) return falha("DADOS_INVALIDOS", novo.erro!);
      const { error } = await db.from("jogadores").update({ codigoHash: bcrypt.hashSync(novo.valor, 12), salt: "bcrypt" }).eq("id", jogador.id);
      if (error) throw error;
      await registrarLog(db, jogador, "troca-codigo", "supabase");
      return ok({ trocado: true });
    }

    return falha("ACAO_DESCONHECIDA", "Ação de autenticação desconhecida.", null, 404);
  } catch (e) {
    console.error(e);
    return falha("INTERNO", "Erro inesperado no servidor.", null, 500);
  }
});
