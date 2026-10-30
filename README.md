# Caça-Palavras — REPAR 30 anos

Caça-palavras com termos da Refinaria Presidente Getúlio Vargas (REPAR), criado em 2007 em Flash/ASP
para os 30 anos da refinaria e recriado em HTML, CSS, SVG e JavaScript puros.

São 12 palavras (Petróleo, REPAR, Oleoduto, Modernização, Petrobras, Abastecimento, Tecnologia,
Craqueamento, Biocombustível, Destilação, Qualificação e Segurança) escondidas numa grade de 25×18
gerada a cada partida, em 8 direções. O jogador tem 5 minutos, e cada palavra vale +20 pontos.

- Sem login, sem servidor e sem banco de dados: basta abrir `index.html`.
- Arraste da primeira à última letra, ou toque nas duas. Funciona com mouse e no celular;
  a grade se adapta à largura (25×18, 18×25 ou 14×20) para as letras não ficarem pequenas demais.
- Recordes (melhor tempo e pontos) e a preferência de som ficam salvos no navegador (`localStorage`).
- Grade desenhada em SVG (`js/jogo.js`); palavras e regras em `js/palavras.js`.
- `conteudo_extraido/` documenta a configuração e os textos recuperados do SWF original.
