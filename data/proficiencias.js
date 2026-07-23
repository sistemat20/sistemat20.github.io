// Proficiências por Classe — Tormenta 20 (Livro Básico, seção "Proficiências" de cada classe)
// Toda classe já é proficiente em: armas simples, armaduras leves, ataques desarmados e armas naturais.
// Os campos abaixo listam o que cada classe ganha ALÉM disso.
function PC(classe, armasMarciais, armadurasPesadas, escudos){
  return {classe, armasMarciais, armadurasPesadas, escudos};
}
const PROFICIENCIAS_CLASSE = {
  "Arcanista": PC("Arcanista", false, false, false),
  "Bárbaro": PC("Bárbaro", true, false, true),
  "Bardo": PC("Bardo", true, false, false),
  "Bucaneiro": PC("Bucaneiro", true, false, false),
  "Caçador": PC("Caçador", true, false, true),
  "Cavaleiro": PC("Cavaleiro", true, true, true),
  "Clérigo": PC("Clérigo", false, true, true),
  "Druida": PC("Druida", false, false, true),
  "Guerreiro": PC("Guerreiro", true, true, true),
  "Inventor": PC("Inventor", false, false, false),
  "Ladino": PC("Ladino", false, false, false),
  "Lutador": PC("Lutador", false, false, false),
  "Nobre": PC("Nobre", true, true, true),
  "Paladino": PC("Paladino", true, true, true),
};
