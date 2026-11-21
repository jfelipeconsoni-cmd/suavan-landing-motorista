/* Sua Van — consentimento de análise de uso (Microsoft Clarity).
 *
 * POR QUE ESTE ARQUIVO EXISTE
 * ---------------------------
 * Até 03/08/2026 o script do Clarity ficava direto no <head> dos três sites e
 * começava a gravar a sessão no primeiro milissegundo, sem perguntar nada — em
 * `pais.` isso incluía um formulário com nome, WhatsApp e A ESCOLA DO FILHO,
 * dado que identifica um menor indiretamente.
 *
 * Análise de uso e replay de sessão são finalidade NÃO-ESSENCIAL. Sob a LGPD
 * isso pede **opt-in**: nada é carregado antes do aceite. Recusar não é
 * "desligar depois" — o script simplesmente nunca entra na página.
 *
 * É a mesma lógica que, corretamente, manteve o Clarity FORA do
 * `cadastro.suavan.com.br` desde o início. Ela só não tinha voltado para cá.
 *
 * ⚠️ THIS FILE IS DUPLICATED nos 3 repos (suavan-site, suavan-pais,
 * suavan-motorista), porque cada um é um GitHub Pages próprio, num subdomínio
 * próprio. Servir de um só criaria dependência cross-origin justamente na peça
 * de privacidade. **Ao alterar, alterar nos três.**
 *
 * 16/09/2026: fila de eventos antes do aceite (ver queueStub) e sinal
 * clarity('consent') depois dele. O aceite fica guardado POR SUBDOMÍNIO
 * (localStorage é por origem): quem aceita em suavan.com.br vê o aviso de novo
 * em motorista. e pais. — é o preço de três origens, não um defeito.
 *
 * 21/11/2026: duas coisas, sem mexer no portão. (1) O visual do aviso pode vir
 * da página: com data-banner-style="page" no <script> que carrega este arquivo,
 * o aviso sai sem o estilo embutido e com as classes consent-banner-*, que o
 * CSS da página desenha (a landing nova do motorista). Sem o atributo, o aviso
 * é o de sempre. (2) Em localhost, aceitar não carrega a tag: as chamadas vão
 * para o console do navegador, e o teste local não vira sessão no painel.
 */
(function () {
  'use strict';

  var CLARITY_PROJECT = 'xm3hw0zsli';
  var STORAGE_KEY = 'suavan_consent_analytics'; // 'accepted' | 'declined'
  // Relativa de propósito: cada subdomínio tem a SUA Política (17/09/2026), e o
  // aviso deve levar à que descreve o Clarity daquela página.
  var POLICY_URL = '/privacidade/';

  /* O visual do aviso (21/11/2026): o atributo vem do <script> que carrega este
     arquivo, e o document.currentScript só existe enquanto ele executa. */
  var currentScript = document.currentScript;
  var PAGE_STYLED = !!currentScript && currentScript.getAttribute('data-banner-style') === 'page';

  /* Teste local (21/11/2026): em localhost a tag não carrega (ver loadClarity). */
  var IS_LOCAL = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(window.location.hostname);

  /* FILA ANTES DO ACEITE (16/09/2026). As páginas chamam window.clarity('event', …)
     e window.clarity('set', …) nos cliques (cta_motorista, acesso_whatsapp_enviar…).
     Sem isto, tudo que acontecia ANTES de "Aceitar" — inclusive o clique que
     motivou o aceite — se perdia, porque window.clarity só existia depois do
     script carregar. O stub abaixo é o mesmo enfileirador do snippet oficial:
     guarda as chamadas em memória e NÃO envia nada a lugar nenhum. Ao aceitar,
     a tag do Clarity consome a fila; ao recusar, a fila é descartada e o stub
     vira no-op. Assim o opt-in continua sendo o portão: sem aceite, zero rede. */
  function queueStub() { (queueStub.q = queueStub.q || []).push(arguments); }
  if (typeof window.clarity !== 'function') { window.clarity = queueStub; window.clarity.q = queueStub.q = []; }

  /* Leitura/escrita tolerantes: navegação privativa e bloqueio de cookies
     fazem localStorage lançar. Falhar aqui não pode quebrar a página — e, na
     dúvida, o padrão é NÃO rastrear. */
  function readChoice() {
    try {
      return window.localStorage.getItem(STORAGE_KEY);
    } catch (e) {
      return null;
    }
  }

  function saveChoice(value) {
    try {
      window.localStorage.setItem(STORAGE_KEY, value);
    } catch (e) {
      /* Sem persistência, a escolha vale só para esta visita. Melhor isso do
         que quebrar, e melhor perguntar de novo do que assumir consentimento. */
    }
  }

  /* Snippet oficial do Clarity, inalterado — só passou a rodar sob demanda. */
  function loadClarity() {
    if (IS_LOCAL) { logLocally(); return; }
    (function (c, l, a, r, i, t, y) {
      c[a] = c[a] || function () { (c[a].q = c[a].q || []).push(arguments); };
      t = l.createElement(r); t.async = 1;
      t.src = 'https://www.clarity.ms/tag/' + i;
      y = l.getElementsByTagName(r)[0];
      y.parentNode.insertBefore(t, y);
    })(window, document, 'clarity', 'script', CLARITY_PROJECT);
    /* API de consentimento do Clarity: registra que o visitante aceitou. É
       redundante com o portão acima (o script nem carregava antes), mas deixa
       o consentimento visível no painel e cobre o caso de o projeto ganhar a
       opção "exigir consentimento de cookies". */
    window.clarity('consent');
  }

  /* Em localhost: nada vai para a Microsoft. A fila e as chamadas seguintes
     aparecem no console do navegador, para conferir os eventos da página. */
  function logLocally() {
    var queued = window.clarity.q || [];
    window.clarity = function () {
      console.info('[Clarity em teste local, nada é enviado]', Array.prototype.slice.call(arguments).join(' '));
    };
    queued.forEach(function (args) { window.clarity.apply(null, args); });
    window.clarity('consent');
  }

  /* Recusou: a fila em memória é descartada e as páginas passam a falar com
     um no-op — nunca com a rede. */
  function dropQueue() {
    window.clarity = function () {};
  }

  function removeBanner(el) {
    if (el && el.parentNode) el.parentNode.removeChild(el);
  }

  /* O estilo embutido só entra quando a página não desenha o aviso (PAGE_STYLED). */
  function setStyle(el, rules) {
    if (!PAGE_STYLED) el.style.cssText = rules.join(';');
  }

  function showBanner() {
    var wrap = document.createElement('div');
    wrap.className = 'consent-banner';
    wrap.setAttribute('role', 'dialog');
    wrap.setAttribute('aria-live', 'polite');
    wrap.setAttribute('aria-label', 'Aviso sobre análise de uso');
    setStyle(wrap, [
      'position:fixed', 'left:0', 'right:0', 'bottom:0', 'z-index:9999',
      'background:#111827', 'color:#E5E7EB',
      'font-family:Inter,-apple-system,BlinkMacSystemFont,sans-serif',
      'font-size:14px', 'line-height:1.6',
      'padding:16px 20px', 'box-shadow:0 -2px 16px rgba(0,0,0,.25)'
    ]);

    var inner = document.createElement('div');
    inner.className = 'consent-banner-inner';
    setStyle(inner, [
      'max-width:960px', 'margin:0 auto', 'display:flex',
      'gap:16px', 'align-items:center', 'flex-wrap:wrap',
      'justify-content:space-between'
    ]);

    var text = document.createElement('div');
    text.className = 'consent-banner-text';
    setStyle(text, ['flex:1 1 320px', 'min-width:260px']);
    text.innerHTML =
      'Usamos uma ferramenta de análise para entender como o site é usado e ' +
      'melhorá-lo. <strong>Ela só é ativada se você aceitar.</strong> ' +
      '<a class="consent-banner-link" href="' + POLICY_URL + '" target="_blank" rel="noopener"' +
      (PAGE_STYLED ? '' : ' style="color:#FACC15;text-decoration:underline"') + '>' +
      'Política de Privacidade</a>';

    var actions = document.createElement('div');
    actions.className = 'consent-banner-actions';
    setStyle(actions, ['display:flex', 'gap:10px', 'flex-shrink:0']);

    function makeButton(label, primary) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'consent-banner-button ' + (primary ? 'consent-banner-accept' : 'consent-banner-decline');
      b.textContent = label;
      setStyle(b, [
        'font-family:inherit', 'font-size:14px', 'font-weight:600',
        'padding:10px 18px', 'border-radius:8px', 'cursor:pointer',
        'border:' + (primary ? 'none' : '1px solid #4B5563'),
        'background:' + (primary ? '#FFC500' : 'transparent'),
        'color:' + (primary ? '#111827' : '#E5E7EB')
      ]);
      return b;
    }

    /* "Recusar" vem primeiro na ordem do DOM de propósito: a opção que
       preserva a privacidade não deve ser a mais escondida nem a mais difícil
       de alcançar por teclado. */
    var no = makeButton('Recusar', false);
    var yes = makeButton('Aceitar', true);

    no.addEventListener('click', function () {
      saveChoice('declined');
      removeBanner(wrap);
      /* Nada a desligar: o Clarity nunca foi carregado. A fila morre aqui. */
      dropQueue();
    });

    yes.addEventListener('click', function () {
      saveChoice('accepted');
      removeBanner(wrap);
      loadClarity();
    });

    actions.appendChild(no);
    actions.appendChild(yes);
    inner.appendChild(text);
    inner.appendChild(actions);
    wrap.appendChild(inner);

    function attach() { document.body.appendChild(wrap); }
    if (document.body) attach();
    else document.addEventListener('DOMContentLoaded', attach);
  }

  var choice = readChoice();
  if (choice === 'accepted') {
    loadClarity();
  } else if (choice === 'declined') {
    dropQueue();
  } else {
    /* Sem escolha registrada: pergunta. Enquanto não houver aceite, nada é
       carregado — o estado inicial é "não rastrear". */
    showBanner();
  }
})();
