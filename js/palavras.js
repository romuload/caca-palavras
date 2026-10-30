// Palavras e regras do Caça-Palavras, recuperadas do SWF de 2007 (palavras.txt + onClipEvent(load)).
// "nome" é como a palavra aparece na lista; na grade ela entra sem acentos.

const PALAVRAS = [
  "Abastecimento",
  "Biocombustível",
  "Craqueamento",
  "Destilação",
  "Modernização",
  "Oleoduto",
  "Petrobras",
  "Petróleo",
  "Qualificação",
  "REPAR",
  "Segurança",
  "Tecnologia"
];

const REGRAS = {
  colunas: 25,          // grid_columns_val
  linhas: 18,           // grid_rows_val
  tempo: 5 * 60,        // time_limit_val = 300000 ms
  pontosAcerto: 20,     // correct_points_val
  pontosErro: 0         // incorrect_points_val
};
