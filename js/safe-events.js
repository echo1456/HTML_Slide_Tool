/* ==================== ZERO-EVAL STRICT-CSP DECLARATIVE EVENT ENGINE (v5.0.0) ==================== */
const DECLARATIVE_EVENT_TYPES = ['click', 'input', 'change', 'mousedown', 'keydown', 'blur', 'dragstart', 'dragover', 'dragleave', 'drop'];
const __safeExprAstCache = new Map();
const __SAFE_BLOCKED_PROPS = new Set(['__proto__', 'prototype', 'constructor', '__defineGetter__', '__defineSetter__', '__lookupGetter__', '__lookupSetter__']);
const __SAFE_BLOCKED_CALLS = new Set(['eval', 'Function', 'setTimeout', 'setInterval']);
const __SAFE_BUILTINS = {
  Number, String, Boolean, Date, Math, Array, Object, parseInt, parseFloat, isNaN
};

function tokenizeSafeExpr(src) {
  const tokens = [];
  let i = 0;
  const n = src.length;
  const multiOps = ['===', '!==', '==', '!=', '<=', '>=', '&&', '||', '??', '?.'];
  while (i < n) {
    const ch = src[i];
    if (/\s/.test(ch)) { i++; continue; }
    if (ch === "'" || ch === '"') {
      const q = ch;
      let val = '';
      i++;
      while (i < n && src[i] !== q) {
        if (src[i] === '\\' && i + 1 < n) {
          const esc = src[i + 1];
          val += esc === 'n' ? '\n' : (esc === 't' ? '\t' : (esc === 'r' ? '\r' : esc));
          i += 2;
        } else {
          val += src[i++];
        }
      }
      if (i < n && src[i] === q) i++;
      tokens.push({ t: 'str', v: val });
      continue;
    }
    if (/[0-9]/.test(ch) || (ch === '.' && i + 1 < n && /[0-9]/.test(src[i + 1]))) {
      let numStr = '';
      while (i < n && /[0-9.]/.test(src[i])) numStr += src[i++];
      tokens.push({ t: 'num', v: Number(numStr) });
      continue;
    }
    let matchedOp = null;
    for (let k = 0; k < multiOps.length; k++) {
      if (src.startsWith(multiOps[k], i)) { matchedOp = multiOps[k]; break; }
    }
    if (matchedOp) {
      tokens.push({ t: 'op', v: matchedOp });
      i += matchedOp.length;
      continue;
    }
    if ('(){}[],.;:?!+-*/=<>'.includes(ch)) {
      tokens.push({ t: 'op', v: ch });
      i++;
      continue;
    }
    if (/[a-zA-Z_$]/.test(ch)) {
      let id = '';
      while (i < n && /[a-zA-Z0-9_$]/.test(src[i])) id += src[i++];
      tokens.push({ t: 'id', v: id });
      continue;
    }
    throw new SyntaxError(`Unexpected token '${ch}' at ${i}`);
  }
  tokens.push({ t: 'eof', v: '' });
  return tokens;
}

function parseSafeProgram(tokens) {
  let pos = 0;
  const peek = () => tokens[pos] || { t: 'eof', v: '' };
  const next = () => tokens[pos++];
  const matchOp = (v) => { if (peek().t === 'op' && peek().v === v) { pos++; return true; } return false; };
  const matchId = (v) => { if (peek().t === 'id' && peek().v === v) { pos++; return true; } return false; };
  const expectOp = (v) => {
    const tk = next();
    if (!tk || tk.t !== 'op' || tk.v !== v) throw new SyntaxError(`Expected '${v}', got '${tk ? tk.v : 'EOF'}'`);
  };

  function parseStmt() {
    while (matchOp(';')) {}
    const tk = peek();
    if (tk.t === 'eof' || (tk.t === 'op' && tk.v === '}')) return null;
    if (matchOp('{')) {
      const body = [];
      while (peek().t !== 'eof' && !(peek().t === 'op' && peek().v === '}')) {
        const s = parseStmt();
        if (s) body.push(s);
      }
      expectOp('}');
      return { k: 'block', body };
    }
    if (matchId('if')) {
      expectOp('(');
      const test = parseExpr();
      expectOp(')');
      const cons = parseStmt();
      let alt = null;
      if (matchId('else')) alt = parseStmt();
      return { k: 'if', test, cons, alt };
    }
    if (tk.t === 'id' && (tk.v === 'const' || tk.v === 'let' || tk.v === 'var')) {
      next();
      const decls = [];
      do {
        const idTk = next();
        if (!idTk || idTk.t !== 'id') throw new SyntaxError('Expected variable identifier');
        let init = null;
        if (matchOp('=')) init = parseExpr();
        decls.push({ name: idTk.v, init });
      } while (matchOp(','));
      matchOp(';');
      return { k: 'var', decls };
    }
    const expr = parseExpr();
    matchOp(';');
    return { k: 'expr', expr };
  }

  function parseExpr() { return parseAssign(); }

  function parseAssign() {
    const left = parseTernary();
    if (matchOp('=')) {
      const right = parseAssign();
      return { k: 'assign', left, right };
    }
    return left;
  }

  function parseTernary() {
    const cond = parseOr();
    if (matchOp('?')) {
      const cons = parseAssign();
      expectOp(':');
      const alt = parseAssign();
      return { k: 'ternary', cond, cons, alt };
    }
    return cond;
  }

  function parseOr() {
    let left = parseAnd();
    while (peek().t === 'op' && (peek().v === '||' || peek().v === '??')) {
      const op = next().v;
      left = { k: 'logic', op, left, right: parseAnd() };
    }
    return left;
  }

  function parseAnd() {
    let left = parseEq();
    while (peek().t === 'op' && peek().v === '&&') {
      const op = next().v;
      left = { k: 'logic', op, left, right: parseEq() };
    }
    return left;
  }

  function parseEq() {
    let left = parseRel();
    while (peek().t === 'op' && ['===', '!==', '==', '!='].includes(peek().v)) {
      const op = next().v;
      left = { k: 'bin', op, left, right: parseRel() };
    }
    return left;
  }

  function parseRel() {
    let left = parseAdd();
    while (peek().t === 'op' && ['<', '>', '<=', '>='].includes(peek().v)) {
      const op = next().v;
      left = { k: 'bin', op, left, right: parseAdd() };
    }
    return left;
  }

  function parseAdd() {
    let left = parseMul();
    while (peek().t === 'op' && (peek().v === '+' || peek().v === '-')) {
      const op = next().v;
      left = { k: 'bin', op, left, right: parseMul() };
    }
    return left;
  }

  function parseMul() {
    let left = parseUnary();
    while (peek().t === 'op' && (peek().v === '*' || peek().v === '/')) {
      const op = next().v;
      left = { k: 'bin', op, left, right: parseUnary() };
    }
    return left;
  }

  function parseUnary() {
    if (peek().t === 'op' && (peek().v === '!' || peek().v === '-' || peek().v === '+')) {
      const op = next().v;
      return { k: 'unary', op, arg: parseUnary() };
    }
    if (matchId('typeof')) {
      return { k: 'typeof', arg: parseUnary() };
    }
    return parsePostfix();
  }

  function parsePostfix() {
    let node = parsePrimary();
    while (true) {
      if (matchOp('.') || matchOp('?.')) {
        const optional = tokens[pos - 1].v === '?.';
        const propTk = next();
        if (!propTk || propTk.t !== 'id') throw new SyntaxError('Expected property name');
        node = { k: 'member', obj: node, prop: propTk.v, computed: false, optional };
      } else if (matchOp('[')) {
        const idx = parseExpr();
        expectOp(']');
        node = { k: 'member', obj: node, prop: idx, computed: true, optional: false };
      } else if (matchOp('(')) {
        const args = [];
        if (!(peek().t === 'op' && peek().v === ')')) {
          do { args.push(parseExpr()); } while (matchOp(','));
        }
        expectOp(')');
        node = { k: 'call', callee: node, args };
      } else {
        break;
      }
    }
    return node;
  }

  function parsePrimary() {
    const tk = next();
    if (!tk || tk.t === 'eof') throw new SyntaxError('Unexpected end of expression');
    if (tk.t === 'num' || tk.t === 'str') return { k: 'lit', v: tk.v };
    if (tk.t === 'id') {
      if (tk.v === 'true') return { k: 'lit', v: true };
      if (tk.v === 'false') return { k: 'lit', v: false };
      if (tk.v === 'null') return { k: 'lit', v: null };
      if (tk.v === 'undefined') return { k: 'lit', v: undefined };
      if (tk.v === 'this') return { k: 'this' };
      if (tk.v === 'event') return { k: 'event' };
      return { k: 'id', name: tk.v };
    }
    if (tk.t === 'op' && tk.v === '(') {
      const inner = parseExpr();
      expectOp(')');
      return inner;
    }
    throw new SyntaxError(`Unexpected token '${tk.v}'`);
  }

  const stmts = [];
  while (peek().t !== 'eof') {
    const s = parseStmt();
    if (s) stmts.push(s);
  }
  return stmts;
}

function resolveSafeLexicalIdentifier(name, env) {
  if (Object.prototype.hasOwnProperty.call(env.locals, name)) return env.locals[name];
  if (name === 'window') return env.ctx;
  if (name === 'document') return (env.el && env.el.ownerDocument) || env.ctx.document || document;
  if (Object.prototype.hasOwnProperty.call(__SAFE_BUILTINS, name)) return __SAFE_BUILTINS[name];
  // Live lexical global bridge (classic script top-level let/const state variables)
  if (name === 'slides') return typeof slides !== 'undefined' ? slides : [];
  if (name === 'currentSlide') return typeof currentSlide !== 'undefined' ? currentSlide : 1;
  if (name === 'totalSlides') return typeof totalSlides !== 'undefined' ? totalSlides : 0;
  if (name === 'selectedElement') return typeof selectedElement !== 'undefined' ? selectedElement : null;
  if (name === 'selectedElements') return typeof selectedElements !== 'undefined' ? selectedElements : [];
  if (name === 'isEditMode') return typeof isEditMode !== 'undefined' ? isEditMode : false;
  if (name === 'isInteractiveTestMode') return typeof isInteractiveTestMode !== 'undefined' ? isInteractiveTestMode : false;
  if (name === 'activeScreenBlackoutMode') return typeof activeScreenBlackoutMode !== 'undefined' ? activeScreenBlackoutMode : null;
  if (name === 'activeEditingContext') return typeof activeEditingContext !== 'undefined' ? activeEditingContext : 'slide';
  if (__SAFE_BLOCKED_CALLS.has(name) || __SAFE_BLOCKED_PROPS.has(name)) return undefined;
  return env.ctx ? env.ctx[name] : undefined;
}

function evalSafeNode(node, env) {
  if (!node) return undefined;
  switch (node.k) {
    case 'block': {
      let res;
      for (let i = 0; i < node.body.length; i++) res = evalSafeNode(node.body[i], env);
      return res;
    }
    case 'if':
      return evalSafeNode(node.test, env) ? evalSafeNode(node.cons, env) : (node.alt ? evalSafeNode(node.alt, env) : undefined);
    case 'var':
      for (let i = 0; i < node.decls.length; i++) {
        const d = node.decls[i];
        env.locals[d.name] = d.init ? evalSafeNode(d.init, env) : undefined;
      }
      return undefined;
    case 'expr':
      return evalSafeNode(node.expr, env);
    case 'lit':
      return node.v;
    case 'this':
      return env.el;
    case 'event':
      return env.event;
    case 'id':
      return resolveSafeLexicalIdentifier(node.name, env);
    case 'typeof': {
      try { return typeof evalSafeNode(node.arg, env); } catch (e) { return 'undefined'; }
    }
    case 'unary': {
      const v = evalSafeNode(node.arg, env);
      if (node.op === '!') return !v;
      if (node.op === '-') return -v;
      if (node.op === '+') return +v;
      return v;
    }
    case 'logic': {
      const lv = evalSafeNode(node.left, env);
      if (node.op === '&&') return lv ? evalSafeNode(node.right, env) : lv;
      if (node.op === '||') return lv ? lv : evalSafeNode(node.right, env);
      if (node.op === '??') return (lv !== null && lv !== undefined) ? lv : evalSafeNode(node.right, env);
      return lv;
    }
    case 'ternary':
      return evalSafeNode(node.cond, env) ? evalSafeNode(node.cons, env) : evalSafeNode(node.alt, env);
    case 'bin': {
      const l = evalSafeNode(node.left, env), r = evalSafeNode(node.right, env);
      switch (node.op) {
        case '===': return l === r;
        case '!==': return l !== r;
        case '==': return l == r;
        case '!=': return l != r;
        case '<': return l < r;
        case '>': return l > r;
        case '<=': return l <= r;
        case '>=': return l >= r;
        case '+': return l + r;
        case '-': return l - r;
        case '*': return l * r;
        case '/': return l / r;
      }
      return undefined;
    }
    case 'member': {
      const obj = evalSafeNode(node.obj, env);
      if (obj === null || obj === undefined) {
        if (node.optional) return undefined;
        throw new TypeError(`Cannot read properties of ${obj}`);
      }
      const key = node.computed ? evalSafeNode(node.prop, env) : node.prop;
      if (__SAFE_BLOCKED_PROPS.has(String(key))) return undefined;
      return obj[key];
    }
    case 'assign': {
      const val = evalSafeNode(node.right, env);
      if (node.left.k === 'member') {
        const obj = evalSafeNode(node.left.obj, env);
        const key = node.left.computed ? evalSafeNode(node.left.prop, env) : node.left.prop;
        if (obj && !__SAFE_BLOCKED_PROPS.has(String(key))) obj[key] = val;
      } else if (node.left.k === 'id' && Object.prototype.hasOwnProperty.call(env.locals, node.left.name)) {
        env.locals[node.left.name] = val;
      }
      return val;
    }
    case 'call': {
      const args = node.args.map(a => evalSafeNode(a, env));
      if (node.callee.k === 'member') {
        const parent = evalSafeNode(node.callee.obj, env);
        if (parent === null || parent === undefined) {
          if (node.callee.optional) return undefined;
          throw new TypeError(`Cannot invoke method on ${parent}`);
        }
        const key = node.callee.computed ? evalSafeNode(node.callee.prop, env) : node.callee.prop;
        if (__SAFE_BLOCKED_PROPS.has(String(key)) || __SAFE_BLOCKED_CALLS.has(String(key))) return undefined;
        const fn = parent[key];
        if (typeof fn !== 'function') throw new TypeError(`${String(key)} is not a function`);
        return fn.apply(parent, args);
      }
      if (node.callee.k === 'id' && __SAFE_BLOCKED_CALLS.has(node.callee.name)) return undefined;
      const fn = evalSafeNode(node.callee, env);
      if (typeof fn !== 'function') throw new TypeError(`${node.callee.name || 'callee'} is not a function`);
      return fn.apply(env.ctx, args);
    }
  }
  return undefined;
}

function evaluateSafeDeclarativeCode(code, el, event, ctx) {
  let ast = __safeExprAstCache.get(code);
  if (!ast) {
    ast = parseSafeProgram(tokenizeSafeExpr(code));
    __safeExprAstCache.set(code, ast);
  }
  const env = { el, event, ctx: ctx || window, locals: Object.create(null) };
  for (let i = 0; i < ast.length; i++) {
    evalSafeNode(ast[i], env);
  }
}

function upgradeInlineOnAttributesToData(rootNode) {
  if (!rootNode || !rootNode.querySelectorAll) return;
  const targets = rootNode.nodeType === 1 ? [rootNode, ...Array.from(rootNode.querySelectorAll('*'))] : Array.from(rootNode.querySelectorAll('*'));
  targets.forEach(el => {
    if (!el.attributes) return;
    Array.from(el.attributes).forEach(attr => {
      const lname = attr.name.toLowerCase();
      if (lname.startsWith('on') && lname.length > 2) {
        const evtType = lname.slice(2);
        if (DECLARATIVE_EVENT_TYPES.includes(evtType)) {
          el.setAttribute(`data-on-${evtType}`, attr.value);
          el.removeAttribute(attr.name);
        }
      }
    });
    if (el.tagName === 'BUTTON') {
      const existingAria = (el.getAttribute('aria-label') || '').trim();
      const existingTitle = (el.getAttribute('title') || '').trim();
      const txt = (el.textContent || '').replace(/\s+/g, ' ').trim();
      const label = existingAria || existingTitle || txt || '작업 버튼';
      if (!existingAria) el.setAttribute('aria-label', label);
      if (!existingTitle) el.setAttribute('title', label);
    } else if (el.tagName === 'A' && el.getAttribute('target') === '_blank') {
      el.setAttribute('rel', 'noopener noreferrer');
    }
  });
}

function initDeclarativeEventSystem(targetDoc, contextWin) {
  const doc = targetDoc || document;
  const ctx = contextWin || window;
  if (doc.__pptDeclarativeEventsBound) return;
  doc.__pptDeclarativeEventsBound = true;

  upgradeInlineOnAttributesToData(doc.documentElement || doc);

  DECLARATIVE_EVENT_TYPES.forEach(evtType => {
    const useCapture = (evtType === 'blur');
    doc.addEventListener(evtType, (e) => {
      let cur = e.target && e.target.nodeType === 3 ? e.target.parentElement : e.target;
      let stopped = false;
      let stopWrapped = false;
      while (cur && cur.nodeType === 1) {
        const code = cur.getAttribute(`data-on-${evtType}`);
        if (code) {
          if (!stopWrapped) {
            stopWrapped = true;
            const origStop = e.stopPropagation.bind(e);
            e.stopPropagation = () => { stopped = true; origStop(); };
          }
          try {
            evaluateSafeDeclarativeCode(code, cur, e, ctx);
          } catch (err) {
            console.error(`[HTML Slide Tool] Safe event handler error (${evtType}):`, err, code);
          }
          if (stopped || e.cancelBubble) break;
        }
        if (evtType === 'blur') break;
        cur = cur.parentElement;
      }
    }, useCapture);
  });

  if (typeof MutationObserver === 'function' && doc.documentElement) {
    const obs = new MutationObserver((mutations) => {
      mutations.forEach(m => {
        m.addedNodes.forEach(node => {
          if (node.nodeType === 1) upgradeInlineOnAttributesToData(node);
        });
      });
    });
    obs.observe(doc.documentElement, { childList: true, subtree: true });
    doc.__pptSafeEventObserver = obs;
    const ownerWin = doc.defaultView;
    if (ownerWin && ownerWin !== window) {
      ownerWin.addEventListener('pagehide', () => {
        try { obs.disconnect(); } catch (e) {}
      }, { once: true });
    }
  }
}

initDeclarativeEventSystem(document, window);
