# Conteúdo extraído — "Caça Palavras" (JOGO-cacapalavras.swf, 2007)

> Os arquivos da versão antiga (ASP, SWF/FLA, XML, telas de bloqueio) estão em `../_legado/`.

Configuração lida direto do bytecode ActionScript do SWF (bloco `onClipEvent(load)` do controlador)
e textos decodificados das fontes + registros DefineText. Layout conferido rodando o SWF no Ruffle.

- `../js/palavras.js` — as 12 palavras e as regras prontas para uso.
- `textos_brutos_swf.txt` — todos os textos do SWF, sem edição.

## Configuração original

| Variável no SWF            | Valor            | Na versão nova                              |
|----------------------------|------------------|---------------------------------------------|
| `time_limit_val`           | 300000 ms        | 5 minutos                                   |
| `grid_columns_val`         | 25               | 25 colunas; 18 em telas médias; 14 em celulares estreitos |
| `grid_rows_val`            | 18               | 18 linhas; 25 em telas médias; 20 em celulares estreitos  |
| `words_per_puzzle_val`     | 12               | 12 (todas as palavras de `palavras.txt`)    |
| `database_file_val`        | `palavras.txt`   | `js/palavras.js`                            |
| `correct_points_val`       | 20               | +20 por palavra (máximo 240)                |
| `incorrect_points_val`     | 0                | erro não tira pontos                        |
| `show_unfound_val`         | True             | ao perder, as palavras que faltaram aparecem em vermelho |
| `game_over_circle_color`   | 0xFF0000         | vermelho                                    |
| `drag_circle_color`        | 0x000000         | seleção escura                              |
| `word_selection_type_val`  | Dots             | seleção arrastando da 1ª à última letra     |
| `special_sound_probability`| 0,25             | sons de acerto/erro (sintetizados, com botão para desligar) |

## Telas e fluxo

1. "carregando..." → grade 25×18 gerada **aleatoriamente** a cada partida, em 8 direções
   (horizontal, vertical e diagonais, nos dois sentidos). Banco de palavras à direita, em ordem alfabética.
2. Rodapé: **Tempo** (contagem regressiva m:ss), **Pontos**, "2007 - Petrobras | Repar. Copyright…" e **REINICIAR**.
3. **Vitória** (todas encontradas): "PARABÉNS!", "SUA PONTUAÇÃO:", "Tente superar seu tempo na próxima
   tentativa." e "CLIQUE PARA JOGAR". A pontuação era enviada por POST para `grava.asp`.
4. **Derrota** (tempo esgotado): as palavras não encontradas são circuladas em vermelho e depois aparece
   "VOCÊ PERDEU!" / "Tente ser mais rápido na próxima tentativa." com **REINICIAR**.

## O que foi removido

- `sessao.asp` fixava um usuário (`sChave = X810`); `default.asp` exigia sessão e bloqueava quem já tinha
  jogado 2 vezes (`qtd_jogo > 2`); `grava.asp` gravava pontuação em `xml/caca_palavras.xml`.
- Não havia banco SQL — o "banco" era esse XML. Na versão nova não há login, limite de partidas nem servidor;
  os recordes (pontos e melhor tempo) ficam no `localStorage` do navegador.
- As imagens `tela_bloqueio.jpg` e `tela_expired.jpg`, citadas pelas telas de bloqueio, não estavam na pasta.
