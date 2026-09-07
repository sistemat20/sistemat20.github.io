// Sistema de Parceiros (Tormenta 20, Livro Básico, Cap. 6, pág. 260-262) — NPCs que se
// aventuram com o grupo (recrutados, comprados, ganhos como recompensa, ou concedidos por
// poderes tipo Familiar/Companheiro Animal/Montaria/Autômato/Escudeiro/Corte). Cada parceiro dá
// um bônus fixo dependendo do TIPO e do nível de poder (iniciante/veterano/mestre) — eles não
// agem por conta própria, não têm turno.
//
// PT(nome, descCurta, iniciante, veterano, mestre)
function PT(nome, descCurta, iniciante, veterano, mestre){
  return {nome, descCurta, niveis:{iniciante, veterano, mestre}};
}
const PARCEIRO_TIPOS = [
  PT('Adepto', 'Conjurador que ajuda a lançar magias.',
    'Custo das suas magias de 1º círculo cai em –1 PM.',
    'Como acima, e também reduz o custo das de 2º círculo.',
    'Como acima, e a redução se torna cumulativa com outras.'),
  PT('Ajudante', 'Bardo, nobre ou sábio que ajuda com palavras. Não pode dar bônus em Luta/Pontaria.',
    '+2 em duas perícias (escolhidas pelo parceiro).',
    '+2 em três perícias.',
    '+4 em três perícias.'),
  PT('Assassino', 'Ladino ou tipo furtivo e letal.',
    'Ganha Ataque Furtivo +1d6 (cumulativo se já tiver a habilidade).',
    'Além do Ataque Furtivo, +2 em testes de ataque corpo a corpo quando flanqueando.',
    'Ataque Furtivo vira +2d6.'),
  PT('Atirador', 'Arqueiro, besteiro ou combatente à distância.',
    '1x/rodada, +1d6 numa rolagem de dano à distância.',
    'Vira +1d10.',
    'Vira +2d8.'),
  PT('Combatente', 'Bucaneiro, guerreiro, paladino ou animal de caça.',
    '+2 em testes de ataque.',
    '+3 em testes de ataque.',
    '+4 em testes de ataque; 1x/rodada, 5 PM pra um ataque extra.'),
  PT('Destruidor', 'Arcanista ou inventor.',
    '1x/rodada (ação livre), 1 PM: 2d6 de dano (ácido/elétrico/fogo/frio) em alcance curto.',
    'Como acima, e 2 PM pra 4d6.',
    'Como acima, e 4 PM pra 6d6 numa área de 6m em alcance médio.'),
  PT('Fortão', 'Bárbaro, lutador ou tipo que bate primeiro.',
    '1x/rodada, +1d8 numa rolagem de dano corpo a corpo.',
    'Vira +1d12.',
    'Vira +3d6.'),
  PT('Guardião', 'Cavaleiro, cão de guarda ou protetor.',
    '+2 na Defesa.',
    '+3 na Defesa.',
    '+4 na Defesa e +2 em testes de resistência.'),
  PT('Magivocador', 'Conjurador especializado em magias ofensivas.',
    'Dano das suas magias +1 dado do mesmo tipo.',
    'Como acima, e +1 na CD pra resistir às suas magias.',
    'Dobra os bônus: +2 dados de dano e +2 na CD.'),
  PT('Médico', 'Clérigo, druida, herbalista ou curador.',
    '1x/rodada, 1 PM: cura 1d8+1 PV de criatura adjacente.',
    'Como acima, e 3 PM pra curar 3d8+3 ou remover uma condição prejudicial.',
    'Como acima, e 5 PM pra curar 6d8+6.'),
  PT('Perseguidor', 'Caçador, farejador ou rastreador.',
    '+2 em Percepção e Sobrevivência.',
    'Pode usar Sentidos Aguçados.',
    'Pode usar Percepção às Cegas.'),
  PT('Vigilante', 'Vigia ou animal de guarda.',
    '+2 em Percepção e Iniciativa.',
    'Pode usar Esquiva Sobrenatural.',
    'Pode usar Olhos nas Costas.'),
];

// Montarias — um tipo ESPECIAL de parceiro (pág. 261-262). Exigem estar montado pra dar
// benefício (ação de movimento pra montar/desmontar, teste de Cavalgar por turno — automático
// se for treinado). Têm categoria de tamanho própria.
// MT(nome, tamanho, obs, iniciante, veterano, mestre)
function MT(nome, tamanho, obs, iniciante, veterano, mestre){
  return {nome, tamanho, obs, niveis:{iniciante, veterano, mestre}};
}
const MONTARIA_TIPOS_ESPECIFICOS = [
  MT('Cavalo', 'Grande', 'A montaria mais comum. Também vale pra pôneis (Médio).',
    'Deslocamento 12m; +1 ação de movimento extra (só pra se deslocar).',
    'Como acima, deslocamento 15m, +2 em ataques corpo a corpo.',
    'Como acima, +2ª ação de movimento extra.'),
  MT('Cão de caça', 'Médio ou Pequeno', 'Comum pra personagens Pequenos/Minúsculos.',
    'Deslocamento 9m, usa faro, +1 ação de movimento extra.',
    'Deslocamento 12m, +2 na Defesa.',
    'Como acima; 1x/rodada, acerto corpo a corpo pode fazer Derrubar como ação livre.'),
  MT('Lobo-das-cavernas', 'Grande', 'Também vale pra lobos comuns (Médio).',
    'Deslocamento 12m, +1 ação de movimento extra.',
    'Deslocamento 15m, +1d8 numa rolagem de dano corpo a corpo 1x/rodada.',
    'Como acima; 1x/rodada, acerto corpo a corpo pode fazer Derrubar como ação livre.'),
  MT('Grifo', 'Grande', 'Iniciante é filhote, não pode ser usado como montaria ainda.',
    '1x/rodada, +1d8 numa rolagem de dano corpo a corpo (não monta ainda).',
    'Como acima; agora pode ser montado, deslocamento de voo 18m.',
    'Como acima, +1 ação de movimento extra.'),
  MT('Gorlogg', 'Grande', 'Besta primitiva usada pelos mais selvagens.',
    'Deslocamento 12m, +1d6 numa rolagem de dano corpo a corpo 1x/rodada.',
    'Como acima, dano vira +1d10.',
    'Deslocamento 15m, dano vira +2d8.'),
  MT('Trobo', 'Grande', 'Animal de carga e tração, também serve como montaria.',
    'Deslocamento 9m, +1 ação de movimento extra, +1 em testes de resistência.',
    'Deslocamento 12m, bônus de resistência vira +2.',
    'Como acima, bônus de resistência vira +5.'),
];

// Limite de parceiros por patamar de nível (pág. 260)
function limiteParceiros(f){
  const nivel = nivelTotal(f);
  if(nivel>=17) return 3;
  if(nivel>=5) return 2;
  return 1;
}
function parceirosAtivos(f){ return f.parceiros || []; }
