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
  // O SWF usava 25×18 (grid_columns_val / grid_rows_val). A versão nova usa 16×14 para as
  // teclas ficarem maiores; no celular em pé a mesma grade fica girada (14×16).
  // 14 é o mínimo: BIOCOMBUSTIVEL tem 14 letras.
  colunas: 16,
  linhas: 14,
  tempo: 5 * 60,        // time_limit_val = 300000 ms
  pontosAcerto: 20,     // correct_points_val
  pontosErro: 0         // incorrect_points_val
};
