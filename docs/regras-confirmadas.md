# Regras já confirmadas contra o PDF oficial

Tudo aqui foi checado contra o texto exato do Livro Básico (via `pdftotext -layout`) ou já
estava correto e testado no código. **Antes de reconferir algo, olhe essa lista primeiro** — se
já está aqui, não precisa checar de novo, só confirmar que o código atual ainda reflete isso.

Se encontrar algo NOVO numa auditoria futura, adicione aqui também (poder, o que faz, se
já estava certo ou se foi corrigido).

## Regras gerais confirmadas

- **Limite de PM por habilidade de custo variável** = nível do personagem NA CLASSE que
  concede a habilidade (importante em multiclasse). Pra habilidades de raça/origem/poder geral
  (sem classe conjuradora envolvida), usa o nível TOTAL do personagem. Fonte: pág. do Cap.
  "Construção de Personagem".
- **Custo de PM por círculo de magia**: 1º=1, 2º=3, 3º=6, 4º=10, 5º=15. Fórmula confirmada
  exata.
- **Toda classe conjuradora completa** (Arcanista, Bardo, Clérigo, Druida) soma o atributo-chave
  no total de PM — não é exclusivo do Arcanista (erro que corrigi depois de já ter "corrigido"
  só pro Arcanista numa rodada anterior).
- **Golem (raça)**: recupera PV E PM normalmente por descanso, mas SEMPRE no ritmo Normal (×1),
  não importa a qualidade do descanso (não é afetado por condições boas/ruins). **A wiki
  tsrd.fandom.com estava ERRADA nisso** (dizia que não recuperava PV nenhum) — não confiar
  nessa fonte sem checar o PDF antes.
- **Encouraçado**: bônus de Defesa (+2 base) EMPILHA +2 pra cada outro poder que tem Encouraçado
  como pré-requisito (Inexpugnável, Fanático) — não é fixo.

## Poderes gerais (já verificados, com número exato)

Vitalidade (+1 PV/nível, +2 Fortitude) · Vontade de Ferro (+1 PM a cada 2 níveis, +2 Vontade) ·
Costas Largas (+5 carga, +1 item vestido) · Atlético (+2 Atletismo, +3m deslocamento) ·
Esquiva (+2 Defesa, +2 Reflexos) · Inventário Organizado (soma Int na carga) · Magia Ilimitada
(soma atributo-chave no limite de PM por magia) · Investigador (+2 Investigação, soma Int em
Intuição) · Saque Rápido (+2 Iniciativa) · Finta Aprimorada (+2 Enganação) · Sentidos Aguçados
(+2 Percepção) · Reflexos de Combate (ação de movimento extra 1º turno) · Estilo de Uma Arma
(+2 Defesa/ataque com 1 arma na mão) · Estilo de Arma e Escudo (+2 escudo)

## Poderes de classe (já verificados)

Pele de Ferro/Pele de Aço (Bárbaro, +4/+8 Defesa sem armadura pesada) · Braços Calejados
(Lutador, soma Força na Defesa sem armadura, limitado ao nível) · Poder Mágico (Arcanista,
repetível, +1 PM por nível de arcanista POR VEZ escolhido, escala com nível atual) ·
Especialista em Escola (Arcanista, +2 CD numa escola escolhida) · Fortalecimento Arcano
(Arcanista, +1 CD geral, +2 se já puder lançar 4º círculo) · Magia Pungente (Arcanista, +1 PM
= +2 CD ao lançar) · Liturgia Mágica (Clérigo, ação de movimento = +2 CD na PRÓXIMA habilidade)
· Elo com a Natureza (Caçador, soma Sabedoria no PM) · Pernas do Mar (Bucaneiro, +2
Acrobacia/Atletismo) · Etiqueta (Cavaleiro, +2 Diplomacia/Nobreza) · Pajem (Cavaleiro, +2
Diplomacia, sobe qualidade do descanso 1 categoria) · Força dos Penhascos/Liberdade da
Pradaria/Tranquilidade dos Lagos (Druida, +2 Fortitude/Reflexos/Vontade respectivamente) ·
Gatuno (Ladino, +2 Atletismo) · Sombra (Ladino, +2 Furtividade)

## Poderes de origem — poder único (todas as 35 origens verificadas)

Comparei programaticamente TODAS as 35 origens (perícias + poderes + poder único) contra uma
tabela-resumo do PDF — zero divergências. Além disso, individualmente:
Coração Heroico (+3 PM, +3 a mais em cada patamar: 5º/11º/17º) · Mochileiro (+5 carga) · Esse
Cheiro... (+2 Fortitude) · Estoico (sobe qualidade do descanso 1 categoria)

## Poderes concedidos por divindade (todos verificados)

Astúcia da Serpente (+2 Enganação/Furtividade/Intuição) · Golpista Divino (+2
Enganação/Jogatina/Ladinagem) · Mente Analítica (+2 Intuição/Investigação/Vontade) · Mente
Vazia (+2 Iniciativa/Percepção/Vontade) · Talento Artístico (+2 Acrobacia/Atuação/Diplomacia) ·
Conhecimento Enciclopédico (treina 2 perícias de Int à escolha) · Compreender os Ermos (+2
Sobrevivência, E troca Carisma por Sabedoria em Adestramento — essa segunda parte só foi
achada numa auditoria, não estava óbvia)

## Linhagens do Arcanista (Feiticeiro) — achado grande, nunca tinha sido conectado

`arcanistaLinhagem` nunca era lido em cálculo nenhum antes de uma auditoria específica.
- **Linhagem Dracônica**: soma Carisma no PV inicial (dobra com Herança Superior)
- **Linhagem Rubra**: só na Herança Superior, +4 PM por poder da Tormenta que tiver
- **Linhagem Feérica**: só na Herança Aprimorada, +2 CD em Encantamento e Ilusão

## Traços de raça (varredura completa feita, raça por raça)

Duro como Pedra (Anão, +3 PV nível 1 +1/nível) · Chassi (Golem, +2 Defesa via `defesaBonusFixo`
— mecanismo GENÉRICO nas opções da raça, não aparece buscando pelo nome) · Sangue Mágico (Elfo,
+1 PM/nível) · Vanguardista (Kliren, +2 numa perícia à escolha, geralmente Ofício) · Couro
Rígido (Minotauro, +1 Defesa via defesaBonusFixo) · Reptiliano (Trog, +1 Defesa via
defesaBonusFixo, +5 Furtividade sem armadura pesada) · Rato das Ruas (Goblin, +2 Fortitude,
recuperação de descanso nunca menor que o nível) · Deformidade (Lefou, +2 em 2 perícias à
escolha) · Luz Sagrada/Sombras Profanas (Suraggel, +2 em 2 perícias fixas por variante) · Hynne
(pode usar Destreza em vez de Força em Atletismo, +2 Enganação)

**O que fica de fora de propósito** (situacional/combate, o app não simula isso): qualquer
bônus de ataque/dano, resistência a tipo de dano ou veneno específico, bônus condicionado a
localização ("no subterrâneo"), habilidades ativadas que custam PM+ação em combate. Esses
entram na Central de Lembretes Mecânicos (painel na Ficha) em vez de tentar calcular.

## Itens (auditoria parcial, focada nos que davam bônus persistente)

Chapéu arcano (+1 PM se Caminho do Arcanista) · Mochila de aventureiro (+2 carga, precisa
"Upgrade" manual, uma vez só por personagem) · Cajado arcano/Orbe cristalino (+1 limite PM
magia arcana, ±CD) · Bolsa de pó (+2 PM aprimoramento, Encantamento/Ilusão) · Tomo de Guerra
(+1 PM aprimoramento, Evocação) · Tomo hermético/Varinha arcana (CD, já tinham estrutura
completa incluindo escolha de escola ao equipar) · Farrapos de ermitão (+2 Adestramento, −2
Diplomacia — precisou generalizar a estrutura de dados pra aceitar 2 bônus num item só) · Gorad
quente (+2 PM temporário na hora de usar, diferente do padrão "próximo descanso" dos outros
alimentos) · Musgo púrpura/Ossos de monstro/Saco de sal (catalisadores, +2 CD por escola
específica — agora entram como opção no popup de Usar Magia) · Prato do
aventureiro/Sopa de peixe/Gorlogg Ensopado (bônus de PV/PM guardado pro próximo descanso)

**Ainda não auditado a fundo**: os números/efeitos individuais dentro de itens-magicos.js (a
integração em si já está OK — Armas/Armaduras Específicas e os 3 tipos de Acessórios têm botão
"+ Guardar na mochila"; só os Encantos ficam de fora mesmo, de propósito, porque combinam com
"Criar Item Superior"). Magias (203 no total — só verificação estrutural feita, não
item-por-item).
