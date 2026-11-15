// AnchorIQ page renderer. Written for this site; replaces the design tool's generated runtime.
// Renders <template id="page-template"> with the page's component (assets/pages/<page>.js, which sets
// window.AIQ_PAGE) using React 18.3.1 (MIT, assets/vendor). Template syntax:
//   {{a.b}}                       value from the component's renderVals() or the current list item
//   attr="{{v}}" / ref="{{fn}}"   a whole-attribute binding passes the value itself (refs, booleans, numbers)
//   data-on-click="{{fn}}"       event handler (onClick)
//   <sc-for list="{{xs}}" as="x"> repeats its content for each item of xs
//   <sc-if value="{{ok}}">        renders its content when ok is truthy
(function () {
  'use strict';
  var R = window.React, h = R.createElement, BIND = /\{\{\s*([^}]+?)\s*\}\}/g;

  // Handlers are written data-on-<event>="{{fn}}" (a plain on<event> attribute, even inside an inert <template>, is
  // reported by the browser as a CSP violation). The HTML parser lowercases names; React needs its own prop names.
  var EVENTS = {};
  ['Click', 'Change', 'Input', 'Submit', 'Focus', 'Blur', 'KeyDown', 'KeyUp', 'MouseMove', 'MouseEnter', 'MouseLeave',
    'MouseDown', 'MouseUp', 'PointerMove', 'PointerEnter', 'PointerLeave', 'PointerDown', 'PointerUp', 'TouchStart',
    'TouchMove', 'TouchEnd', 'Scroll', 'Wheel', 'Toggle', 'Load', 'Error'].forEach(function (e) { EVENTS['data-on-' + e.toLowerCase()] = 'on' + e; });
  var RENAME = { 'class': 'className', 'for': 'htmlFor', tabindex: 'tabIndex', readonly: 'readOnly', maxlength: 'maxLength',
    minlength: 'minLength', novalidate: 'noValidate', autocomplete: 'autoComplete', autofocus: 'autoFocus', autoplay: 'autoPlay',
    playsinline: 'playsInline', crossorigin: 'crossOrigin', srcset: 'srcSet', colspan: 'colSpan', rowspan: 'rowSpan',
    enctype: 'encType', inputmode: 'inputMode', spellcheck: 'spellCheck', allowfullscreen: 'allowFullScreen',
    datetime: 'dateTime', contenteditable: 'contentEditable', fetchpriority: 'fetchPriority' };
  // present-but-empty boolean attributes (controls="" etc.) must stay on; React treats "" as false
  var BOOL = { noValidate: 1, readOnly: 1, autoFocus: 1, autoPlay: 1, playsInline: 1, allowFullScreen: 1, controls: 1, loop: 1,
    muted: 1, required: 1, disabled: 1, hidden: 1, open: 1, multiple: 1, checked: 1, selected: 1, defer: 1, async: 1, reversed: 1 };

  // "a: b; --c: d" -> { a: 'b', '--c': 'd' }; splits on ; outside quotes and brackets
  function css(text) {
    var out = {}, decls = [], depth = 0, quote = '', start = 0, i, ch;
    for (i = 0; i < text.length; i++) {
      ch = text[i];
      if (quote) { if (ch === quote) quote = ''; } else if (ch === '"' || ch === "'") quote = ch;
      else if (ch === '(') depth++; else if (ch === ')') depth--;
      else if (ch === ';' && !depth) { decls.push(text.slice(start, i)); start = i + 1; }
    }
    decls.push(text.slice(start));
    decls.forEach(function (d) {
      var k = d.indexOf(':'); if (k < 0) return;
      var name = d.slice(0, k).trim(), value = d.slice(k + 1).trim(); if (!name || !value) return;
      if (name.slice(0, 2) !== '--') name = name.toLowerCase().replace(/^-ms-/, 'ms-').replace(/-([a-z])/g, function (m, c) { return c.toUpperCase(); });
      out[name] = value;
    });
    return out;
  }

  // "text {{x}} text" -> null (no binding) | { path } (the whole value) | [parts] (interpolate)
  function compileValue(s) {
    if (s.indexOf('{{') < 0) return null;
    var parts = [], last = 0, m; BIND.lastIndex = 0;
    while ((m = BIND.exec(s))) { if (m.index > last) parts.push(s.slice(last, m.index)); parts.push({ path: m[1] }); last = BIND.lastIndex; }
    if (last < s.length) parts.push(s.slice(last));
    return parts.length === 1 && typeof parts[0] === 'object' ? parts[0] : parts;
  }
  function lookup(scope, path) {
    if (path === 'true') return true; if (path === 'false') return false;
    var keys = path.split('.'), v = scope[keys[0]];
    for (var i = 1; i < keys.length && v != null; i++) v = v[keys[i]];
    return v;
  }
  function evaluate(c, scope) {
    if (!Array.isArray(c)) return lookup(scope, c.path);
    return c.map(function (p) { if (typeof p === 'string') return p; var v = lookup(scope, p.path); return v == null ? '' : String(v); }).join('');
  }

  function compile(nodes) {
    var out = [];
    Array.prototype.forEach.call(nodes, function (n) {
      if (n.nodeType === 3) { out.push({ text: n.data, bind: compileValue(n.data) }); return; }
      if (n.nodeType !== 1) return;
      var tag = n.localName; // SVG names keep their case (linearGradient, animateMotion)
      if (tag === 'script') return;
      var node = { tag: tag, attrs: [], kids: tag === 'textarea' ? [] : compile((tag === 'template' ? n.content : n).childNodes) };
      if (tag === 'style') { node.raw = n.textContent; node.kids = []; }
      Array.prototype.forEach.call(n.attributes, function (a) {
        if (a.name.slice(0, 5) === 'hint-') return;
        var name = EVENTS[a.name] || RENAME[a.name] || a.name, bind = compileValue(a.value);
        if (/^on[A-Z]/.test(name) && typeof (bind && bind.path) !== 'string') return; // handlers must be a whole {{binding}}
        node.attrs.push({ name: name, value: a.value, bind: bind });
      });
      out.push(node);
    });
    return out;
  }

  function render(nodes, scope) {
    var out = [];
    nodes.forEach(function (n, i) {
      if (n.text !== undefined) { out.push(n.bind ? evaluate(n.bind, scope) : n.text); return; }
      var attr = function (name) { for (var j = 0; j < n.attrs.length; j++) if (n.attrs[j].name === name) return n.attrs[j]; };
      if (n.tag === 'sc-for') {
        var list = lookup(scope, attr('list').bind.path) || [], as = attr('as').value;
        out.push(h(R.Fragment, { key: i }, Array.prototype.map.call(list, function (item, k) {
          var s = Object.create(scope); s[as] = item; return h(R.Fragment, { key: k }, render(n.kids, s));
        })));
        return;
      }
      if (n.tag === 'sc-if') { if (evaluate(attr('value').bind, scope)) out.push(h(R.Fragment, { key: i }, render(n.kids, scope))); return; }
      var props = { key: i };
      n.attrs.forEach(function (a) {
        var v = a.bind ? evaluate(a.bind, scope) : a.value;
        if (v === undefined || v === null) return;
        if (a.name === 'style') v = typeof v === 'string' ? css(v) : v;
        else if (BOOL[a.name] && v === '') v = true;
        props[a.name] = v;
      });
      if (n.raw !== undefined) props.dangerouslySetInnerHTML = { __html: n.raw };
      out.push(h(n.tag, props, n.kids.length ? render(n.kids, scope) : undefined));
    });
    return out;
  }

  function start() {
    var tpl = document.getElementById('page-template');
    if (!tpl || typeof window.AIQ_PAGE !== 'function') { console.error('page: template or component missing'); return; }
    var tree = compile(tpl.content.childNodes);
    var Logic = window.AIQ_PAGE(R.Component);
    var Page = class extends Logic { render() { return render(tree, this.renderVals()); } };
    var root = document.createElement('div'); root.id = 'dc-root'; tpl.parentNode.insertBefore(root, tpl);
    window.ReactDOM.createRoot(root).render(h(Page));
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
