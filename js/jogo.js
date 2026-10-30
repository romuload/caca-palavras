// "Caça-Palavras" — lógica do jogo. Sem login e sem servidor:
// a grade é gerada no navegador e os recordes ficam no localStorage.

(() => {
  const CHAVE_RECORDE = "repar-caca-palavras-recorde";
  const CHAVE_SOM = "repar-caca-palavras-som";
  const CELULA = 40;    // tamanho da célula em unidades do viewBox
  const RAIO = 19;      // meia altura do contorno vermelho das palavras que faltaram
  const TECLA = 35;     // lado da tecla de cada letra (o resto da célula é o espaço entre teclas)
  const SVG_NS = "http://www.w3.org/2000/svg";
  const DIRECOES = [[0, 1], [1, 0], [1, 1], [-1, 1], [0, -1], [-1, 0], [-1, -1], [1, -1]]; // [dLinha, dColuna]
  const CORES = ["#f2c14e", "#7cc4a4", "#8fb8e8", "#f29e7d", "#b9a3e3", "#a8d672",
                 "#f7a8c4", "#6fd0d6", "#e8c07a", "#9fc5a0", "#d9a6e0", "#f5d06f"];

  const el = {
    tempo: document.getElementById("tempo"),
    placarTempo: document.getElementById("placar-tempo"),
    pontos: document.getElementById("pontos"),
    delta: document.getElementById("placar-delta"),
    palco: document.getElementById("palco"),
    grade: document.getElementById("grade"),
    banco: document.getElementById("banco"),
    contagem: document.getElementById("contagem"),
    aviso: document.getElementById("aviso"),
    som: document.getElementById("btn-som"),
    reiniciar: document.getElementById("btn-reiniciar")
  };

  // A palavra entra na grade sem acento e em maiúsculas.
  const LISTA = PALAVRAS.map((nome, i) => ({
    nome,
    texto: nome.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase(),
    cor: CORES[i % CORES.length]
  }));

  const estado = {
    linhas: 0, colunas: 0,
    letras: [],          // letras[linha][coluna]
    posicoes: {},        // texto -> {r, c, dr, dc}
    achadas: new Set(),
    pontos: 0,
    inicio: 0,
    relogio: null,
    jogando: false,
    arrasto: null,       // {r, c, fim: {r, c}, moveu}
    ancora: null,        // primeira letra escolhida com um toque
    camadas: null
  };

  // ---------- utilidades ----------

  function esc(t) {
    return String(t).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  }

  function lerRecorde() {
    try { return JSON.parse(localStorage.getItem(CHAVE_RECORDE)) || {}; } catch { return {}; }
  }

  function salvarRecorde(r) {
    try { localStorage.setItem(CHAVE_RECORDE, JSON.stringify(r)); } catch { /* sem storage */ }
  }

  function formatarTempo(seg) {
    const s = Math.max(0, seg);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  }

  function sortear(n) { return Math.floor(Math.random() * n); }

  function noSvg(tag, attrs, pai) {
    const n = document.createElementNS(SVG_NS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (pai) pai.appendChild(n);
    return n;
  }

  // ---------- som (sintetizado; o SWF tinha sons de acerto e erro) ----------

  let somLigado = true;
  try { somLigado = localStorage.getItem(CHAVE_SOM) !== "0"; } catch { /* sem storage */ }
  let audio = null;

  function tocar(notas) {
    if (!somLigado) return;
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      let t = audio.currentTime;
      for (const [freq, dur, tipo] of notas) {
        const osc = audio.createOscillator();
        const vol = audio.createGain();
        osc.type = tipo || "triangle";
        osc.frequency.value = freq;
        vol.gain.setValueAtTime(.18, t);
        vol.gain.exponentialRampToValueAtTime(.001, t + dur);
        osc.connect(vol).connect(audio.destination);
        osc.start(t);
        osc.stop(t + dur);
        t += dur * .8;
      }
    } catch { /* sem áudio */ }
  }

  const SONS = {
    acerto: [[660, .1], [880, .16]],
    erro: [[200, .18, "square"]],
    vitoria: [[523, .12], [659, .12], [784, .12], [1047, .3]],
    derrota: [[392, .2], [330, .2], [262, .35]]
  };

  function desenharBotaoSom() {
    el.som.setAttribute("aria-pressed", String(somLigado));
    el.som.title = somLigado ? "Desligar o som" : "Ligar o som";
  }

  // ---------- geração da grade ----------

  function cabe(letras, texto, r, c, dr, dc) {
    const fimR = r + dr * (texto.length - 1), fimC = c + dc * (texto.length - 1);
    if (fimR < 0 || fimR >= estado.linhas || fimC < 0 || fimC >= estado.colunas) return false;
    for (let i = 0; i < texto.length; i++) {
      const atual = letras[r + dr * i][c + dc * i];
      if (atual && atual !== texto[i]) return false;
    }
    return true;
  }

  // Quantas vezes o texto aparece na grade (em qualquer direção).
  function ocorrencias(letras, texto) {
    let n = 0;
    for (let r = 0; r < estado.linhas; r++)
      for (let c = 0; c < estado.colunas; c++)
        for (const [dr, dc] of DIRECOES) {
          let ok = true;
          for (let i = 0; i < texto.length && ok; i++) {
            const rr = r + dr * i, cc = c + dc * i;
            ok = rr >= 0 && rr < estado.linhas && cc >= 0 && cc < estado.colunas && letras[rr][cc] === texto[i];
          }
          if (ok) n++;
        }
    return n;
  }

  function tentarMontar() {
    const letras = Array.from({ length: estado.linhas }, () => Array(estado.colunas).fill(null));
    const posicoes = {};
    const ordem = [...LISTA].sort((a, b) => b.texto.length - a.texto.length);
    for (const { texto } of ordem) {
      let colocada = false;
      for (let t = 0; t < 400 && !colocada; t++) {
        const [dr, dc] = DIRECOES[sortear(DIRECOES.length)];
        const r = sortear(estado.linhas), c = sortear(estado.colunas);
        if (!cabe(letras, texto, r, c, dr, dc)) continue;
        for (let i = 0; i < texto.length; i++) letras[r + dr * i][c + dc * i] = texto[i];
        posicoes[texto] = { r, c, dr, dc };
        colocada = true;
      }
      if (!colocada) return null;
    }
    for (const linha of letras)
      for (let c = 0; c < linha.length; c++)
        if (!linha[c]) linha[c] = String.fromCharCode(65 + sortear(26));
    // Cada palavra precisa aparecer uma vez só, senão a marcação fica ambígua.
    if (LISTA.some(p => ocorrencias(letras, p.texto) !== 1)) return null;
    return { letras, posicoes };
  }

  // O formato da grade acompanha a largura disponível: a original 25×18 quando cabe,
  // em pé (18×25) em telas médias e 14×20 nos celulares estreitos.
  function dimensoes() {
    const largura = el.grade.parentElement.clientWidth;
    if (largura >= 560) return [REGRAS.colunas, REGRAS.linhas];
    if (largura >= 400) return [REGRAS.linhas, REGRAS.colunas];
    return [REGRAS.pequena.colunas, REGRAS.pequena.linhas];
  }

  function gerarGrade() {
    [estado.colunas, estado.linhas] = dimensoes();
    let grade = null;
    while (!grade) grade = tentarMontar();
    estado.letras = grade.letras;
    estado.posicoes = grade.posicoes;
  }

  // ---------- desenho ----------

  function centro(r, c) { return { x: c * CELULA + CELULA / 2, y: r * CELULA + CELULA / 2 }; }

  // Contorno arredondado da primeira à última letra (palavras que faltaram, no fim do tempo).
  function marca(a, b, classe, pai) {
    const p1 = centro(a.r, a.c), p2 = centro(b.r, b.c);
    const comp = Math.hypot(p2.x - p1.x, p2.y - p1.y);
    const ang = Math.atan2(p2.y - p1.y, p2.x - p1.x) * 180 / Math.PI;
    const attrs = {
      class: "marca " + classe,
      x: -comp / 2 - RAIO, y: -RAIO, width: comp + RAIO * 2, height: RAIO * 2, rx: RAIO,
      pathLength: 100, // o contorno animado de "faltou" usa dasharray 100
      transform: `translate(${(p1.x + p2.x) / 2} ${(p1.y + p2.y) / 2}) rotate(${ang})`
    };
    return noSvg("rect", attrs, pai);
  }

  // Cada letra é uma tecla: sombra embaixo, tecla verde-clara e a letra por cima.
  function desenharGrade() {
    const svg = el.grade;
    svg.innerHTML = "";
    svg.setAttribute("viewBox", `0 0 ${estado.colunas * CELULA} ${estado.linhas * CELULA}`);
    const camadas = {
      teclas: noSvg("g", {}, svg),
      marcas: noSvg("g", {}, svg)
    };
    estado.letras.forEach((linha, r) => linha.forEach((letra, c) => {
      const { x, y } = centro(r, c);
      const g = noSvg("g", { class: "celula", "data-r": r, "data-c": c }, camadas.teclas);
      const canto = { x: x - TECLA / 2, width: TECLA, height: TECLA, rx: 7 };
      noSvg("rect", { ...canto, class: "sombra", y: y - TECLA / 2 + 2 }, g);
      noSvg("rect", { ...canto, class: "tecla", y: y - TECLA / 2 }, g);
      noSvg("text", { class: "letra", x, y }, g).textContent = letra;
    }));
    estado.camadas = camadas;
  }

  function desenharBanco() {
    const ordem = [...LISTA].sort((a, b) => a.texto.localeCompare(b.texto));
    el.banco.innerHTML = ordem.map(p =>
      `<li data-texto="${p.texto}" style="--cor:${p.cor}">${esc(p.nome)}</li>`).join("");
    desenharContagem();
  }

  function desenharContagem() {
    el.contagem.textContent = `${estado.achadas.size}/${LISTA.length}`;
  }

  function casa(r, c) {
    return el.grade.querySelector(`.celula[data-r="${r}"][data-c="${c}"]`);
  }

  function caminho(a, b) {
    const dr = Math.sign(b.r - a.r), dc = Math.sign(b.c - a.c);
    const n = Math.max(Math.abs(b.r - a.r), Math.abs(b.c - a.c));
    return Array.from({ length: n + 1 }, (_, i) => ({ r: a.r + dr * i, c: a.c + dc * i }));
  }

  function limparSelecao() {
    el.grade.querySelectorAll(".na-selecao, .ancora").forEach(n => n.classList.remove("na-selecao", "ancora"));
  }

  function mostrarSelecao(a, b, classe = "na-selecao") {
    limparSelecao();
    caminho(a, b).forEach(p => casa(p.r, p.c).classList.add(classe));
  }

  // ---------- placar e tempo ----------

  function mudarPontos(delta) {
    estado.pontos = Math.max(0, estado.pontos + delta);
    el.pontos.textContent = estado.pontos;
    if (!delta) return;
    el.delta.textContent = delta > 0 ? `+${delta}` : `${delta}`;
    el.delta.className = "placar-delta";
    void el.delta.offsetWidth; // reinicia a animação
    el.delta.classList.add("mais");
  }

  function segundosUsados() { return Math.floor((Date.now() - estado.inicio) / 1000); }

  function atualizarRelogio() {
    const resta = REGRAS.tempo - segundosUsados();
    el.tempo.textContent = formatarTempo(resta);
    el.placarTempo.classList.toggle("urgente", estado.jogando && resta <= 30);
    if (resta <= 0) perder();
  }

  function pararRelogio() {
    clearInterval(estado.relogio);
    estado.relogio = null;
    el.placarTempo.classList.remove("urgente");
  }

  // ---------- seleção com mouse ou dedo ----------

  function pontoSvg(ev) {
    const p = el.grade.createSVGPoint();
    p.x = ev.clientX; p.y = ev.clientY;
    return p.matrixTransform(el.grade.getScreenCTM().inverse());
  }

  function celulaEm(ev) {
    const p = pontoSvg(ev);
    return {
      r: Math.min(estado.linhas - 1, Math.max(0, Math.floor(p.y / CELULA))),
      c: Math.min(estado.colunas - 1, Math.max(0, Math.floor(p.x / CELULA)))
    };
  }

  // Leva o ponteiro para a direção mais próxima entre as 8 e para dentro da grade.
  function fimAlinhado(inicio, ev) {
    const p = pontoSvg(ev), c0 = centro(inicio.r, inicio.c);
    const dx = p.x - c0.x, dy = p.y - c0.y;
    if (Math.hypot(dx, dy) < CELULA / 2) return { ...inicio };
    const oitavo = Math.round(Math.atan2(dy, dx) / (Math.PI / 4));
    const ux = Math.round(Math.cos(oitavo * Math.PI / 4)), uy = Math.round(Math.sin(oitavo * Math.PI / 4));
    let n = Math.round((dx * ux + dy * uy) / (ux * ux + uy * uy) / CELULA);
    while (n > 0) {
      const r = inicio.r + uy * n, c = inicio.c + ux * n;
      if (r >= 0 && r < estado.linhas && c >= 0 && c < estado.colunas) return { r, c };
      n--;
    }
    return { ...inicio };
  }

  function alinhadas(a, b) {
    const dr = Math.abs(b.r - a.r), dc = Math.abs(b.c - a.c);
    return dr === 0 || dc === 0 || dr === dc;
  }

  el.grade.addEventListener("pointerdown", ev => {
    if (!estado.jogando || ev.button > 0) return;
    ev.preventDefault();
    el.grade.setPointerCapture(ev.pointerId);
    const cel = celulaEm(ev);
    estado.arrasto = { ...cel, fim: cel, moveu: false };
    mostrarSelecao(cel, cel);
  });

  el.grade.addEventListener("pointermove", ev => {
    const a = estado.arrasto;
    if (!a) return;
    const fim = fimAlinhado(a, ev);
    if (fim.r === a.fim.r && fim.c === a.fim.c) return;
    a.fim = fim;
    a.moveu = true;
    mostrarSelecao(a, fim);
  });

  function soltar() {
    const a = estado.arrasto;
    if (!a) return;
    estado.arrasto = null;
    const arrastou = a.fim.r !== a.r || a.fim.c !== a.c;

    if (arrastou) { estado.ancora = null; avaliar(a, a.fim); return; }

    // Toque simples: o primeiro toque marca o início, o segundo, o fim da palavra.
    const ancora = estado.ancora;
    if (ancora && !(ancora.r === a.r && ancora.c === a.c) && alinhadas(ancora, a)) {
      estado.ancora = null;
      avaliar(ancora, a);
    } else if (ancora && ancora.r === a.r && ancora.c === a.c) {
      estado.ancora = null;
      limparSelecao();
    } else {
      estado.ancora = { r: a.r, c: a.c };
      mostrarSelecao(a, a, "ancora");
    }
  }

  el.grade.addEventListener("pointerup", soltar);
  el.grade.addEventListener("pointercancel", () => { estado.arrasto = null; limparSelecao(); });

  function avaliar(a, b) {
    limparSelecao();
    const lido = caminho(a, b).map(p => estado.letras[p.r][p.c]).join("");
    const invertido = [...lido].reverse().join("");
    const palavra = LISTA.find(p => !estado.achadas.has(p.texto) && (p.texto === lido || p.texto === invertido));

    if (palavra) {
      estado.achadas.add(palavra.texto);
      // Letra compartilhada por duas palavras fica com a cor da última achada.
      caminho(a, b).forEach(p => {
        const n = casa(p.r, p.c);
        n.classList.add("achada");
        n.style.setProperty("--cor", palavra.cor);
      });
      el.banco.querySelector(`[data-texto="${palavra.texto}"]`).classList.add("achada");
      desenharContagem();
      mudarPontos(REGRAS.pontosAcerto);
      if (estado.achadas.size === LISTA.length) vencer();
      else tocar(SONS.acerto);
    } else {
      const erradas = caminho(a, b).map(p => casa(p.r, p.c));
      erradas.forEach(n => n.classList.add("errada"));
      setTimeout(() => erradas.forEach(n => n.classList.remove("errada")), 650);
      mudarPontos(REGRAS.pontosErro);
      tocar(SONS.erro);
    }
  }

  // ---------- telas ----------

  function mostrarAviso(html, classe = "") {
    el.aviso.className = "aviso " + classe;
    el.aviso.innerHTML = `<div class="aviso-cartao" role="dialog" aria-modal="false">${html}</div>`;
    el.aviso.hidden = false;
  }

  function esconderAviso() {
    el.aviso.hidden = true;
    el.palco.classList.remove("esperando");
  }

  function prepararJogo() {
    pararRelogio();
    estado.jogando = false;
    estado.achadas = new Set();
    estado.arrasto = null;
    estado.ancora = null;
    estado.pontos = 0;
    el.pontos.textContent = "0";
    el.tempo.textContent = formatarTempo(REGRAS.tempo);
    gerarGrade();
    desenharGrade();
    desenharBanco();
  }

  function comecar() {
    esconderAviso();
    estado.jogando = true;
    estado.inicio = Date.now();
    atualizarRelogio();
    estado.relogio = setInterval(atualizarRelogio, 250);
  }

  function novoJogo() {
    prepararJogo();
    comecar();
  }

  function telaInicial() {
    prepararJogo();
    el.palco.classList.add("esperando");
    const recorde = lerRecorde();
    const linhaRecorde = recorde.tempo
      ? `<p class="detalhe">Seu melhor tempo: <b>${formatarTempo(recorde.tempo)}</b></p>`
      : recorde.pontos ? `<p class="detalhe">Seu recorde: <b>${recorde.pontos} pts</b></p>` : "";
    mostrarAviso(`
      <h2>Caça-Palavras</h2>
      <p>Encontre as <b>${LISTA.length} palavras</b> da REPAR escondidas na grade em até
      <b>${REGRAS.tempo / 60} minutos</b>.</p>
      <p class="detalhe">Arraste da primeira à última letra (ou toque nas duas). Vale na horizontal,
      na vertical, na diagonal e de trás para frente. Cada palavra: <b>+${REGRAS.pontosAcerto} pontos</b>.</p>
      ${linhaRecorde}
      <div class="aviso-acoes"><button type="button" class="botao verde" id="btn-comecar">Começar &gt;&gt;</button></div>`);
    document.getElementById("btn-comecar").addEventListener("click", comecar);
  }

  function vencer() {
    const tempo = segundosUsados();
    estado.jogando = false;
    pararRelogio();
    tocar(SONS.vitoria);

    const recorde = lerRecorde();
    const novoRecorde = !recorde.tempo || tempo < recorde.tempo;
    salvarRecorde({ tempo: novoRecorde ? tempo : recorde.tempo, pontos: Math.max(recorde.pontos || 0, estado.pontos) });

    setTimeout(() => {
      mostrarAviso(`
        <h2>Parabéns!</h2>
        <p class="rotulo">Sua pontuação:</p>
        <p class="numero">${estado.pontos}</p>
        <p class="detalhe">Todas as palavras em <b>${formatarTempo(tempo)}</b>
          ${novoRecorde && recorde.tempo ? ' · <span class="recorde">novo recorde!</span>' : ""}
          ${!novoRecorde ? ` · melhor tempo: ${formatarTempo(recorde.tempo)}` : ""}</p>
        <p>Tente superar seu tempo na próxima tentativa.</p>
        <div class="aviso-acoes"><button type="button" class="botao verde" id="btn-de-novo">Jogar novamente &gt;&gt;</button></div>`);
      document.getElementById("btn-de-novo").addEventListener("click", novoJogo);
    }, 700);
  }

  function perder() {
    if (!estado.jogando) return;
    estado.jogando = false;
    estado.arrasto = null;
    estado.ancora = null;
    limparSelecao();
    pararRelogio();
    el.tempo.textContent = "0:00";
    tocar(SONS.derrota);

    const recorde = lerRecorde();
    if (estado.pontos > (recorde.pontos || 0)) salvarRecorde({ ...recorde, pontos: estado.pontos });

    // Como no original (show_unfound = True): as palavras que faltaram aparecem em vermelho.
    const faltaram = LISTA.filter(p => !estado.achadas.has(p.texto));
    for (const p of faltaram) {
      const { r, c, dr, dc } = estado.posicoes[p.texto];
      const fim = { r: r + dr * (p.texto.length - 1), c: c + dc * (p.texto.length - 1) };
      marca({ r, c }, fim, "faltou", estado.camadas.marcas);
      el.banco.querySelector(`[data-texto="${p.texto}"]`).classList.add("faltou");
    }

    setTimeout(() => {
      mostrarAviso(`
        <h2>Você perdeu!</h2>
        <p class="rotulo">Sua pontuação:</p>
        <p class="numero">${estado.pontos}</p>
        <p class="detalhe">Você encontrou ${estado.achadas.size} de ${LISTA.length} palavras.
          As que faltaram estão marcadas em vermelho.</p>
        <p>Tente ser mais rápido na próxima tentativa.</p>
        <div class="aviso-acoes">
          <button type="button" class="botao claro" id="btn-ver">Ver a grade</button>
          <button type="button" class="botao verde" id="btn-de-novo">Jogar novamente &gt;&gt;</button>
        </div>`, "perdeu");
      document.getElementById("btn-ver").addEventListener("click", esconderAviso);
      document.getElementById("btn-de-novo").addEventListener("click", novoJogo);
    }, 1400);
  }

  // ---------- botões fixos ----------

  el.reiniciar.addEventListener("click", novoJogo);
  el.som.addEventListener("click", () => {
    somLigado = !somLigado;
    try { localStorage.setItem(CHAVE_SOM, somLigado ? "1" : "0"); } catch { /* sem storage */ }
    desenharBotaoSom();
  });
  document.addEventListener("keydown", ev => {
    if (ev.key === "Escape" && estado.ancora) { estado.ancora = null; limparSelecao(); }
  });

  // Girou o aparelho ou mudou o tamanho da janela antes de começar: refaz a grade no formato certo.
  let esperaResize = null;
  window.addEventListener("resize", () => {
    clearTimeout(esperaResize);
    esperaResize = setTimeout(() => {
      const [colunas, linhas] = dimensoes();
      const mudou = colunas !== estado.colunas || linhas !== estado.linhas;
      if (mudou && el.palco.classList.contains("esperando")) telaInicial();
    }, 200);
  });

  desenharBotaoSom();
  telaInicial();
})();
