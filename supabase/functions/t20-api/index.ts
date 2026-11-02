import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

// Dados do Painel do Aventureiro: uma ação para cada rota do antigo Code.gs. Toda ação exige o
// token do auth-api, menos lerGrade/salvarGrade, que usam o token próprio do link da grade.

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, authorization, apikey, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const BUCKET = "fotos-personagens";
const MAX_FOTO = 1024 * 1024;
const TIPOS_FOTO: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const MESTRE_VAZIO = { grupos: [], encontrosSalvos: [] };

function resposta(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { ...cors, "content-type": "application/json; charset=utf-8" } });
}
function ok(dados: unknown) { return resposta({ ok: true, dados }); }
function falha(codigo: string, mensagem: string, extra: unknown = null, status = 400) {
  return resposta({ ok: false, erro: { codigo, mensagem, extra } }, status);
}
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
async function autenticar(db: any, token: string) {
  if (!token) return null;
  const { data: sessao, error: e1 } = await db.from("sessoes").select("row_id,jogadorId,expiraEm").eq("tokenHash", await sha256Hex(token)).maybeSingle();
  if (e1) throw e1;
  if (!sessao || !sessao.expiraEm || new Date(sessao.expiraEm).getTime() < Date.now()) return null;
  const { data: jogador, error: e2 } = await db.from("jogadores").select("id,nome,papel,ativo").eq("id", sessao.jogadorId).maybeSingle();
  if (e2) throw e2;
  if (!jogador || jogador.ativo === false) return null;
  await db.from("sessoes").update({ ultimoUsoEm: new Date().toISOString() }).eq("row_id", sessao.row_id);
  return jogador;
}

// Tira da ficha os campos que só existem na conversa com o servidor.
function fichaLimpa(f: any) {
  const c = { ...f };
  delete c._versao; delete c._playerId; delete c._donoId; delete c._donoNome;
  return c;
}
// Colunas de resumo, para listar sem abrir o JSON.
function resumo(f: any) {
  const cls = Array.isArray(f?.classesNiveis) ? f.classesNiveis : [];
  const nivel = cls.reduce((s: number, c: any) => s + (parseInt(c?.nivel, 10) || 0), 0);
  return {
    nome: String(f?.nome || "Sem nome").slice(0, 120),
    raca: String(f?.raca || "").slice(0, 80),
    classe: cls.map((c: any) => String(c?.classe || "")).filter(Boolean).join("/").slice(0, 120),
    nivel: nivel || parseInt(f?.nivel, 10) || 1,
  };
}
function comVersao(linha: any) { return { ...(linha.dados || {}), id: linha.id, _versao: linha.versao }; }

async function lerMestre(db: any, mestreId: string) {
  const { data, error } = await db.from("mestre_dados").select("*").eq("mestreId", mestreId).maybeSingle();
  if (error) throw error;
  return data;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return falha("DADOS_INVALIDOS", "Método não suportado.", null, 405);
  try {
    const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
    const p = await req.json();
    const acao = String(p?.acao || "");

    // ---- Link da grade: não usa login, só o token do link ----
    if (acao === "lerGrade" || acao === "salvarGrade") {
      const tokenGrade = String(p?.tokenGrade || "");
      if (!tokenGrade) return falha("NAO_AUTENTICADO", "Link da grade inválido.", null, 401);
      const hash = await sha256Hex(tokenGrade);
      for (let tentativa = 0; tentativa < 3; tentativa++) {
        const { data: linha, error } = await db.from("mestre_dados").select("mestreId,dados,versao").eq("gradeTokenHash", hash).maybeSingle();
        if (error) throw error;
        if (!linha) return falha("NAO_AUTENTICADO", "Link da grade inválido ou trocado pelo Mestre.", null, 401);
        const dados = linha.dados || {};
        if (acao === "lerGrade") return ok({ combateCompartilhado: dados.combateCompartilhado || null });
        if (!p?.grade || typeof p.grade !== "object") return falha("DADOS_INVALIDOS", "Grade ausente.");
        // Quem tem o link só mexe no tabuleiro: a grade completa e a versão filtrada que os
        // jogadores enxergam (o app recalcula as duas juntas). Combatentes e o resto ficam intactos.
        const cc = { ...(dados.combateCompartilhado || {}), grade: p.grade };
        if (p.gradeParaJogadores && typeof p.gradeParaJogadores === "object") cc.gradeParaJogadores = p.gradeParaJogadores;
        const novo = { ...dados, combateCompartilhado: cc };
        const { data: gravou, error: e2 } = await db.from("mestre_dados")
          .update({ dados: novo, versao: linha.versao + 1, atualizadoEm: new Date().toISOString() })
          .eq("mestreId", linha.mestreId).eq("versao", linha.versao).select("versao");
        if (e2) throw e2;
        if (gravou && gravou.length) return ok({ salvo: true });
      }
      return falha("CONFLITO", "A grade mudou enquanto salvava. Tente de novo.", null, 409);
    }

    const jogador = await autenticar(db, String(p?.token || ""));
    if (!jogador) return falha("NAO_AUTENTICADO", "Faça login para continuar.", null, 401);
    const ehMestre = jogador.papel === "mestre";
    const soMestre = () => falha("PROIBIDO", "Só o Mestre pode fazer isso.", null, 403);

    // ---- Jogador: as próprias fichas ----
    if (acao === "meusPersonagens") {
      const { data, error } = await db.from("personagens").select("id,versao,dados").eq("donoId", jogador.id).eq("excluido", false).order("criadoEm");
      if (error) throw error;
      return ok({ personagens: (data || []).map(comVersao) });
    }

    // Recebe a lista completa do jogador, como o POST do Code.gs. Ficha que não veio na lista
    // vira exclusão lógica (recuperável). Se a ficha trouxer _versao e o banco tiver uma mais
    // nova, ela não é gravada e volta em "conflitos" para o app mesclar.
    if (acao === "salvarPersonagens") {
      const lista = Array.isArray(p?.personagens) ? p.personagens : null;
      if (!lista) return falha("DADOS_INVALIDOS", "Lista de personagens ausente.");
      const { data: atuais, error } = await db.from("personagens").select("id,donoId,versao,excluido").in("id", lista.map((f: any) => String(f?.id || "")).filter(Boolean));
      if (error) throw error;
      const porId = new Map((atuais || []).map((l: any) => [l.id, l]));
      const agora = new Date().toISOString();
      const salvos: any[] = []; const conflitos: string[] = []; const recusados: string[] = [];
      for (const f of lista) {
        const id = String(f?.id || "").trim();
        if (!id || id.length > 100) continue;
        const atual: any = porId.get(id);
        const ficha = fichaLimpa(f);
        if (!atual) {
          const { error: e } = await db.from("personagens").insert({ id, donoId: jogador.id, ...resumo(ficha), versao: 1, criadoEm: agora, atualizadoEm: agora, dados: ficha });
          if (e) throw e;
          salvos.push({ id, _versao: 1 });
          continue;
        }
        if (atual.donoId !== jogador.id) { recusados.push(id); continue; }
        const esperada = parseInt(f?._versao, 10);
        if (esperada && esperada !== atual.versao) { conflitos.push(id); continue; }
        const { data: upd, error: e } = await db.from("personagens")
          .update({ ...resumo(ficha), dados: ficha, versao: atual.versao + 1, atualizadoEm: agora, excluido: false })
          .eq("id", id).eq("versao", atual.versao).select("versao");
        if (e) throw e;
        if (!upd || !upd.length) { conflitos.push(id); continue; }
        salvos.push({ id, _versao: upd[0].versao });
      }
      const idsRecebidos = lista.map((f: any) => String(f?.id || "")).filter(Boolean);
      let q = db.from("personagens").update({ excluido: true, atualizadoEm: agora }).eq("donoId", jogador.id).eq("excluido", false);
      if (idsRecebidos.length) q = q.not("id", "in", `(${idsRecebidos.map((i: string) => `"${i.replace(/"/g, "")}"`).join(",")})`);
      const { error: eDel } = await q;
      if (eDel) throw eDel;
      return ok({ salvos, conflitos, recusados });
    }

    // Lista leve de todos: só o que qualquer um na mesa já veria (sem PV, itens, dinheiro, notas).
    if (acao === "listaJogadores") {
      const { data, error } = await db.from("personagens").select("id,dados").eq("excluido", false).order("criadoEm");
      if (error) throw error;
      return ok({ personagens: (data || []).map((l: any) => {
        const f = l.dados || {};
        return { id: l.id, nome: f.nome || "", jogador: f.jogador || "", foto: f.foto || "", raca: f.raca || "", classesNiveis: f.classesNiveis || [] };
      }) });
    }

    // Mapas que o Mestre compartilhou (Notas → Locais do jogador). Só os mapas, nada mais.
    if (acao === "mapasDoMestre") {
      const linha = await lerMestre(db, "mestre");
      return ok({ mapas: (linha?.dados && Array.isArray(linha.dados.mapas)) ? linha.dados.mapas : [] });
    }

    if (acao === "enviarItem") {
      const destino = String(p?.personagemDestinoId || "").trim();
      if (!destino || !p?.item || typeof p.item !== "object") return falha("DADOS_INVALIDOS", "Dados incompletos.");
      const { data, error } = await db.rpc("enviar_item", { p_destino: destino, p_item: p.item });
      if (error) return falha(String(error.message || "").includes("DESTINO") ? "NAO_ENCONTRADO" : "DADOS_INVALIDOS", "Personagem de destino não encontrado.");
      await registrarLog(db, jogador, "enviar-item", `${destino}: ${String(p.item?.item || p.item?.nome || "").slice(0, 80)}`);
      return ok({ nomeDestino: data?.nomeDestino || "" });
    }

    if (acao === "enviarDinheiro") {
      const destino = String(p?.personagemDestinoId || "").trim();
      const campo = String(p?.campo || "").trim();
      const valor = parseInt(p?.valor, 10);
      if (!destino || !["ts", "tc", "to"].includes(campo) || !valor || valor <= 0) return falha("DADOS_INVALIDOS", "Dados incompletos.");
      const { data, error } = await db.rpc("enviar_dinheiro", { p_destino: destino, p_campo: campo, p_valor: valor });
      if (error) return falha("NAO_ENCONTRADO", "Personagem de destino não encontrado.");
      await registrarLog(db, jogador, "enviar-dinheiro", `${destino}: ${valor} ${campo}`);
      return ok({ nomeDestino: data?.nomeDestino || "" });
    }

    // Foto: o dono da ficha (ou o Mestre) manda a imagem, a função guarda no Storage e devolve
    // o link público. Gravar o link na ficha continua sendo trabalho do app, como era com o Drive.
    if (acao === "enviarFoto") {
      const personagemId = String(p?.personagemId || "").trim();
      const m = String(p?.imagemBase64 || "").match(/^data:(image\/[a-z]+);base64,(.+)$/);
      if (!m || !TIPOS_FOTO[m[1]]) return falha("DADOS_INVALIDOS", "Imagem inválida (use JPG, PNG ou WEBP).");
      if (personagemId) {
        const { data: dono, error } = await db.from("personagens").select("donoId").eq("id", personagemId).maybeSingle();
        if (error) throw error;
        if (dono && dono.donoId !== jogador.id && !ehMestre) return falha("PROIBIDO", "Essa ficha não é sua.", null, 403);
      }
      const bytes = Uint8Array.from(atob(m[2]), c => c.charCodeAt(0));
      if (bytes.length > MAX_FOTO) return falha("DADOS_INVALIDOS", "Imagem maior que 1 MB.");
      const path = `${jogador.id}/${personagemId || "sem-ficha"}-${Date.now()}-${hexAleatorio(4)}.${TIPOS_FOTO[m[1]]}`;
      const { error } = await db.storage.from(BUCKET).upload(path, bytes, { contentType: m[1], upsert: false, cacheControl: "3600" });
      if (error) throw error;
      const { data: pub } = db.storage.from(BUCKET).getPublicUrl(path);
      return ok({ url: pub.publicUrl });
    }

    // ---- Mestre ----
    if (acao === "todosPersonagens") {
      if (!ehMestre) return soMestre();
      const [{ data, error }, { data: jogs, error: e2 }] = await Promise.all([
        db.from("personagens").select("id,donoId,versao,dados").eq("excluido", false).order("criadoEm"),
        db.from("jogadores").select("id,nome"),
      ]);
      if (error) throw error; if (e2) throw e2;
      const nomes = new Map((jogs || []).map((j: any) => [j.id, j.nome]));
      return ok({ personagens: (data || []).map((l: any) => ({ ...comVersao(l), _donoId: l.donoId, _donoNome: nomes.get(l.donoId) || "", _playerId: l.donoId })) });
    }

    if (acao === "mestreAtualizarPersonagem") {
      if (!ehMestre) return soMestre();
      const f = p?.personagem;
      const id = String(f?.id || "").trim();
      if (!id) return falha("DADOS_INVALIDOS", "Personagem ausente.");
      const { data: atual, error } = await db.from("personagens").select("versao").eq("id", id).eq("excluido", false).maybeSingle();
      if (error) throw error;
      if (!atual) return falha("NAO_ENCONTRADO", "Personagem não encontrado.", null, 404);
      const esperada = parseInt(f?._versao, 10);
      if (esperada && esperada !== atual.versao) return falha("CONFLITO", "O jogador mexeu nessa ficha enquanto isso. Recarregue e tente de novo.", { id }, 409);
      const ficha = fichaLimpa(f);
      const { data: upd, error: e2 } = await db.from("personagens")
        .update({ ...resumo(ficha), dados: ficha, versao: atual.versao + 1, atualizadoEm: new Date().toISOString() })
        .eq("id", id).eq("versao", atual.versao).select("versao");
      if (e2) throw e2;
      if (!upd || !upd.length) return falha("CONFLITO", "O jogador mexeu nessa ficha enquanto isso. Recarregue e tente de novo.", { id }, 409);
      await registrarLog(db, jogador, "mestre-atualizou", id);
      return ok({ id, _versao: upd[0].versao });
    }

    if (acao === "lerMestreDados") {
      if (!ehMestre) return soMestre();
      const linha = await lerMestre(db, jogador.id);
      return ok({ dados: linha?.dados || MESTRE_VAZIO, _versao: linha?.versao || 0 });
    }

    if (acao === "salvarMestreDados") {
      if (!ehMestre) return soMestre();
      if (!p?.dados || typeof p.dados !== "object") return falha("DADOS_INVALIDOS", "Dados do Mestre ausentes.");
      const linha = await lerMestre(db, jogador.id);
      const agora = new Date().toISOString();
      if (!linha) {
        const { error } = await db.from("mestre_dados").insert({ mestreId: jogador.id, dados: p.dados, versao: 1, atualizadoEm: agora });
        if (error) throw error;
        return ok({ _versao: 1 });
      }
      const esperada = parseInt(p?._versao, 10);
      if (esperada && esperada !== linha.versao) return falha("CONFLITO", "Os dados do Mestre mudaram em outra aba. Recarregue.", null, 409);
      const { data: upd, error } = await db.from("mestre_dados").update({ dados: p.dados, versao: linha.versao + 1, atualizadoEm: agora })
        .eq("mestreId", jogador.id).eq("versao", linha.versao).select("versao");
      if (error) throw error;
      if (!upd || !upd.length) return falha("CONFLITO", "Os dados do Mestre mudaram em outra aba. Recarregue.", null, 409);
      return ok({ _versao: upd[0].versao });
    }

    // Gera (ou troca) o link da grade. O link antigo para de funcionar na hora.
    if (acao === "gerarLinkGrade") {
      if (!ehMestre) return soMestre();
      const tokenGrade = hexAleatorio(24);
      const hash = await sha256Hex(tokenGrade);
      const linha = await lerMestre(db, jogador.id);
      const agora = new Date().toISOString();
      const { error } = linha
        ? await db.from("mestre_dados").update({ gradeTokenHash: hash, atualizadoEm: agora }).eq("mestreId", jogador.id)
        : await db.from("mestre_dados").insert({ mestreId: jogador.id, dados: MESTRE_VAZIO, versao: 1, gradeTokenHash: hash, atualizadoEm: agora });
      if (error) throw error;
      await registrarLog(db, jogador, "link-grade", "novo link");
      return ok({ tokenGrade });
    }

    return falha("ACAO_DESCONHECIDA", "Ação desconhecida.", null, 404);
  } catch (e) {
    console.error(e);
    return falha("INTERNO", "Erro inesperado no servidor.", null, 500);
  }
});
