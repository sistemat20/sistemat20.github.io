// Lista restrita de perícias que cada classe permite escolher como 'extra' (Cap. 1, seções de classe)
// Perícias ganhas por bônus de Inteligência NÃO precisam vir dessa lista — podem ser qualquer perícia.
const PERICIAS_POR_CLASSE = {
  "Arcanista": ["Conhecimento", "Diplomacia", "Enganação", "Guerra", "Iniciativa", "Intimidação", "Intuição", "Investigação", "Nobreza", "Ofício", "Percepção"],
  "Bárbaro": ["Adestramento", "Atletismo", "Cavalgar", "Iniciativa", "Intimidação", "Ofício", "Percepção", "Pontaria", "Sobrevivência", "Vontade"],
  "Bardo": ["Acrobacia", "Cavalgar", "Conhecimento", "Diplomacia", "Enganação", "Furtividade", "Iniciativa", "Intuição", "Investigação", "Jogatina", "Ladinagem", "Luta", "Misticismo", "Nobreza", "Percepção", "Pontaria", "Vontade"],
  "Bucaneiro": ["Acrobacia", "Atletismo", "Atuação", "Enganação", "Fortitude", "Furtividade", "Iniciativa", "Intimidação", "Jogatina", "Luta", "Ofício", "Percepção", "Pilotagem", "Pontaria"],
  "Caçador": ["Adestramento", "Atletismo", "Cavalgar", "Cura", "Fortitude", "Furtividade", "Iniciativa", "Investigação", "Luta", "Ofício", "Percepção", "Pontaria", "Reflexos"],
  "Cavaleiro": ["Adestramento", "Atletismo", "Cavalgar", "Diplomacia", "Guerra", "Iniciativa", "Intimidação", "Nobreza", "Percepção", "Vontade"],
  "Clérigo": ["Conhecimento", "Cura", "Diplomacia", "Fortitude", "Iniciativa", "Intuição", "Luta", "Misticismo", "Nobreza", "Ofício", "Percepção"],
  "Druida": ["Adestramento", "Atletismo", "Cavalgar", "Conhecimento", "Cura", "Fortitude", "Iniciativa", "Intuição", "Luta", "Misticismo", "Ofício", "Percepção", "Religião"],
  "Guerreiro": ["Adestramento", "Atletismo", "Cavalgar", "Guerra", "Iniciativa", "Intimidação", "Luta", "Ofício", "Percepção", "Pontaria", "Reflexos"],
  "Inventor": ["Conhecimento", "Cura", "Diplomacia", "Fortitude", "Iniciativa", "Investigação", "Luta", "Misticismo", "Ofício", "Pilotagem", "Percepção", "Pontaria"],
  "Ladino": ["Acrobacia", "Atletismo", "Atuação", "Cavalgar", "Conhecimento", "Diplomacia", "Enganação", "Furtividade", "Iniciativa", "Intimidação", "Intuição", "Investigação", "Jogatina", "Luta", "Ofício", "Percepção", "Pilotagem", "Pontaria"],
  "Lutador": ["Acrobacia", "Adestramento", "Atletismo", "Enganação", "Furtividade", "Iniciativa", "Intimidação", "Ofício", "Percepção", "Pontaria", "Reflexos"],
  "Nobre": ["Adestramento", "Atuação", "Cavalgar", "Conhecimento", "Diplomacia", "Enganação", "Fortitude", "Guerra", "Iniciativa", "Intimidação", "Intuição", "Investigação", "Jogatina", "Luta", "Nobreza", "Ofício", "Percepção"],
  "Paladino": ["Adestramento", "Atletismo", "Cavalgar", "Cura", "Diplomacia", "Fortitude", "Guerra", "Iniciativa", "Intuição", "Nobreza", "Percepção", "Religião"],
};