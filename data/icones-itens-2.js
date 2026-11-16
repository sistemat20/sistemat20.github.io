// Ícones dos itens esotéricos e mágicos (continuação de data/icones-itens.js; marcas {S} {s} {F} {D}).
// Poção não precisa de linha aqui: js/itens-icones.js monta o frasco na cor da magia com o ícone
// da própria magia dentro. Arma e armadura específicas usam o desenho do item base, menor, com o
// selo próprio no canto; acessórios juntam uma peça (anel, manto, livro...) com o símbolo dele.
const ICONE_DO_ITEM_2 = (()=>{
  const SIMB = {
    raio:'<path d="M4 -18 L-8 2 H4 L-6 18" {S}/>',
    chama:'<path d="M0 18 Q-16 6 -8 -10 Q-4 0 0 0 Q2 -12 10 -18 Q18 6 0 18 Z" {S}/>',
    sol:'<circle r="7" {S}/><path d="M0 -18 V-12 M0 12 V18 M-18 0 H-12 M12 0 H18 M-12 -12 L-8 -8 M12 12 L8 8 M12 -12 L8 -8 M-12 12 L-8 8" {s}/>',
    lua:'<path d="M4 -16 A16 16 0 1 0 4 16 A12 12 0 1 1 4 -16 Z" {S}/>',
    olho:'<path d="M-18 0 Q0 -14 18 0 Q0 14 -18 0 Z" {S}/><circle r="4" {F}/>',
    olhoFechado:'<path d="M-16 -2 Q0 10 16 -2 M-10 4 L-14 10 M0 7 V14 M10 4 L14 10" {S}/>',
    caveira:'<path d="M-12 0 Q-12 -16 0 -16 Q12 -16 12 0 Q12 8 6 10 V16 H-6 V10 Q-12 8 -12 0 Z" {S}/><circle cx="-5" cy="-1" r="3" {F}/><circle cx="5" cy="-1" r="3" {F}/>',
    folha:'<path d="M0 -18 Q18 0 0 18 Q-18 0 0 -18 Z M0 -12 V14" {S}/>',
    coracao:'<path d="M0 16 C-18 2 -14 -14 0 -6 C14 -14 18 2 0 16 Z" {S}/>',
    estrela:'<path d="M0 -18 L5 -6 L18 -5 L8 4 L11 17 L0 10 L-11 17 L-8 4 L-18 -5 L-5 -6 Z" {S}/>',
    coroa:'<path d="M-18 10 L-14 -12 L-6 0 L0 -16 L6 0 L14 -12 L18 10 Z" {S}/>',
    asas:'<path d="M0 4 Q-12 -14 -22 -8 Q-12 0 -16 8 Q-6 8 0 4 M0 4 Q12 -14 22 -8 Q12 0 16 8 Q6 8 0 4" {S}/>',
    espinho:'<path d="M0 -18 L4 -4 L18 0 L4 4 L0 18 L-4 4 L-18 0 L-4 -4 Z" {S}/>',
    trevo:'<circle cx="0" cy="-8" r="6" {S}/><circle cx="-8" cy="4" r="6" {S}/><circle cx="8" cy="4" r="6" {S}/><path d="M0 8 Q2 14 6 18" {s}/>',
    garra:'<path d="M-12 14 Q-14 -6 -4 -18 M0 14 Q0 -6 8 -18 M12 14 Q14 -2 20 -12" {S}/>',
    runa:'<path d="M0 -18 V18 M0 -6 L12 -14 M0 6 L-12 -2" {S}/>',
    cobra:'<path d="M-14 16 Q-16 0 0 2 Q14 4 12 -8 Q10 -18 -2 -16" {S}/><circle cx="-2" cy="-14" r="2" {F}/>',
    chifres:'<path d="M-14 12 Q-20 -10 -6 -18 Q-12 -4 -4 8 M14 12 Q20 -10 6 -18 Q12 -4 4 8" {S}/>',
    tormenta:'<path d="M-16 0 Q0 -14 16 0 Q0 14 -16 0 Z M-20 -12 L-12 -6 M20 -12 L12 -6 M0 -20 V-12" {S}/><circle r="4" {F}/>',
    cruz:'<path d="M0 -18 V18 M-12 -6 H12" {S}/>',
    dunas:'<path d="M-20 10 Q-8 -6 2 10 Q10 -2 20 10 M-14 -4 Q-6 -12 2 -4" {S}/>',
    floco:'<path d="M0 -18 V18 M-16 -9 L16 9 M16 -9 L-16 9" {S}/>',
    explosao:'<path d="M0 -20 L5 -7 L18 -12 L10 -1 L20 8 L6 7 L4 20 L-3 8 L-16 14 L-9 2 L-20 -6 L-6 -6 Z" {S}/>',
    pata:'<circle cx="0" cy="8" r="8" {S}/><circle cx="-10" cy="-8" r="4" {S}/><circle cx="0" cy="-14" r="4" {S}/><circle cx="10" cy="-8" r="4" {S}/>',
    louro:'<path d="M-12 16 Q-20 -2 -6 -16 M12 16 Q20 -2 6 -16 M-16 4 L-10 2 M-14 -6 L-8 -6 M16 4 L10 2 M14 -6 L8 -6" {S}/>',
    estrelas:'<circle cx="-10" cy="-8" r="3" {F}/><circle cx="8" cy="-12" r="2.5" {F}/><circle cx="2" cy="8" r="3.5" {F}/><path d="M-6 -2 A10 10 0 1 0 12 4" {s}/>',
    corrente:'<ellipse cx="-8" cy="0" rx="10" ry="6" {S}/><ellipse cx="8" cy="0" rx="10" ry="6" {S}/>',
    escudo:'<path d="M0 -16 L14 -10 Q14 6 0 16 Q-14 6 -14 -10 Z" {S}/>',
    espiral:'<path d="M0 0 a4 4 0 1 1 4 -4 a9 9 0 1 1 -9 9 a14 14 0 1 1 14 -14" {S}/>',
    mais:'<path d="M0 -14 V14 M-14 0 H14" {S}/>',
    seta:'<path d="M-16 14 L14 -14 M2 -14 H14 V-2" {S}/>',
    refletir:'<path d="M-16 -12 L0 0 L-16 12 M16 -12 L0 0" {S}/>',
    opostas:'<path d="M-16 0 H16 M-16 0 L-8 -6 M-16 0 L-8 6 M16 0 L8 -6 M16 0 L8 6" {S}/>',
    nuvem:'<path d="M-18 8 Q-20 -4 -8 -4 Q-4 -16 8 -12 Q20 -12 18 2 Q24 4 20 10 Z" {S}/>',
    pena:'<path d="M10 -18 Q-6 -10 -10 18 Q4 4 10 -18 Z M-10 18 L-14 22" {S}/>',
    mascara:'<path d="M-18 -4 Q-8 -12 0 -6 Q8 -12 18 -4 Q14 8 4 6 L0 2 L-4 6 Q-14 8 -18 -4 Z" {S}/>',
    fantasma:'<path d="M-12 16 V-2 Q-12 -16 0 -16 Q12 -16 12 -2 V16 L6 10 L0 16 L-6 10 Z" {S}/><circle cx="-4" cy="-4" r="2" {F}/><circle cx="4" cy="-4" r="2" {F}/>',
    aranha:'<circle r="5" {F}/><path d="M-5 -2 L-16 -10 M-5 2 L-16 10 M5 -2 L16 -10 M5 2 L16 10 M-4 -4 L-10 -16 M4 -4 L10 -16" {s}/>',
    morcego:'<path d="M0 -4 Q-8 -12 -20 -8 Q-14 0 -16 8 Q-8 2 0 6 Q8 2 16 8 Q14 0 20 -8 Q8 -12 0 -4 Z" {S}/>',
    montanha:'<path d="M-18 14 L-4 -12 L4 2 L10 -6 L18 14 Z" {S}/>',
    onda:'<path d="M-18 -4 Q-9 -12 0 -4 T18 -4 M-18 8 Q-9 0 0 8 T18 8" {S}/>',
    portal:'<ellipse rx="16" ry="18" {S}/><ellipse rx="8" ry="11" {s}/>',
    gota:'<path d="M0 -16 Q12 2 12 6 A12 12 0 0 1 -12 6 Q-12 2 0 -16 Z" {S}/>',
  };
  const s = (nome, x, y, k)=> '<g transform="translate('+x+' '+y+') scale('+(k||1)+')">'+SIMB[nome]+'</g>';
  const base = (nome)=> '<g transform="translate(6 34) scale(.8)">'+(ICONE_DO_ITEM[nome]||'')+'</g>';
  const esp = (b, simb)=> base(b) + s(simb, 152, 46, 1.25);
  const ANEL = '<ellipse cx="100" cy="138" rx="40" ry="28" {S}/><path d="M82 112 L100 94 L118 112 L100 122 Z" {S}/>';
  const MANTO = '<path d="M80 40 Q100 52 120 40 L150 162 Q100 174 50 162 Z" {S}/>';
  const LIVRO = '<path d="M38 58 Q68 48 100 60 Q132 48 162 58 V152 Q132 142 100 154 Q68 142 38 152 Z M100 60 V154" {S}/>';
  const PINGENTE = '<path d="M60 26 Q100 80 140 26" {D}/><circle cx="100" cy="118" r="36" {S}/>';
  const GEMA = '<path d="M58 76 L84 46 H116 L142 76 L100 164 Z M58 76 H142" {S}/>';
  const BOTA = '<path d="M60 52 H102 V122 L140 134 Q152 138 152 152 V162 H60 Z" {S}/>';
  const CINTO = '<path d="M24 92 H176 V126 H24 Z" {S}/><path d="M80 80 H120 V138 H80 Z" {S}/>';
  const PULSEIRAS = '<ellipse cx="68" cy="122" rx="26" ry="38" {S}/><ellipse cx="132" cy="122" rx="26" ry="38" {S}/>';
  const BRINCOS = '<path d="M64 60 Q56 70 64 80 V100 M136 60 Q144 70 136 80 V100" {S}/><path d="M64 100 L52 126 L64 146 L76 126 Z M136 100 L124 126 L136 146 L148 126 Z" {S}/>';
  const ELMO = '<path d="M50 140 Q50 56 100 52 Q150 56 150 140 Z M68 104 H132 M100 52 V96" {S}/>';
  const ESPELHO = '<ellipse cx="100" cy="84" rx="42" ry="52" {S}/><path d="M100 136 V174 M86 174 H114" {S}/>';
  const ORBE = '<circle cx="100" cy="90" r="46" {S}/><path d="M66 158 H134 L124 140 H76 Z" {S}/>';
  return {
    // ---------------- Esotéricos
    'Bolsa de pó': '<path d="M70 82 Q56 162 100 162 Q144 162 130 82 Z M70 82 Q100 70 130 82 M86 72 L78 52 M114 72 L122 52" {S}/><circle cx="60" cy="40" r="4" {F}/><circle cx="140" cy="36" r="4" {F}/><circle cx="100" cy="30" r="3" {F}/>',
    'Cajado arcano': '<path d="M70 178 L120 62" {S}/><path d="M120 62 L110 34 L132 18 L148 40 L136 66 Z" {S}/><path d="M118 40 L140 44" {s}/>',
    'Cetro elemental': '<path d="M100 76 V178 M86 160 H114" {S}/><circle cx="100" cy="56" r="20" {S}/><circle cx="64" cy="40" r="9" {S}/><circle cx="136" cy="40" r="9" {S}/><circle cx="76" cy="84" r="7" {S}/><circle cx="124" cy="84" r="7" {S}/>',
    'Costela de lich': '<path d="M50 170 Q40 100 80 50 Q100 30 130 34" {S} stroke-width="12"/><path d="M58 150 L80 146 M60 118 L84 118 M70 88 L92 92 M88 62 L106 70" {s}/>',
    'Dedo de ente': '<path d="M80 170 Q76 120 84 90 Q90 60 104 40 Q118 26 128 36 Q134 48 122 60 Q110 80 112 110 Q114 140 120 170" {S}/><path d="M94 120 L80 112 M110 90 L124 84" {s}/>',
    'Luva de ferro': '<path d="M64 166 V100 Q64 88 74 88 V56 Q74 48 82 48 Q90 48 90 56 V88 V44 Q90 36 98 36 Q106 36 106 44 V88 V52 Q106 44 114 44 Q122 44 122 52 V100 L132 90 Q140 82 146 90 L128 140 V166 Z" {S}/><path d="M64 120 H128 M64 144 H128" {s}/>',
    'Medalhão de prata': '<path d="M60 26 Q100 80 140 26" {D}/><circle cx="100" cy="118" r="38" {S}/><circle cx="100" cy="118" r="24" {s}/><path d="M100 104 L104 114 L114 114 L106 120 L109 130 L100 124 L91 130 L94 120 L86 114 L96 114 Z" {F}/>',
    'Orbe cristalino': ORBE + '<path d="M82 76 Q90 62 106 62" {s}/><path d="M100 76 L110 90 L100 104 L90 90 Z" {s}/>',
    'Tomo hermético': LIVRO + '<path d="M60 96 Q72 86 84 96 Q72 106 60 96 Z M116 88 L140 112 M140 88 L116 112" {s}/><circle cx="72" cy="96" r="3" {F}/>',
    'Varinha arcana': '<path d="M50 160 L128 82" {S}/><path d="M140 40 L146 58 L164 60 L150 72 L154 90 L140 80 L126 90 L130 72 L116 60 L134 58 Z" {S}/>',
    'Ankh Solar': '<path d="M100 92 Q74 70 82 44 Q90 26 100 26 Q110 26 118 44 Q126 70 100 92 Z M100 92 V176 M64 106 H136" {S}/>',
    'Tomo de Guerra': LIVRO + s('cruz', 72, 104, 1.1) + '<path d="M128 80 V128 M118 116 H138" {S}/>',
    'Tomo do Rancor': LIVRO + s('caveira', 72, 104, 1.1) + s('chama', 128, 104, 1.1),
    // ---------------- Armas específicas (base menor + selo)
    'Arco do Poder': esp('Arco longo', 'raio'), 'Avalanche': esp('Machado de guerra', 'floco'),
    'Azagaia dos Relâmpagos': esp('Azagaia', 'raio'), 'Besta Explosiva': esp('Besta pesada', 'explosao'),
    'Cajado da Destruição': esp('Bordão', 'caveira'), 'Cajado da Vida': esp('Bordão', 'coracao'), 'Cajado do Poder': esp('Bordão', 'estrela'),
    'Espada Baronial': esp('Espada longa', 'coroa'), 'Espada Sortuda': esp('Espada curta', 'trevo'), 'Florete Fugaz': esp('Florete', 'asas'),
    'Lâmina da Luz': esp('Espada bastarda', 'sol'), 'Lança Animalesca': esp('Lança', 'garra'), 'Língua do Deserto': esp('Cimitarra', 'dunas'),
    'Machado Silvestre': esp('Machado de batalha', 'folha'), 'Maça do Terror': esp('Maça', 'olho'), 'Martelo de Doherimm': esp('Martelo de guerra', 'runa'),
    'Punhal Sszzaazita': esp('Adaga', 'cobra'), 'Pistola Demoníaca': esp('Pistola', 'chifres'), 'Uyzrrak Da\'ukthra': esp('Machado de guerra', 'tormenta'),
    'Vingadora Sagrada': esp('Espada longa', 'cruz'),
    // ---------------- Armaduras e escudos específicos
    'Armadura da Luz': esp('Armadura completa', 'sol'), 'Baluarte Anão': esp('Armadura completa', 'runa'), 'Carapaça Demoníaca': esp('Armadura completa', 'chifres'),
    'Cota Élfica': esp('Cota de malha', 'folha'), 'Couraça do Comando': esp('Couraça', 'coroa'), 'Couro de Monstro': esp('Gibão de peles', 'garra'),
    'Escudo de Azgher': esp('Escudo pesado', 'sol'), 'Escudo do Conjurador': esp('Escudo leve', 'estrela'), 'Escudo do Eclipse': esp('Escudo pesado', 'lua'),
    'Escudo Espinhoso': esp('Escudo pesado', 'espinho'), 'Escudo do Leão': esp('Escudo pesado', 'pata'), 'Loriga do Centurião': esp('Loriga segmentada', 'louro'),
    'Manto da Noite': esp('Couro batido', 'estrelas'), 'Grilhão de Descrença': esp('Armadura completa', 'corrente'),
    // ---------------- Acessórios menores
    'Anel do sustento': ANEL + s('folha', 100, 52, 1.4), 'Bainha mágica': '<path d="M84 30 H116 L112 150 L100 172 L88 150 Z M80 46 H120" {S}/>' + s('estrela', 146, 60),
    'Corda da escalada': '<ellipse cx="96" cy="128" rx="50" ry="20" {S}/><ellipse cx="96" cy="116" rx="38" ry="15" {S}/><path d="M140 136 Q160 110 150 70" {S}/>' + s('seta', 150, 46),
    'Ferraduras da velocidade': '<path d="M62 160 V100 Q62 54 100 54 Q138 54 138 100 V160 M50 160 H74 M126 160 H150" {S}/><circle cx="72" cy="120" r="3" {F}/><circle cx="128" cy="120" r="3" {F}/>' + s('raio', 100, 100, 1.2),
    'Garrafa da fumaça eterna': '<path d="M90 70 H110 V92 Q132 102 132 130 Q132 164 100 164 Q68 164 68 130 Q68 102 90 92 Z" {S}/>' + s('nuvem', 100, 40, 1.4),
    'Gema da luminosidade': GEMA + s('sol', 100, 104, 1.1), 'Manto élfico': MANTO + s('folha', 100, 112, 1.5), 'Mochila de carga': '<path d="M60 64 Q60 40 100 40 Q140 40 140 64 V160 H60 Z" {S}/>' + s('estrela', 100, 110, 1.4),
    'Brincos da sagacidade': BRINCOS + s('espiral', 100, 40), 'Luvas da delicadeza': '<path d="M70 166 V100 Q70 90 78 90 V58 Q78 50 86 50 Q94 50 94 58 V90 V48 Q94 40 102 40 Q110 40 110 48 V90 V56 Q110 48 118 48 Q126 48 126 56 V104 L134 92 Q140 84 146 90 L130 140 V166 Z" {S}/>' + s('pena', 156, 46),
    'Manoplas da força do ogro': '<path d="M60 160 V96 Q60 84 72 84 H132 Q144 84 144 96 V120 Q144 160 110 160 Z M72 84 V108 M92 84 V108 M112 84 V108 M132 84 V108" {S}/>' + s('explosao', 100, 44, 1.3),
    'Manto da resistência': MANTO + s('escudo', 100, 112, 1.6), 'Manto do fascínio': MANTO + s('coracao', 100, 112, 1.6), 'Pingente da sensatez': PINGENTE + s('olho', 100, 118, 1.2),
    'Torque do vigor': '<path d="M50 90 Q50 150 100 150 Q150 150 150 90" {S} stroke-width="12"/><circle cx="50" cy="86" r="8" {S}/><circle cx="150" cy="86" r="8" {S}/>' + s('mais', 100, 70, 1.4),
    'Chapéu do disfarce': '<path d="M68 112 Q70 60 100 60 Q130 60 132 112 Z" {S}/><ellipse cx="100" cy="118" rx="70" ry="18" {S}/>' + s('mascara', 100, 152, 1.3),
    'Flauta fantasma': '<path d="M36 156 L156 60" {S} stroke-width="12"/><circle cx="76" cy="124" r="3" {F}/><circle cx="96" cy="108" r="3" {F}/>' + s('fantasma', 66, 60, 1.3),
    'Lanterna da revelação': '<path d="M70 70 H130 V150 H70 Z M80 70 L90 50 H110 L120 70 M100 50 V34" {S}/>' + s('olho', 100, 110, 1.2),
    'Anel da proteção': ANEL + s('escudo', 100, 52, 1.4), 'Anel do escudo mental': ANEL + s('espiral', 100, 52, 1.2), 'Pingente da saúde': PINGENTE + s('mais', 100, 118, 1.3),
    // ---------------- Acessórios médios
    'Anel de telecinesia': '<ellipse cx="100" cy="124" rx="44" ry="36" {S}/><path d="M82 84 L100 60 L118 84 L100 100 Z" {S}/><path d="M150 50 l4 9 9 4 -9 4 -4 9 -4 -9 -9 -4 9 -4z" {F}/>',
    'Bola de cristal': ORBE + s('estrela', 100, 90, 1.3), 'Caveira maldita': '<path d="M56 96 Q56 40 100 40 Q144 40 144 96 Q144 120 128 128 V150 H72 V128 Q56 120 56 96 Z" {S}/><circle cx="82" cy="94" r="10" {F}/><circle cx="118" cy="94" r="10" {F}/><path d="M88 150 V136 M100 150 V136 M112 150 V136" {s}/>',
    'Botas aladas': BOTA + s('asas', 140, 64, 1.4), 'Braceletes de bronze': PULSEIRAS + s('escudo', 100, 44, 1.2), 'Anel da energia': ANEL + s('raio', 100, 52, 1.4),
    'Anel da vitalidade': ANEL + s('coracao', 100, 52, 1.4), 'Anel de invisibilidade': ANEL + s('olhoFechado', 100, 52, 1.4),
    'Braçadeiras do arqueiro': '<path d="M60 70 L140 70 L132 150 H68 Z" {S}/><path d="M66 96 H136 M68 124 H134" {s}/>' + s('seta', 100, 40, 1.2),
    'Brincos de Marah': BRINCOS + s('coracao', 100, 40), 'Faixas do pugilista': '<path d="M60 150 V90 Q60 76 76 76 H124 Q140 76 140 90 V150 Z" {S}/><path d="M60 98 L140 118 M60 122 L140 142 M60 146 L140 98" {s}/>' + s('estrela', 100, 44),
    'Manto da aranha': MANTO + s('aranha', 100, 112, 1.6), 'Vassoura voadora': '<path d="M40 150 L140 60" {S}/><path d="M140 60 L170 70 L162 40 Z M150 50 L176 52 M150 50 L160 26" {S}/>' + s('asas', 70, 70, 1.3),
    'Símbolo abençoado': PINGENTE + s('cruz', 100, 118, 1.4), 'Amuleto da robustez': PINGENTE + s('montanha', 100, 120, 1.3),
    'Botas velozes': BOTA + s('raio', 140, 64, 1.4), 'Cinto da força do gigante': CINTO + s('explosao', 100, 109, .9), 'Coroa majestosa': '<path d="M40 150 L48 70 L76 110 L100 56 L124 110 L152 70 L160 150 Z M40 150 H160" {S}/>' + s('estrela', 100, 128, .9),
    'Estola da serenidade': '<path d="M64 40 Q100 70 136 40 M64 40 V170 H84 V60 M136 40 V170 H116 V60" {S}/>' + s('onda', 100, 120, 1.2), 'Manto do morcego': MANTO + s('morcego', 100, 112, 1.6),
    'Pulseiras da celeridade': PULSEIRAS + s('asas', 100, 44, 1.2), 'Tiara da sapiência': '<path d="M40 130 Q100 70 160 130 M60 112 L52 96 M140 112 L148 96" {S}/>' + s('olho', 100, 88, 1.3),
    // ---------------- Acessórios maiores
    'Elmo do teletransporte': ELMO + s('portal', 100, 30, 1.1), 'Gema da telepatia': GEMA + s('espiral', 100, 102, 1), 'Gema elemental': GEMA + s('chama', 100, 104, 1.1),
    'Manual da saúde corporal': LIVRO + s('mais', 72, 104, 1.1) + s('coracao', 128, 104, 1.1), 'Manual do bom exercício': LIVRO + s('raio', 72, 104, 1.1) + s('explosao', 128, 104, .9),
    'Manual dos movimentos precisos': LIVRO + s('seta', 72, 104, 1) + s('asas', 128, 104, .9), 'Medalhão de Lena': PINGENTE + s('sol', 100, 118, 1.2),
    'Tomo da compreensão': LIVRO + s('olho', 72, 104, 1) + s('estrela', 128, 104, 1), 'Tomo da liderança e influência': LIVRO + s('coroa', 72, 104, 1) + s('coracao', 128, 104, 1),
    'Tomo dos grandes pensamentos': LIVRO + s('espiral', 72, 104, 1) + s('estrelas', 128, 104, 1), 'Anel refletor': ANEL + s('refletir', 100, 52, 1.4),
    'Cinto do campeão': CINTO + s('estrela', 100, 109, .9), 'Colar guardião': PINGENTE + s('escudo', 100, 118, 1.4),
    'Estatueta animista': '<path d="M70 166 H130 V150 H70 Z M84 150 L88 110 Q76 96 84 80 Q92 66 100 66 Q108 66 116 80 Q124 96 112 110 L116 150" {S}/>' + s('pata', 100, 40, 1.1),
    'Anel da liberdade': ANEL + s('asas', 100, 52, 1.4), 'Tapete voador': '<path d="M30 110 Q65 90 100 110 T170 110 L160 150 Q125 130 90 150 T20 150 Z" {S}/><path d="M26 150 L18 162 M170 110 L180 100" {s}/>' + s('nuvem', 100, 56, 1.4),
    'Braceletes de ouro': PULSEIRAS + s('estrela', 100, 44, 1.2), 'Espelho da oposição': ESPELHO + s('opostas', 100, 84, 1.3), 'Robe do arquimago': '<path d="M78 40 Q100 52 122 40 L136 70 L130 164 H70 L64 70 Z M64 70 L36 104 M136 70 L164 104" {S}/>' + s('estrela', 100, 112, 1.3),
    'Orbe das tempestades': ORBE + s('raio', 100, 90, 1.4), 'Anel da regeneração': ANEL + s('mais', 100, 52, 1.4), 'Espelho do aprisionamento': ESPELHO + s('corrente', 100, 84, 1.4),
    'Chifre de Unicórnio': '<path d="M70 170 L130 30 L110 172 Z" {S}/><path d="M84 140 L118 130 M92 110 L122 100 M100 80 L126 70" {s}/>',
    'Fragmento de Filactério': '<path d="M60 70 L110 40 L150 80 L130 150 L70 140 Z M110 40 L100 100 L130 150 M100 100 L70 140" {S}/>' + s('caveira', 106, 92, .9),
    // ---------------- Artefatos
    'Espada-Deus': base('Montante') + s('sol', 152, 46, 1.4) + s('coroa', 48, 52, 1),
    'Joia da Alma': GEMA + s('espiral', 100, 102, 1.1) + s('fantasma', 150, 40, .9),
    'Baralho do Caos': '<path d="M56 60 L110 46 L130 136 L76 150 Z" {S}/><path d="M80 50 L136 50 V144 H80" {s}/><path d="M104 42 L158 56 L136 146" {s}/>' + s('espiral', 94, 98, .9),
    'Amuleto do Abutre': PINGENTE + s('asas', 100, 118, 1.5) + s('caveira', 100, 118, .6),
    'Rompedor da Realidade': '<circle cx="100" cy="100" r="58" {S}/><path d="M100 42 L92 80 L116 98 L84 124 L104 158 M116 98 L156 90 M84 124 L44 118" {S}/>',
  };
})();
