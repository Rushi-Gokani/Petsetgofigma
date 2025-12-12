function src_default$1(Alpine2) {
  let persist = () => {
    let alias;
    let storage;
    try {
      storage = localStorage;
    } catch (e) {
      console.error(e);
      console.warn("Alpine: $persist is using temporary storage since localStorage is unavailable.");
      let dummy = /* @__PURE__ */ new Map();
      storage = {
        getItem: dummy.get.bind(dummy),
        setItem: dummy.set.bind(dummy)
      };
    }
    return Alpine2.interceptor((initialValue, getter, setter, path, key) => {
      let lookup = alias || `_x_${path}`;
      let initial = storageHas(lookup, storage) ? storageGet(lookup, storage) : initialValue;
      setter(initial);
      Alpine2.effect(() => {
        let value = getter();
        storageSet(lookup, value, storage);
        setter(value);
      });
      return initial;
    }, (func) => {
      func.as = (key) => {
        alias = key;
        return func;
      }, func.using = (target) => {
        storage = target;
        return func;
      };
    });
  };
  Object.defineProperty(Alpine2, "$persist", { get: () => persist() });
  Alpine2.magic("persist", persist);
  Alpine2.persist = (key, { get, set }, storage = localStorage) => {
    let initial = storageHas(key, storage) ? storageGet(key, storage) : get();
    set(initial);
    Alpine2.effect(() => {
      let value = get();
      storageSet(key, value, storage);
      set(value);
    });
  };
}
function storageHas(key, storage) {
  return storage.getItem(key) !== null;
}
function storageGet(key, storage) {
  let value = storage.getItem(key, storage);
  if (value === void 0)
    return;
  return JSON.parse(value);
}
function storageSet(key, value, storage) {
  storage.setItem(key, JSON.stringify(value));
}
var module_default$1 = src_default$1;
function morph(from, toHtml, options) {
  monkeyPatchDomSetAttributeToAllowAtSymbols();
  let toEl;
  let key, lookahead, updating, updated, removing, removed, adding, added;
  function assignOptions(options2 = {}) {
    let defaultGetKey = (el) => el.getAttribute("key");
    let noop = () => {
    };
    updating = options2.updating || noop;
    updated = options2.updated || noop;
    removing = options2.removing || noop;
    removed = options2.removed || noop;
    adding = options2.adding || noop;
    added = options2.added || noop;
    key = options2.key || defaultGetKey;
    lookahead = options2.lookahead || false;
  }
  function patch(from2, to) {
    if (differentElementNamesTypesOrKeys(from2, to)) {
      return swapElements(from2, to);
    }
    let updateChildrenOnly = false;
    if (shouldSkip(updating, from2, to, () => updateChildrenOnly = true))
      return;
    if (from2.nodeType === 1 && window.Alpine) {
      window.Alpine.cloneNode(from2, to);
      if (from2._x_teleport && to._x_teleport) {
        patch(from2._x_teleport, to._x_teleport);
      }
    }
    if (textOrComment(to)) {
      patchNodeValue(from2, to);
      updated(from2, to);
      return;
    }
    if (!updateChildrenOnly) {
      patchAttributes(from2, to);
    }
    updated(from2, to);
    patchChildren(from2, to);
  }
  function differentElementNamesTypesOrKeys(from2, to) {
    return from2.nodeType != to.nodeType || from2.nodeName != to.nodeName || getKey(from2) != getKey(to);
  }
  function swapElements(from2, to) {
    if (shouldSkip(removing, from2))
      return;
    let toCloned = to.cloneNode(true);
    if (shouldSkip(adding, toCloned))
      return;
    from2.replaceWith(toCloned);
    removed(from2);
    added(toCloned);
  }
  function patchNodeValue(from2, to) {
    let value = to.nodeValue;
    if (from2.nodeValue !== value) {
      from2.nodeValue = value;
    }
  }
  function patchAttributes(from2, to) {
    if (from2._x_transitioning)
      return;
    if (from2._x_isShown && !to._x_isShown) {
      return;
    }
    if (!from2._x_isShown && to._x_isShown) {
      return;
    }
    let domAttributes = Array.from(from2.attributes);
    let toAttributes = Array.from(to.attributes);
    for (let i = domAttributes.length - 1; i >= 0; i--) {
      let name = domAttributes[i].name;
      if (!to.hasAttribute(name)) {
        from2.removeAttribute(name);
      }
    }
    for (let i = toAttributes.length - 1; i >= 0; i--) {
      let name = toAttributes[i].name;
      let value = toAttributes[i].value;
      if (from2.getAttribute(name) !== value) {
        from2.setAttribute(name, value);
      }
    }
  }
  function patchChildren(from2, to) {
    let fromKeys = keyToMap(from2.children);
    let fromKeyHoldovers = {};
    let currentTo = getFirstNode(to);
    let currentFrom = getFirstNode(from2);
    while (currentTo) {
      seedingMatchingId(currentTo, currentFrom);
      let toKey = getKey(currentTo);
      let fromKey = getKey(currentFrom);
      if (!currentFrom) {
        if (toKey && fromKeyHoldovers[toKey]) {
          let holdover = fromKeyHoldovers[toKey];
          from2.appendChild(holdover);
          currentFrom = holdover;
          fromKey = getKey(currentFrom);
        } else {
          if (!shouldSkip(adding, currentTo)) {
            let clone = currentTo.cloneNode(true);
            from2.appendChild(clone);
            added(clone);
          }
          currentTo = getNextSibling(to, currentTo);
          continue;
        }
      }
      let isIf = (node) => node && node.nodeType === 8 && node.textContent === "[if BLOCK]><![endif]";
      let isEnd = (node) => node && node.nodeType === 8 && node.textContent === "[if ENDBLOCK]><![endif]";
      if (isIf(currentTo) && isIf(currentFrom)) {
        let nestedIfCount = 0;
        let fromBlockStart = currentFrom;
        while (currentFrom) {
          let next = getNextSibling(from2, currentFrom);
          if (isIf(next)) {
            nestedIfCount++;
          } else if (isEnd(next) && nestedIfCount > 0) {
            nestedIfCount--;
          } else if (isEnd(next) && nestedIfCount === 0) {
            currentFrom = next;
            break;
          }
          currentFrom = next;
        }
        let fromBlockEnd = currentFrom;
        nestedIfCount = 0;
        let toBlockStart = currentTo;
        while (currentTo) {
          let next = getNextSibling(to, currentTo);
          if (isIf(next)) {
            nestedIfCount++;
          } else if (isEnd(next) && nestedIfCount > 0) {
            nestedIfCount--;
          } else if (isEnd(next) && nestedIfCount === 0) {
            currentTo = next;
            break;
          }
          currentTo = next;
        }
        let toBlockEnd = currentTo;
        let fromBlock = new Block(fromBlockStart, fromBlockEnd);
        let toBlock = new Block(toBlockStart, toBlockEnd);
        patchChildren(fromBlock, toBlock);
        continue;
      }
      if (currentFrom.nodeType === 1 && lookahead && !currentFrom.isEqualNode(currentTo)) {
        let nextToElementSibling = getNextSibling(to, currentTo);
        let found = false;
        while (!found && nextToElementSibling) {
          if (nextToElementSibling.nodeType === 1 && currentFrom.isEqualNode(nextToElementSibling)) {
            found = true;
            currentFrom = addNodeBefore(from2, currentTo, currentFrom);
            fromKey = getKey(currentFrom);
          }
          nextToElementSibling = getNextSibling(to, nextToElementSibling);
        }
      }
      if (toKey !== fromKey) {
        if (!toKey && fromKey) {
          fromKeyHoldovers[fromKey] = currentFrom;
          currentFrom = addNodeBefore(from2, currentTo, currentFrom);
          fromKeyHoldovers[fromKey].remove();
          currentFrom = getNextSibling(from2, currentFrom);
          currentTo = getNextSibling(to, currentTo);
          continue;
        }
        if (toKey && !fromKey) {
          if (fromKeys[toKey]) {
            currentFrom.replaceWith(fromKeys[toKey]);
            currentFrom = fromKeys[toKey];
            fromKey = getKey(currentFrom);
          }
        }
        if (toKey && fromKey) {
          let fromKeyNode = fromKeys[toKey];
          if (fromKeyNode) {
            fromKeyHoldovers[fromKey] = currentFrom;
            currentFrom.replaceWith(fromKeyNode);
            currentFrom = fromKeyNode;
            fromKey = getKey(currentFrom);
          } else {
            fromKeyHoldovers[fromKey] = currentFrom;
            currentFrom = addNodeBefore(from2, currentTo, currentFrom);
            fromKeyHoldovers[fromKey].remove();
            currentFrom = getNextSibling(from2, currentFrom);
            currentTo = getNextSibling(to, currentTo);
            continue;
          }
        }
      }
      let currentFromNext = currentFrom && getNextSibling(from2, currentFrom);
      patch(currentFrom, currentTo);
      currentTo = currentTo && getNextSibling(to, currentTo);
      currentFrom = currentFromNext;
    }
    let removals = [];
    while (currentFrom) {
      if (!shouldSkip(removing, currentFrom))
        removals.push(currentFrom);
      currentFrom = getNextSibling(from2, currentFrom);
    }
    while (removals.length) {
      let domForRemoval = removals.shift();
      domForRemoval.remove();
      removed(domForRemoval);
    }
  }
  function getKey(el) {
    return el && el.nodeType === 1 && key(el);
  }
  function keyToMap(els) {
    let map = {};
    for (let el of els) {
      let theKey = getKey(el);
      if (theKey) {
        map[theKey] = el;
      }
    }
    return map;
  }
  function addNodeBefore(parent, node, beforeMe) {
    if (!shouldSkip(adding, node)) {
      let clone = node.cloneNode(true);
      parent.insertBefore(clone, beforeMe);
      added(clone);
      return clone;
    }
    return node;
  }
  assignOptions(options);
  toEl = typeof toHtml === "string" ? createElement(toHtml) : toHtml;
  if (window.Alpine && window.Alpine.closestDataStack && !from._x_dataStack) {
    toEl._x_dataStack = window.Alpine.closestDataStack(from);
    toEl._x_dataStack && window.Alpine.cloneNode(from, toEl);
  }
  patch(from, toEl);
  toEl = void 0;
  return from;
}
morph.step = () => {
};
morph.log = () => {
};
function shouldSkip(hook, ...args) {
  let skip = false;
  hook(...args, () => skip = true);
  return skip;
}
var patched = false;
function createElement(html) {
  const template = document.createElement("template");
  template.innerHTML = html;
  return template.content.firstElementChild;
}
function textOrComment(el) {
  return el.nodeType === 3 || el.nodeType === 8;
}
var Block = class {
  constructor(start, end) {
    this.startComment = start;
    this.endComment = end;
  }
  get children() {
    let children = [];
    let currentNode = this.startComment.nextSibling;
    while (currentNode && currentNode !== this.endComment) {
      children.push(currentNode);
      currentNode = currentNode.nextSibling;
    }
    return children;
  }
  appendChild(child) {
    this.endComment.before(child);
  }
  get firstChild() {
    let first = this.startComment.nextSibling;
    if (first === this.endComment)
      return;
    return first;
  }
  nextNode(reference) {
    let next = reference.nextSibling;
    if (next === this.endComment)
      return;
    return next;
  }
  insertBefore(newNode, reference) {
    reference.before(newNode);
    return newNode;
  }
};
function getFirstNode(parent) {
  return parent.firstChild;
}
function getNextSibling(parent, reference) {
  let next;
  if (parent instanceof Block) {
    next = parent.nextNode(reference);
  } else {
    next = reference.nextSibling;
  }
  return next;
}
function monkeyPatchDomSetAttributeToAllowAtSymbols() {
  if (patched)
    return;
  patched = true;
  let original = Element.prototype.setAttribute;
  let hostDiv = document.createElement("div");
  Element.prototype.setAttribute = function newSetAttribute(name, value) {
    if (!name.includes("@")) {
      return original.call(this, name, value);
    }
    hostDiv.innerHTML = `<span ${name}="${value}"></span>`;
    let attr = hostDiv.firstElementChild.getAttributeNode(name);
    hostDiv.firstElementChild.removeAttributeNode(attr);
    this.setAttributeNode(attr);
  };
}
function seedingMatchingId(to, from) {
  let fromId = from && from._x_bindings && from._x_bindings.id;
  if (!fromId)
    return;
  if (!to.setAttribute)
    return;
  to.setAttribute("id", fromId);
  to.id = fromId;
}
function src_default(Alpine2) {
  Alpine2.morph = morph;
}
var module_default = src_default;
const ESC_KEY = "Escape";
const TAB_KEY = "Tab";
const ARROW_UP_KEY = "ArrowUp";
const ARROW_DOWN_KEY = "ArrowDown";
const ARROW_RIGHT_KEY = "ArrowRight";
const ARROW_LEFT_KEY = "ArrowLeft";
const isMobile = () => {
  return window.matchMedia("(max-width: 767px)").matches;
};
let globalTargetElement = null;
let isDocumentFreezed = false;
function onDocumentTouchMove(e) {
  if (e.target instanceof HTMLInputElement && e.target.type === "range") {
    return;
  }
  e.preventDefault();
}
function onElementTouchMove(e) {
  e.stopPropagation();
  e.stopImmediatePropagation();
}
function onDocumentArrowKeys(e) {
  if (e.key === ARROW_DOWN_KEY || e.key === ARROW_UP_KEY) {
    e.preventDefault();
  }
}
function onElementArrowKeys(e) {
  if (e.key === ARROW_DOWN_KEY || e.key === ARROW_UP_KEY) {
    e.stopPropagation();
    e.stopImmediatePropagation();
  }
}
const freezeScroll = () => {
  if (!isDocumentFreezed) {
    document.addEventListener("touchmove", onDocumentTouchMove, {
      passive: false
    });
    document.addEventListener("wheel", onDocumentTouchMove, {
      passive: false
    });
    document.addEventListener("keydown", onDocumentArrowKeys, {
      passive: false
    });
    document.body.style.overflow = "hidden";
    isDocumentFreezed = true;
  }
};
const makeElementScrollable = (targetElement) => {
  if (targetElement && targetElement !== globalTargetElement) {
    globalTargetElement = targetElement;
    globalTargetElement.addEventListener("keydown", onElementArrowKeys);
    globalTargetElement.addEventListener("touchmove", onElementTouchMove);
    globalTargetElement.addEventListener("wheel", onElementTouchMove);
    globalTargetElement.style.setProperty(
      "-webkit-overflow-scrolling",
      "touch"
    );
  }
};
const makeElementNotScrollable = () => {
  if (globalTargetElement) {
    globalTargetElement.removeEventListener("keydown", onElementArrowKeys);
    globalTargetElement.removeEventListener("touchmove", onElementTouchMove);
    globalTargetElement.removeEventListener("wheel", onElementTouchMove);
    globalTargetElement.style.removeProperty("-webkit-overflow-scrolling");
    globalTargetElement = null;
  }
};
const unfreezeScroll = () => {
  if (isDocumentFreezed) {
    document.removeEventListener("keydown", onDocumentArrowKeys);
    document.removeEventListener("touchmove", onDocumentTouchMove);
    document.removeEventListener("wheel", onDocumentTouchMove);
    isDocumentFreezed = false;
    document.body.style.overflow = "";
  }
  makeElementNotScrollable();
};
const doElementTransitionFromSrcToDest = async ({
  srcElem,
  destElementCallback,
  transitionContainer,
  isCopyCssProperties = false
}) => {
  var _a;
  if (!srcElem || !destElementCallback) {
    return;
  }
  const {
    top: st,
    left: sl,
    width: sw,
    height: sh
  } = srcElem.getBoundingClientRect();
  const clonedElement = srcElem.cloneNode(true);
  const skipEl = clonedElement.querySelector(
    "[x-element-transition-skip]"
  );
  if (isCopyCssProperties) {
    const styles = window.getComputedStyle(srcElem);
    [
      "font-family",
      "font-size",
      "font-weight",
      "background",
      "outline",
      "border",
      "color"
    ].forEach((key) => {
      clonedElement.style.setProperty(key, styles.getPropertyValue(key));
    });
  }
  (_a = clonedElement.querySelector('[loading="lazy"]')) == null ? void 0 : _a.setAttribute("loading", "eager");
  clonedElement.style.top = `${st}px`;
  clonedElement.style.left = `${sl}px`;
  clonedElement.style.width = `${sw}px`;
  clonedElement.style.height = `${sh}px`;
  clonedElement.setAttribute("x-ignore", "");
  transitionContainer.appendChild(clonedElement);
  await new Promise((resolve, reject) => {
    let maxTries = 100;
    const interval = setInterval(() => {
      if (maxTries <= 0) {
        clearInterval(interval);
        reject();
      }
      const condition = destElementCallback();
      if (condition) {
        clearInterval(interval);
        resolve();
      }
      maxTries -= 1;
    }, 100);
  });
  const destEl = destElementCallback();
  const {
    top: tt,
    left: tl,
    width: tw,
    height: th
  } = destEl.getBoundingClientRect();
  if (skipEl) {
    skipEl.style.transform = `scale(${sw / tw}, ${sh / th})`;
    skipEl.style.bottom = `${8 / (th / sh)}px`;
    const styles = skipEl.getAttribute("x-element-transition-skip");
    if (styles) {
      const styleRules = JSON.parse(styles);
      Object.keys(styleRules).forEach((key) => {
        skipEl.style[key] = styleRules[key];
      });
    }
  }
  clonedElement.style.transform = `translate3d(${tl - sl}px, ${tt - st}px, 0) scale(${tw / sw}, ${th / sh})`;
  clonedElement.style.borderRadius = window.getComputedStyle(
    destEl
  ).borderRadius;
  await new Promise((resolve) => {
    clonedElement.addEventListener(
      "transitionend",
      () => {
        resolve();
      },
      { once: true }
    );
  });
};
const _handleInputValue = (from, to) => {
  if (!(from instanceof HTMLInputElement) || !(to instanceof HTMLInputElement)) {
    return;
  }
  if ((from.type === "checkbox" || from.type === "radio") && from.checked !== to.checked) {
    from.checked = to.checked;
  }
};
const _handleTemplates = (from, to) => {
  if (!(from instanceof HTMLTemplateElement) || !(to instanceof HTMLTemplateElement)) {
    return;
  }
  const newNodes = Array.from(to.content.children);
  from.content.replaceChildren(...newNodes);
};
const replaceElement = (from, to, resetInputValues) => {
  if (!from || !to) {
    return;
  }
  Alpine.morph(from, to, {
    updating(from2, to2, _childrenOnly, skip) {
      if (from2 instanceof Element && from2.hasAttribute("x-morph-ignore")) {
        skip();
        return;
      }
      if (from2 instanceof HTMLImageElement && to2 instanceof HTMLImageElement) {
        const fromSrc = from2.src.replace(/^https?:\/\//, "//");
        const toSrc = to2.src.replace(/^https?:\/\//, "//");
        if (fromSrc === toSrc && from2.complete) {
          skip();
          return;
        }
      }
    },
    updated(from2, to2) {
      _handleTemplates(from2, to2);
      if (resetInputValues) {
        _handleInputValue(from2, to2);
      }
    }
  });
};
var commonjsGlobal = typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : {};
function getDefaultExportFromCjs(x) {
  return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, "default") ? x["default"] : x;
}
var nprogress = { exports: {} };
/* NProgress, (c) 2013, 2014 Rico Sta. Cruz - http://ricostacruz.com/nprogress
 * @license MIT */
(function(module, exports) {
  (function(root, factory) {
    {
      module.exports = factory();
    }
  })(commonjsGlobal, function() {
    var NProgress = {};
    NProgress.version = "0.2.0";
    var Settings = NProgress.settings = {
      minimum: 0.08,
      easing: "ease",
      positionUsing: "",
      speed: 200,
      trickle: true,
      trickleRate: 0.02,
      trickleSpeed: 800,
      showSpinner: true,
      barSelector: '[role="bar"]',
      spinnerSelector: '[role="spinner"]',
      parent: "body",
      template: '<div class="bar" role="bar"><div class="peg"></div></div><div class="spinner" role="spinner"><div class="spinner-icon"></div></div>'
    };
    NProgress.configure = function(options) {
      var key, value;
      for (key in options) {
        value = options[key];
        if (value !== void 0 && options.hasOwnProperty(key)) Settings[key] = value;
      }
      return this;
    };
    NProgress.status = null;
    NProgress.set = function(n) {
      var started = NProgress.isStarted();
      n = clamp(n, Settings.minimum, 1);
      NProgress.status = n === 1 ? null : n;
      var progress = NProgress.render(!started), bar = progress.querySelector(Settings.barSelector), speed = Settings.speed, ease = Settings.easing;
      progress.offsetWidth;
      queue(function(next) {
        if (Settings.positionUsing === "") Settings.positionUsing = NProgress.getPositioningCSS();
        css(bar, barPositionCSS(n, speed, ease));
        if (n === 1) {
          css(progress, {
            transition: "none",
            opacity: 1
          });
          progress.offsetWidth;
          setTimeout(function() {
            css(progress, {
              transition: "all " + speed + "ms linear",
              opacity: 0
            });
            setTimeout(function() {
              NProgress.remove();
              next();
            }, speed);
          }, speed);
        } else {
          setTimeout(next, speed);
        }
      });
      return this;
    };
    NProgress.isStarted = function() {
      return typeof NProgress.status === "number";
    };
    NProgress.start = function() {
      if (!NProgress.status) NProgress.set(0);
      var work = function() {
        setTimeout(function() {
          if (!NProgress.status) return;
          NProgress.trickle();
          work();
        }, Settings.trickleSpeed);
      };
      if (Settings.trickle) work();
      return this;
    };
    NProgress.done = function(force) {
      if (!force && !NProgress.status) return this;
      return NProgress.inc(0.3 + 0.5 * Math.random()).set(1);
    };
    NProgress.inc = function(amount) {
      var n = NProgress.status;
      if (!n) {
        return NProgress.start();
      } else {
        if (typeof amount !== "number") {
          amount = (1 - n) * clamp(Math.random() * n, 0.1, 0.95);
        }
        n = clamp(n + amount, 0, 0.994);
        return NProgress.set(n);
      }
    };
    NProgress.trickle = function() {
      return NProgress.inc(Math.random() * Settings.trickleRate);
    };
    (function() {
      var initial = 0, current = 0;
      NProgress.promise = function($promise) {
        if (!$promise || $promise.state() === "resolved") {
          return this;
        }
        if (current === 0) {
          NProgress.start();
        }
        initial++;
        current++;
        $promise.always(function() {
          current--;
          if (current === 0) {
            initial = 0;
            NProgress.done();
          } else {
            NProgress.set((initial - current) / initial);
          }
        });
        return this;
      };
    })();
    NProgress.render = function(fromStart) {
      if (NProgress.isRendered()) return document.getElementById("nprogress");
      addClass(document.documentElement, "nprogress-busy");
      var progress = document.createElement("div");
      progress.id = "nprogress";
      progress.innerHTML = Settings.template;
      var bar = progress.querySelector(Settings.barSelector), perc = fromStart ? "-100" : toBarPerc(NProgress.status || 0), parent = document.querySelector(Settings.parent), spinner;
      css(bar, {
        transition: "all 0 linear",
        transform: "translate3d(" + perc + "%,0,0)"
      });
      if (!Settings.showSpinner) {
        spinner = progress.querySelector(Settings.spinnerSelector);
        spinner && removeElement(spinner);
      }
      if (parent != document.body) {
        addClass(parent, "nprogress-custom-parent");
      }
      parent.appendChild(progress);
      return progress;
    };
    NProgress.remove = function() {
      removeClass(document.documentElement, "nprogress-busy");
      removeClass(document.querySelector(Settings.parent), "nprogress-custom-parent");
      var progress = document.getElementById("nprogress");
      progress && removeElement(progress);
    };
    NProgress.isRendered = function() {
      return !!document.getElementById("nprogress");
    };
    NProgress.getPositioningCSS = function() {
      var bodyStyle = document.body.style;
      var vendorPrefix = "WebkitTransform" in bodyStyle ? "Webkit" : "MozTransform" in bodyStyle ? "Moz" : "msTransform" in bodyStyle ? "ms" : "OTransform" in bodyStyle ? "O" : "";
      if (vendorPrefix + "Perspective" in bodyStyle) {
        return "translate3d";
      } else if (vendorPrefix + "Transform" in bodyStyle) {
        return "translate";
      } else {
        return "margin";
      }
    };
    function clamp(n, min, max) {
      if (n < min) return min;
      if (n > max) return max;
      return n;
    }
    function toBarPerc(n) {
      return (-1 + n) * 100;
    }
    function barPositionCSS(n, speed, ease) {
      var barCSS;
      if (Settings.positionUsing === "translate3d") {
        barCSS = { transform: "translate3d(" + toBarPerc(n) + "%,0,0)" };
      } else if (Settings.positionUsing === "translate") {
        barCSS = { transform: "translate(" + toBarPerc(n) + "%,0)" };
      } else {
        barCSS = { "margin-left": toBarPerc(n) + "%" };
      }
      barCSS.transition = "all " + speed + "ms " + ease;
      return barCSS;
    }
    var queue = /* @__PURE__ */ function() {
      var pending = [];
      function next() {
        var fn = pending.shift();
        if (fn) {
          fn(next);
        }
      }
      return function(fn) {
        pending.push(fn);
        if (pending.length == 1) next();
      };
    }();
    var css = /* @__PURE__ */ function() {
      var cssPrefixes = ["Webkit", "O", "Moz", "ms"], cssProps = {};
      function camelCase(string) {
        return string.replace(/^-ms-/, "ms-").replace(/-([\da-z])/gi, function(match, letter) {
          return letter.toUpperCase();
        });
      }
      function getVendorProp(name) {
        var style = document.body.style;
        if (name in style) return name;
        var i = cssPrefixes.length, capName = name.charAt(0).toUpperCase() + name.slice(1), vendorName;
        while (i--) {
          vendorName = cssPrefixes[i] + capName;
          if (vendorName in style) return vendorName;
        }
        return name;
      }
      function getStyleProp(name) {
        name = camelCase(name);
        return cssProps[name] || (cssProps[name] = getVendorProp(name));
      }
      function applyCss(element, prop, value) {
        prop = getStyleProp(prop);
        element.style[prop] = value;
      }
      return function(element, properties) {
        var args = arguments, prop, value;
        if (args.length == 2) {
          for (prop in properties) {
            value = properties[prop];
            if (value !== void 0 && properties.hasOwnProperty(prop)) applyCss(element, prop, value);
          }
        } else {
          applyCss(element, args[1], args[2]);
        }
      };
    }();
    function hasClass(element, name) {
      var list = typeof element == "string" ? element : classList(element);
      return list.indexOf(" " + name + " ") >= 0;
    }
    function addClass(element, name) {
      var oldList = classList(element), newList = oldList + name;
      if (hasClass(oldList, name)) return;
      element.className = newList.substring(1);
    }
    function removeClass(element, name) {
      var oldList = classList(element), newList;
      if (!hasClass(element, name)) return;
      newList = oldList.replace(" " + name + " ", " ");
      element.className = newList.substring(1, newList.length - 1);
    }
    function classList(element) {
      return (" " + (element.className || "") + " ").replace(/\s+/gi, " ");
    }
    function removeElement(element) {
      element && element.parentNode && element.parentNode.removeChild(element);
    }
    return NProgress;
  });
})(nprogress);
var nprogressExports = nprogress.exports;
const nProgress = /* @__PURE__ */ getDefaultExportFromCjs(nprogressExports);
nProgress.configure({ showSpinner: false });
let lastMainContentUpdateUrl = window.location.href;
const cachedResponses = {};
const isExternalURL = (url) => {
  if (url.startsWith("//")) {
    return new URL(location.protocol + url).origin !== location.origin;
  }
  if (url.includes("://")) {
    return new URL(url).origin !== location.origin;
  }
  return false;
};
const TransitionStore = {
  isTransitioning: false,
  pageData: void 0,
  pageType: void 0,
  isAnimating: false,
  isPreviewAnimating: false,
  originalFocusableEl: null,
  __activeTransitionAreaRef: null,
  isPreviewActive: false,
  async _doTransition(areaId, callback) {
    if (!Alpine.store("main").isMobile || Alpine.store("main").isReducedMotion) {
      callback();
      return;
    }
    const transitionContainerRef = document.querySelector(
      "[x-element-transition-wrapper]"
    );
    if (!transitionContainerRef) {
      console.log("transition container not found");
      return;
    }
    freezeScroll();
    this.__activeTransitionAreaRef = areaId;
    const areaElement = document.querySelector(
      `[x-element-transition-area="${areaId}"]`
    );
    if (!areaElement) {
      return;
    }
    const srcElements = Object.fromEntries(
      [
        ...areaElement.querySelectorAll(
          "[x-element-transition-src]"
        )
      ].map((srcElement) => [
        srcElement.getAttribute("x-element-transition-src"),
        srcElement
      ])
    );
    if (!srcElements || Object.entries(srcElements).length === 0) {
      return;
    }
    this.isTransitioning = true;
    await new Promise((resolve) => {
      transitionContainerRef.addEventListener(
        "transitionstart",
        () => {
          resolve();
        },
        { once: true }
      );
    });
    const currentPage = window.location.href;
    const animationPromise = Promise.all(
      Object.entries(srcElements).map(
        ([key, srcElem]) => doElementTransitionFromSrcToDest({
          srcElem,
          destElementCallback: () => {
            if (currentPage === window.location.href) {
              return null;
            }
            const destEl = document.querySelector(
              `[x-element-transition-dest="${key}"]`
            );
            if (!destEl) {
              return null;
            }
            return destEl;
          },
          transitionContainer: transitionContainerRef,
          isCopyCssProperties: true
        })
      )
    );
    await new Promise((resolve) => {
      transitionContainerRef.addEventListener(
        "transitionend",
        () => {
          resolve();
        },
        { once: true }
      );
    });
    callback();
    await animationPromise;
    this.isTransitioning = false;
    await new Promise((resolve) => {
      transitionContainerRef.addEventListener(
        "transitionstart",
        () => {
          resolve();
        },
        { once: true }
      );
    });
    await new Promise((resolve) => {
      transitionContainerRef.addEventListener(
        "transitionend",
        () => {
          resolve();
        },
        { once: true }
      );
    });
    while (transitionContainerRef.firstChild) {
      transitionContainerRef.removeChild(transitionContainerRef.firstChild);
    }
    this.__activeTransitionAreaRef = null;
    unfreezeScroll();
  },
  _showTransitionFallback(isPreview) {
    const target = isPreview ? document.getElementById("PreviewContent") : document.getElementById("MainContent");
    const template = document.querySelector(
      `[x-fallback-template-type="${this.pageType}"]`
    );
    if (!template) {
      return;
    }
    const content = template.innerHTML;
    if (target) {
      target.innerHTML = content;
    }
    if (!isPreview) {
      window.scrollTo(0, 0);
    }
  },
  _clearFallback() {
    this.pageType = void 0;
  }
};
const replaceMeta = (rawContent) => {
  const regex = /<!-- page-meta -->([\s\S]*?)<!-- end-page-meta -->/;
  const content = rawContent.match(regex);
  const newContent = content ? content[0] : "";
  if (!newContent) {
    return;
  }
  const metaNodes = [];
  let foundStart = false;
  let foundEnd = false;
  let endComment = null;
  for (let i = 0; i < document.head.childNodes.length; i++) {
    const node = document.head.childNodes[i];
    if (node.nodeType === 8) {
      if (node.nodeValue === " page-meta ") {
        foundStart = true;
        continue;
      }
      if (node.nodeValue === " end-page-meta ") {
        endComment = node;
        foundEnd = true;
        break;
      }
    }
    if (foundStart && !foundEnd) {
      metaNodes.push(node);
    }
  }
  if (!endComment) {
    return;
  }
  metaNodes.forEach((node) => node.remove());
  const newMetaContent = newContent.replace("<!-- page-meta -->", "<head>").replace("<!-- end-page-meta -->", "</head>");
  const parser = new DOMParser();
  const newMetaNodes = parser.parseFromString(newMetaContent, "text/html");
  [...newMetaNodes.head.childNodes].forEach((node) => {
    document.head.insertBefore(node, endComment);
  });
};
const morphContent = (rawContent, lookup, target) => {
  const regex = new RegExp(
    `<!-- ${lookup} -->([\\s\\S]*?)<!-- end-${lookup} -->`,
    "g"
  );
  const content = rawContent.match(regex);
  const newContent = content ? content[0] : "";
  replaceElement(target, newContent);
};
const replaceContent = (rawContent, lookup, target) => {
  const regex = new RegExp(
    `<!-- ${lookup} -->([\\s\\S]*?)<!-- end-${lookup} -->`,
    "g"
  );
  const content = rawContent.match(regex);
  const newContent = content ? content[0] : "";
  target.innerHTML = newContent;
};
const replaceMainContent = (rawContent) => {
  lastMainContentUpdateUrl = window.location.href;
  replaceMeta(rawContent);
  return morphContent(
    rawContent,
    "main-content",
    document.getElementById("MainContent")
  );
};
const replacePreviewContent = (rawContent) => {
  replaceMeta(rawContent);
  return replaceContent(
    rawContent,
    "preview-content",
    document.getElementById("PreviewContent")
  );
};
const pushStateAndNotify = (...args) => {
  if (window.Shopify.designMode) {
    window.location.replace(args[2]);
  } else {
    history.pushState(...args);
    const pushStateEvent = new CustomEvent("pushstate", {
      detail: {
        state: args[0],
        url: args[2]
      }
    });
    window.dispatchEvent(pushStateEvent);
  }
};
const fetchPage = (url) => {
  enableFadeInImages();
  return fetch(url).then((res) => {
    if (res.ok || res.status === 404) {
      return res.text();
    }
    throw new Error("Failed to get page for transition");
  });
};
const enableFadeInImages = () => {
  document.body.classList.remove("[&_.no-fade]:opacity-100");
  document.body.classList.remove(
    "max-md:[&_.card-product:nth-child(-n+2)_.no-fade]:opacity-100"
  );
  document.body.classList.remove("md:[&_.card-product_.no-fade]:opacity-100");
};
const cachePage = (url, html) => {
  cachedResponses[url] = html;
};
const fetchAndCachePage = async (url) => {
  const html = await fetchPage(url);
  cachePage(url, html);
  return html;
};
const navigateWithTransition = (nextUrl, options = {}) => {
  Alpine.store("transition").isAnimating = false;
  Alpine.store("transition").isPreviewAnimating = false;
  const currentUrl = window.location.pathname + window.location.search;
  const scrollPosition = window.scrollY;
  if (currentUrl === nextUrl) {
    Alpine.store("popup").hideAllPopups();
    Alpine.store("resizable").hideAll();
    window.scrollTo(0, 0);
    return;
  }
  nProgress.start();
  const isPreview = !!options.preview && !Alpine.store("main").isMobile;
  const isAnimating = !!options.animate;
  const navigate = async () => {
    if (options.type && options.data) {
      if (isPreview) {
        Alpine.store("transition").isPreviewAnimating = isAnimating;
        Alpine.store("transition").originalFocusableEl = options.target;
      } else {
        Alpine.store("transition").isAnimating = isAnimating;
      }
      Alpine.store("transition").pageType = options.type;
      Alpine.store("transition").pageData = options.data;
      Alpine.store("transition")._showTransitionFallback(isPreview);
    }
    Alpine.nextTick(async () => {
      try {
        Alpine.store("popup").hideAllPopups();
        Alpine.store("resizable").hideAll();
        history.replaceState({ ...history.state, scrollPosition }, "");
        pushStateAndNotify({ isPreview }, "", nextUrl);
        const html = await fetchAndCachePage(nextUrl);
        if (isPreview) {
          replacePreviewContent(html);
        } else {
          replaceMainContent(html);
          window.scrollTo(0, 0);
        }
        Alpine.store("transition")._clearFallback();
      } catch (error) {
        window.location.href = nextUrl || "";
      }
      nProgress.done();
    });
  };
  if (options.areaId) {
    Alpine.store("transition")._doTransition(options.areaId, navigate);
  } else {
    navigate();
  }
};
const prefetchedLinks = /* @__PURE__ */ new Set();
const prefetchLink = (link) => {
  const prefetchLink2 = document.createElement("link");
  prefetchLink2.rel = "prefetch";
  prefetchLink2.href = link;
  prefetchLink2.as = "document";
  document.head.appendChild(prefetchLink2);
  prefetchedLinks.add(link);
};
const prefetchObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const element = entry.target;
      const href = element.getAttribute("href");
      if (!href) return;
      let timeoutId = element.timeoutId;
      if (entry.isIntersecting && !timeoutId) {
        element.timeoutId = setTimeout(() => {
          if (prefetchedLinks.has(href)) return;
          prefetchLink(href);
          prefetchObserver.unobserve(element);
        }, 200);
      } else if (!entry.isIntersecting && timeoutId) {
        clearTimeout(timeoutId);
        element.timeoutId = null;
      }
    });
  },
  { threshold: 0.1 }
);
function TransitionPlugin(Alpine2) {
  Alpine2.store("transition", TransitionStore);
  Alpine2.directive(
    "element-transition-trigger",
    (el, { value, modifiers, expression }, { evaluate, cleanup }) => {
      if (modifiers.includes("desktop") && Alpine2.store("main").isMobile) {
        return;
      }
      const transitionAreaEl = el.closest("[x-element-transition-area]");
      const areaId = transitionAreaEl ? transitionAreaEl.getAttribute("x-element-transition-area") : null;
      const link = el.getAttribute("href");
      const isTargetBlank = el.getAttribute("target") === "_blank";
      const isMobile2 = Alpine2.store("main").isMobile;
      if (!link || isExternalURL(link) || isTargetBlank) {
        return;
      }
      const onHover = () => {
        if (prefetchedLinks.has(link)) return;
        prefetchLink(link);
      };
      const onClick = (e) => {
        if (window.navigationType === "MPA") {
          const areaElement = document.querySelector(
            `[x-element-transition-area="${areaId}"]`
          );
          if (!areaElement || !isMobile2) {
            return;
          }
          const srcElement = areaElement.querySelector(
            "[x-element-transition-src]"
          );
          const key = srcElement == null ? void 0 : srcElement.getAttribute("x-element-transition-src");
          if (srcElement) {
            sessionStorage.setItem(
              "elementRect",
              JSON.stringify(srcElement.getBoundingClientRect())
            );
            sessionStorage.setItem(
              "elementHtml",
              srcElement.innerHTML.replace('loading="lazy"', 'loading="eager"')
            );
            sessionStorage.setItem("destKey", key || "");
          }
        } else {
          e.preventDefault();
          e.stopPropagation();
          navigateWithTransition(link || "", {
            preview: modifiers.includes("preview"),
            animate: modifiers.includes("animate"),
            type: value,
            data: expression ? evaluate(expression) : void 0,
            areaId: areaId || void 0,
            target: e.target
          });
        }
      };
      el.addEventListener("click", onClick);
      if (window.navigationType === "MPA") {
        if (isMobile2) {
          prefetchObserver.observe(el);
        } else {
          el.addEventListener("mouseover", onHover);
        }
      }
      cleanup(() => {
        el.removeEventListener("click", onClick);
        if (window.navigationType === "MPA") {
          if (isMobile2) {
            prefetchObserver.unobserve(el);
          } else {
            el.removeEventListener("mouseover", onHover);
          }
        }
      });
    }
  );
  if (window.navigationType === "MPA") {
    window.addEventListener("pageshow", (event) => {
      if (event.persisted) {
        prefetchedLinks.forEach((link) => prefetchLink(link));
      }
    });
  } else {
    let lastPopStateUrl = window.location.href;
    window.addEventListener("popstate", async (event) => {
      var _a, _b, _c, _d;
      Alpine2.store("transition").isAnimating = false;
      Alpine2.store("transition").isPreviewAnimating = false;
      history.scrollRestoration = "manual";
      if (window.location.href === lastMainContentUpdateUrl) {
        return;
      }
      const currentPopStateUrl = window.location.href;
      lastPopStateUrl = window.location.href;
      Alpine2.store("popup").hideAllPopups();
      Alpine2.store("resizable").hideAll();
      nProgress.start();
      const { pathname, search } = new URL(window.location.href);
      const cachedHtml = cachedResponses[pathname + search];
      if (cachedHtml) {
        if ((_a = event.state) == null ? void 0 : _a.isPreview) {
          replacePreviewContent(cachedHtml);
        } else {
          replaceMainContent(cachedHtml);
          if ((_b = event.state) == null ? void 0 : _b.scrollPosition) {
            window.scrollTo({
              top: event.state.scrollPosition,
              behavior: "instant"
            });
          }
        }
        nProgress.done();
        return;
      }
      if (lastPopStateUrl !== currentPopStateUrl) {
        return;
      }
      const html = await fetchAndCachePage(
        window.location.pathname + window.location.search
      );
      if (lastPopStateUrl !== currentPopStateUrl) {
        return;
      }
      if ((_c = event.state) == null ? void 0 : _c.isPreview) {
        replacePreviewContent(html);
      } else {
        replaceMainContent(html);
        if ((_d = event.state) == null ? void 0 : _d.scrollPosition) {
          window.scrollTo({
            top: event.state.scrollPosition,
            behavior: "instant"
          });
        }
      }
      nProgress.done();
    });
  }
}
function ElementIntersection(Alpine2) {
  Alpine2.directive(
    "intersect",
    Alpine2.skipDuringClone(
      (element, { value, expression, modifiers }, { evaluateLater, cleanup, effect }) => {
        const evaluate = evaluateLater(expression);
        const observerOptions = {
          rootMargin: getRootMargin(modifiers),
          threshold: getThreshold(modifiers) || 1e-6
        };
        let isVisibleRef = null;
        let observerTimeoutRef = null;
        let observer = new IntersectionObserver((entries) => {
          entries.forEach((entry) => {
            const newIsVisible = entry.isIntersecting;
            if (isVisibleRef === newIsVisible) {
              return;
            }
            if (observerTimeoutRef) {
              clearTimeout(observerTimeoutRef);
            }
            isVisibleRef = newIsVisible;
            element._x_visible = newIsVisible;
            if (newIsVisible === (value === "leave")) {
              return;
            }
            observerTimeoutRef = setTimeout(() => {
              isVisibleRef = newIsVisible;
              evaluate();
            }, getDelay(modifiers));
            modifiers.includes("once") && observer.disconnect();
          });
        }, observerOptions);
        let prevIsFocused = Alpine2.store("popup").isCurrentPopupFocused;
        effect(() => {
          const isFocused = Alpine2.store("popup").isCurrentPopupFocused;
          if (prevIsFocused !== isFocused) {
            prevIsFocused = isFocused;
            observer.unobserve(element);
            if (observerTimeoutRef) {
              clearTimeout(observerTimeoutRef);
            }
            observerTimeoutRef = setTimeout(() => {
              observerTimeoutRef = null;
              observer.observe(element);
            }, getDelay(modifiers));
          }
        });
        observer.observe(element);
        cleanup(() => {
          observer.disconnect();
        });
      }
    )
  );
}
function getThreshold(modifiers) {
  if (modifiers.includes("full")) return 0.99;
  if (modifiers.includes("half")) return 0.5;
  if (!modifiers.includes("threshold")) return 0;
  let threshold = modifiers[modifiers.indexOf("threshold") + 1];
  if (threshold === "100") return 1;
  if (threshold === "0") return 0;
  return Number(`.${threshold}`);
}
function getLengthValue(rawValue) {
  let match = rawValue.match(/^(-?[0-9]+)(px|%)?$/);
  return match ? match[1] + (match[2] || "px") : void 0;
}
function getRootMargin(modifiers) {
  const key = "margin";
  const fallback = "0px 0px 0px 0px";
  const index = modifiers.indexOf(key);
  if (index === -1) return fallback;
  let values = [];
  for (let i = 1; i < 5; i++) {
    values.push(getLengthValue(String(modifiers[index + i]) || ""));
  }
  values = values.filter((v) => v !== void 0);
  return values.length ? values.join(" ").trim() : fallback;
}
function getDelay(modifiers) {
  if (!modifiers.includes("delay")) return 300;
  let delay = modifiers[modifiers.indexOf("delay") + 1];
  return Number(delay);
}
const SELECTOR_LIST = "a, button, textarea, input, select, [role=radio][aria-checked]";
let trapInitial = null;
let trapStart = null;
let trapEnd = null;
let trapEls = [];
const RESIZABLE_ANIMATION_DURATION = 300;
function Accessibility(Alpine2) {
  Alpine2.directive(
    "a11y-trap",
    (el, { expression }, { evaluateLater, effect, cleanup }) => {
      const getIsTrapped = evaluateLater(expression);
      const onKeyDown = async (e) => {
        const focusEls = Array.from(el.querySelectorAll(SELECTOR_LIST)).filter(
          // Skip hidden elements
          (element) => {
            const computedStyle = window.getComputedStyle(element);
            return computedStyle.display !== "none";
          }
        );
        const allFocusEls = trapEls.concat(focusEls);
        const first = trapStart || allFocusEls[0];
        const last = trapEnd || allFocusEls[allFocusEls.length - 1];
        if (e.key !== TAB_KEY) {
          return;
        }
        if (e.shiftKey) {
          if (e.target === first) {
            last == null ? void 0 : last.focus();
            e.preventDefault();
          }
          return;
        }
        if (e.target === last) {
          first == null ? void 0 : first.focus();
          e.preventDefault();
        }
      };
      const trapFocus = () => {
        document.addEventListener("keydown", onKeyDown);
        el.setAttribute("role", "dialog");
        el.setAttribute("aria-modal", "true");
        const labelRef = el.querySelector("h1, h2, h3, h4, h5, p");
        if (labelRef) {
          labelRef.id = "popup-label";
          el.setAttribute("aria-labelledby", "popup-label");
        }
        const firstVisibleEl = Array.from(
          el.querySelectorAll(SELECTOR_LIST)
        ).find((element) => {
          const computedStyle = window.getComputedStyle(element);
          return computedStyle.display !== "none";
        });
        if (isMobile()) {
          return;
        }
        const first = trapStart || trapInitial || firstVisibleEl;
        first == null ? void 0 : first.focus();
      };
      effect(() => {
        getIsTrapped((trapped) => {
          if (!trapped) {
            return;
          }
          setTimeout(trapFocus, RESIZABLE_ANIMATION_DURATION);
          const observer = new MutationObserver(() => {
            if (el.querySelectorAll(SELECTOR_LIST).length) {
              setTimeout(trapFocus, RESIZABLE_ANIMATION_DURATION);
              observer.disconnect();
            }
          });
          observer.observe(el, { subtree: true, childList: true });
        });
      });
      cleanup(() => {
        document.removeEventListener("keydown", onKeyDown);
        el.removeAttribute("role");
        el.removeAttribute("aria-modal");
        el.removeAttribute("aria-labelledby");
      });
    }
  );
  Alpine2.directive(
    "a11y-trap-target",
    (el, { modifiers, expression }, { evaluateLater, effect, cleanup }) => {
      const getIsTrapped = evaluateLater(expression);
      effect(() => {
        getIsTrapped((trapped) => {
          if (trapped) {
            if (modifiers.includes("start")) {
              trapStart = el;
            } else if (modifiers.includes("end")) {
              trapEnd = el;
            } else if (modifiers.includes("initial")) {
              trapInitial = el;
            }
          } else {
            if (modifiers.includes("start") && trapStart === el) {
              trapStart = null;
            } else if (modifiers.includes("end") && trapEnd === el) {
              trapEnd = null;
            } else if (modifiers.includes("initial") && trapInitial === el) {
              trapInitial = null;
            }
          }
        });
      });
      cleanup(() => {
        if (modifiers.includes("start")) {
          trapStart = null;
        } else if (modifiers.includes("end")) {
          trapEnd = null;
        } else if (modifiers.includes("initial")) {
          trapInitial = null;
        }
      });
    }
  );
  Alpine2.directive(
    "a11y-trap-element",
    (el, { expression }, { evaluateLater, effect, cleanup }) => {
      const getIsActive = evaluateLater(expression);
      effect(() => {
        getIsActive((active) => {
          if (active) {
            if (!trapEls.includes(el)) {
              trapEls.push(el);
            }
          } else {
            if (trapEls.includes(el)) {
              trapEls.splice(trapEls.indexOf(el), 1);
            }
          }
        });
      });
      cleanup(() => {
      });
    }
  );
  Alpine2.directive("a11y-radio", (el, _, { cleanup }) => {
    const onKeyDown = (e) => {
      if (!e.target || !(e.target instanceof HTMLElement) || e.target.role !== "radio") {
        throw "x-a11y-radio can only be used on elements of 'radio' role";
      }
      if (e.key === " ") {
        e.preventDefault();
        return;
      }
      const isNext = e.key === "ArrowDown" || e.key === "ArrowRight";
      const isPrev = e.key === "ArrowUp" || e.key === "ArrowLeft";
      if (!isNext && !isPrev) return;
      e.preventDefault();
      const radioGroup = e.target.closest("[role=radiogroup]");
      if (!radioGroup) {
        throw "x-a11y-radio can only be used inside an element with 'radiogroup' role";
      }
      const radios = [...radioGroup.querySelectorAll("[role=radio]")];
      const currentRadio = e.target;
      const currentIndex = radios.indexOf(currentRadio);
      const nextIndex = currentIndex === radios.length - 1 ? 0 : currentIndex + 1;
      const prevIndex = currentIndex === 0 ? radios.length - 1 : currentIndex - 1;
      const newIndex = isNext ? nextIndex : prevIndex;
      const newRadio = radios[newIndex];
      newRadio.click();
      newRadio.focus();
    };
    el.addEventListener("keydown", onKeyDown);
    cleanup(() => {
      el.removeEventListener("keydown", onKeyDown);
    });
  });
}
const appendPaginationContent = (rawContent) => {
  const regex = /<!-- pagination-content -->([\s\S]*?)<!-- end-pagination-content -->/g;
  const content = rawContent.match(regex);
  const newContent = content ? content[0] : "";
  const el = document.querySelector("[data-content-wrapper]");
  const newElements = document.createElement("div");
  newElements.style.display = "contents";
  newElements.innerHTML = newContent;
  if (el) {
    el.appendChild(newElements);

    // Add fade-in animation to new product cards
    const productCards = newElements.querySelectorAll('.card-product, [data-product-card]');
    productCards.forEach((card, index) => {
      card.classList.add('product-card-new');
      // Stagger the animation for each card
      card.style.animationDelay = `${index * 0.1}s`;
    });

    const focusEl = newElements.querySelector(SELECTOR_LIST);
    if (focusEl) {
      focusEl.focus();
    }
  }
};
function Pagination(Alpine2) {
  let isPaginating = false;
  let currentPage = parseInt(
    new URLSearchParams(window.location.search).get("page") || "1"
  );
  Alpine2.directive(
    "pagination-trigger",
    (el, { expression }, { evaluate, cleanup }) => {
      const config = expression ? evaluate(expression) ?? {} : {};
      const lastPage = Number(config.lastPage) || 1;
      const autoLoad = Boolean(config.autoLoad);
      let observer = null;
      let fallbackListener = null;
      const loadNextPage = async () => {
        enableFadeInImages();
        if (isPaginating || currentPage >= lastPage) {
          return;
        }
        isPaginating = true;
        el.ariaBusy = "1";
        try {
          const nextPage = currentPage + 1;
          const nextUrl = `${window.location.pathname}?page=${nextPage}`;
          const fullUrl = window.location.pathname + window.location.search;
          const html = await fetchPage(nextUrl);
          appendPaginationContent(html);
          cachePage(fullUrl, document.documentElement.outerHTML);
          history.replaceState({ page: nextPage }, "", fullUrl);
          currentPage = nextPage;
          if (currentPage >= lastPage) {
            if (observer) {
              observer.disconnect();
            }
            el.remove();
          }
        } finally {
          isPaginating = false;
          el.ariaBusy = "0";
        }
      };
      const onClick = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        await loadNextPage();
      };
      el.addEventListener("click", onClick);
      if (autoLoad) {
        if ("IntersectionObserver" in window) {
          observer = new IntersectionObserver(
            (entries) => {
              entries.forEach((entry) => {
                if (entry.isIntersecting) {
                  loadNextPage();
                }
              });
            },
            { rootMargin: "200px" }
          );
          observer.observe(el);
        } else {
          const checkAndLoad = () => {
            const rect = el.getBoundingClientRect();
            if (rect.top - window.innerHeight <= 200 && rect.bottom >= 0) {
              loadNextPage();
            }
          };
          fallbackListener = () => {
            checkAndLoad();
          };
          window.addEventListener("scroll", fallbackListener, {
            passive: true
          });
          window.addEventListener("resize", fallbackListener);
          checkAndLoad();
        }
      }
      cleanup(() => {
        el.removeEventListener("click", onClick);
        if (observer) {
          observer.disconnect();
          observer = null;
        }
        if (fallbackListener) {
          window.removeEventListener("scroll", fallbackListener);
          window.removeEventListener("resize", fallbackListener);
          fallbackListener = null;
        }
        isPaginating = false;
        currentPage = parseInt(
          new URLSearchParams(window.location.search).get("page") || "1"
        );
      });
    }
  );
}
function Portal(Alpine2) {
  const placeInDom = (clone, target) => {
    target == null ? void 0 : target.appendChild(clone);
  };
  const getAllClones = () => {
    return Array.from(
      document.querySelectorAll("[data-from-portal]")
    );
  };
  const getAllTemplates = () => {
    return Array.from(
      document.querySelectorAll("[data-portal]")
    );
  };
  const getCurrentCloneFromTemplate = (template) => {
    return getAllClones().find((clone) => clone._x_teleportBack === template);
  };
  const getTarget = (template) => {
    const expression = template.getAttribute("x-portal") || "";
    let rawTarget = Alpine2.evaluate(template, expression);
    if (!rawTarget) {
      throw "No element provided to x-portal...";
    }
    if (!(rawTarget instanceof HTMLElement)) {
      console.warn(`Cannot find x-portal target for selector: "${expression}"`);
    }
    return rawTarget;
  };
  const initClone = (clone, targetEl, templateEl) => {
    try {
      templateEl._x_teleport = clone;
      clone._x_teleportBack = templateEl;
      clone._x_teleportTarget = targetEl;
      clone.setAttribute("data-from-portal", "true");
      templateEl.setAttribute("data-portal", "true");
      if (templateEl._x_forwardEvents) {
        templateEl._x_forwardEvents.forEach((eventName) => {
          clone.addEventListener(eventName, (e) => {
            e.stopPropagation();
            templateEl.dispatchEvent(new e.constructor(e.type, e));
          });
        });
      }
      Alpine2.addScopeToNode(clone, {}, templateEl);
      Alpine2.mutateDom(() => {
        placeInDom(clone, targetEl);
        Alpine2.initTree(clone);
        clone._x_ignore = true;
      });
    } catch (e) {
      console.log("Failed to init clone for", templateEl);
      console.trace();
    }
  };
  const createPortal = (templateEl) => {
    const targetEl = getTarget(templateEl);
    const oldClone = getCurrentCloneFromTemplate(templateEl);
    if (oldClone) {
      teleportClone(templateEl, oldClone);
      return;
    }
    const clone = templateEl.content.cloneNode(true).firstElementChild;
    initClone(clone, targetEl, templateEl);
  };
  function cloneWithCleanup(originalElement) {
    const doCleanup = (source) => {
      const cSource = source;
      if (cSource._x_currentIfEl) {
        cSource._x_currentIfEl.remove();
      }
      if (cSource._x_lookup) {
        Object.values(cSource._x_lookup).forEach((element) => {
          element.remove();
        });
      }
    };
    const recursivelyCloneChildren = (originalParent) => {
      const originalChildren = originalParent.children;
      for (let i = 0; i < originalChildren.length; i++) {
        doCleanup(originalChildren[i]);
        recursivelyCloneChildren(originalChildren[i]);
      }
    };
    recursivelyCloneChildren(originalElement);
    return originalElement.cloneNode(true);
  }
  const teleportClone = (templateEl, oldClone) => {
    const newClone = cloneWithCleanup(oldClone);
    const targetEl = getTarget(templateEl);
    initClone(newClone, targetEl, templateEl);
  };
  const observer = new MutationObserver(() => {
    getAllClones().forEach((clone) => {
      const templateEl = clone._x_teleportBack;
      if (templateEl) {
        const newTeleportTarget = Alpine2.evaluate(
          templateEl,
          templateEl.getAttribute("x-portal") || ""
        );
        if (!document.body.contains(templateEl)) {
          clone.remove();
          return;
        }
        if (newTeleportTarget !== clone._x_teleportTarget) {
          clone.remove();
          return;
        }
      } else {
        clone.remove();
        return;
      }
      if (!document.body.contains(clone)) {
        clone.remove();
      }
    });
    getAllTemplates().forEach((templateEl) => {
      const targetEl = templateEl._x_teleport;
      if (!targetEl) {
        return;
      }
      if (!document.body.contains(targetEl)) {
        createPortal(templateEl);
      }
    });
  });
  observer.observe(document.body, { childList: true, subtree: true });
  Alpine2.directive("portal", (rawEl, {}, { cleanup, effect }) => {
    if (rawEl.tagName.toLowerCase() !== "template")
      console.warn("x-portal can only be used on a <template> tag", rawEl);
    const templateEl = rawEl;
    createPortal(templateEl);
    effect(() => {
      const newTargetEl = getTarget(templateEl);
      const currentClone = getCurrentCloneFromTemplate(templateEl);
      const currentTarget = currentClone == null ? void 0 : currentClone._x_teleportTarget;
      if (newTargetEl !== currentTarget) {
        createPortal(templateEl);
      }
    });
    cleanup(() => {
      const clone = getCurrentCloneFromTemplate(templateEl);
      if (clone) {
        clone.remove();
      }
    });
  });
}
const TOP_VAR = "--scroll-top";
function StickyScroll(Alpine2) {
  Alpine2.directive(
    "sticky-scroll",
    (stickyElement, { expression }, { evaluate, cleanup }) => {
      const {
        container,
        top: topGap,
        bottom: bottomGap
      } = evaluate(expression);
      const scrollTarget = container instanceof HTMLElement ? container : document;
      const propertyTarget = container instanceof HTMLElement ? container : document.getElementById(
        "MainContent"
      );
      const getScrollTargetScrollY = () => {
        if (container instanceof HTMLElement) {
          return container.scrollTop;
        } else {
          return window.scrollY;
        }
      };
      const getHeightOfTarget = () => {
        return window.innerHeight;
      };
      const positionStickySidebar = () => {
        propertyTarget._x_endScroll = propertyTarget._x_screenHeight - stickyElement.offsetHeight - bottomGap;
        let stickyElementTop = parseInt(
          propertyTarget.style.getPropertyValue(TOP_VAR).replace("px", ""),
          10
        );
        if (propertyTarget._x_stickyElementHeight + topGap + bottomGap > propertyTarget._x_screenHeight) {
          if (getScrollTargetScrollY() < propertyTarget._x_currPos) {
            if (stickyElementTop < topGap) {
              propertyTarget.style.setProperty(
                TOP_VAR,
                `${stickyElementTop + propertyTarget._x_currPos - getScrollTargetScrollY()}px`
              );
            } else if (stickyElementTop >= topGap && stickyElementTop != topGap) {
              propertyTarget.style.setProperty(TOP_VAR, `${topGap}px`);
            }
          } else {
            if (stickyElementTop > propertyTarget._x_endScroll) {
              propertyTarget.style.setProperty(
                TOP_VAR,
                `${stickyElementTop + propertyTarget._x_currPos - getScrollTargetScrollY()}px`
              );
            } else if (stickyElementTop < propertyTarget._x_endScroll && stickyElementTop != propertyTarget._x_endScroll) {
              propertyTarget.style.setProperty(
                TOP_VAR,
                `${propertyTarget._x_endScroll}px`
              );
            }
          }
        } else {
          propertyTarget.style.setProperty(TOP_VAR, `${topGap}px`);
        }
        propertyTarget._x_currPos = getScrollTargetScrollY();
      };
      function updateSticky() {
        propertyTarget._x_screenHeight = getHeightOfTarget();
        propertyTarget._x_stickyElementHeight = stickyElement.offsetHeight;
        positionStickySidebar();
      }
      function onResize() {
        propertyTarget._x_currPos = getScrollTargetScrollY();
        updateSticky();
      }
      propertyTarget._x_endScroll = getHeightOfTarget() - stickyElement.offsetHeight - 500;
      propertyTarget._x_currPos = getScrollTargetScrollY();
      propertyTarget._x_screenHeight = getHeightOfTarget();
      propertyTarget._x_stickyElementHeight = stickyElement.offsetHeight;
      propertyTarget.style.setProperty(TOP_VAR, `${topGap.toString()}px`);
      propertyTarget._x_scroll_listener = updateSticky;
      propertyTarget._x_resize_listener = onResize;
      window.addEventListener("resize", propertyTarget._x_resize_listener);
      scrollTarget.addEventListener(
        "scroll",
        propertyTarget._x_scroll_listener,
        {
          capture: true,
          passive: true
        }
      );
      cleanup(() => {
        scrollTarget.removeEventListener(
          "scroll",
          propertyTarget._x_scroll_listener,
          {
            capture: true
          }
        );
        window.removeEventListener("resize", propertyTarget._x_resize_listener);
        propertyTarget._x_endScroll = 0;
        propertyTarget._x_currPos = 0;
        propertyTarget._x_screenHeight = 0;
        propertyTarget._x_stickyElementHeight = 0;
        propertyTarget.style.removeProperty(TOP_VAR);
      });
    }
  );
}
const POPUP_OVERLAY_CLICK_EVENT = "popup-overlay-click";
const POPUP_APPEARANCE_DURATION = 500;
let __popups = [];
const PopupStore = {
  currentPopup: null,
  isCurrentPopupFullScreen: false,
  isCurrentPopupFocused: false,
  originalFocusableEl: null,
  __currentPopupRef: null,
  __nextPopupRef: null,
  __popupHistory: [],
  __isNoRenderWhileHidingRef: false,
  __endOfHeaderHeight: 0,
  __popupContentHeight: 0,
  _nextPopup: null,
  _isPopupVisible: false,
  _isPopupSimple: false,
  _popupContentRatio: 0,
  _isMaxHeightReached: false,
  _isPopupContentHidden: false,
  __isKeyboardVisibleRef: false,
  __prevWindowHeightRef: 0,
  __mutationObserver: null,
  __attachedOverlayCallback: null,
  init() {
    Alpine.effect(() => {
      const currentPopupConfig = __popups.find(
        (popup) => popup.id === this.__currentPopupRef
      );
      const nextPopupConfig = __popups.find(
        (popup) => popup.id === this.__nextPopupRef
      );
      const isPopupContentHidden = this.__nextPopupRef !== null;
      const isPopupVisible = !!this.currentPopup;
      const isPopupFocused = !isPopupContentHidden ? currentPopupConfig == null ? void 0 : currentPopupConfig.isFocused : nextPopupConfig == null ? void 0 : nextPopupConfig.isFocused;
      const isPopupFullScreen = !isPopupContentHidden ? currentPopupConfig == null ? void 0 : currentPopupConfig.isFullScreen : nextPopupConfig == null ? void 0 : nextPopupConfig.isFullScreen;
      const isPopupSimple = !isPopupContentHidden ? currentPopupConfig && !isPopupFocused : nextPopupConfig && !isPopupFocused;
      const overlayCallback = !isPopupContentHidden ? currentPopupConfig == null ? void 0 : currentPopupConfig.overlayCallback : nextPopupConfig == null ? void 0 : nextPopupConfig.overlayCallback;
      const isMaxHeightReached = this.__popupContentHeight > this.__getWindowHeight() - this.__endOfHeaderHeight - 8 * 4;
      this.isCurrentPopupFocused = !!isPopupFocused;
      this.isCurrentPopupFullScreen = !!isPopupFullScreen;
      this._isPopupVisible = !!isPopupVisible;
      this._isPopupSimple = !!isPopupSimple;
      this._isMaxHeightReached = isMaxHeightReached;
      this._isPopupContentHidden = isPopupContentHidden;
      if (isPopupFocused) {
        if (!Alpine.store("main").isPrint) {
          freezeScroll();
        }
        this.__mutationObserver = new MutationObserver(() => {
          this.__updateScrollLockIfNeeded();
        });
        this.__mutationObserver.observe(
          document.getElementById("popup-content-portal"),
          {
            childList: true,
            subtree: true,
            attributeFilter: ["class"]
          }
        );
      } else {
        unfreezeScroll();
        if (this.__mutationObserver) {
          this.__mutationObserver.disconnect();
          this.__mutationObserver = null;
        }
      }
      if (!this._isMaxHeightReached) {
        Alpine.nextTick(() => {
          this.updateContentSize();
        });
      }
      setTimeout(() => {
        const popupContentRatio = (this.__popupContentHeight + 32) / 100;
        this._popupContentRatio = popupContentRatio;
      }, 0);
      if (overlayCallback) {
        this.__addOverlayCallback(overlayCallback);
      } else {
        this.__removeOverlayCallback();
      }
    });
  },
  _registerPopup(popup) {
    __popups.push(popup);
    if (popup.isAlwaysVisible) {
      this.showPopup(popup.id);
    }
  },
  _unregisterPopup(popup) {
    __popups = __popups.filter((p) => p.id !== popup.id);
    if (this.__popupHistory.includes(popup.id)) {
      this.hidePopup(popup.id);
    }
  },
  _updatePopupConfig(popup) {
    __popups = __popups.map((p) => {
      if (p.id === popup.id) {
        return popup;
      }
      return p;
    });
  },
  extendPopupConfig(popup) {
    const popupConfig = __popups.find((p) => p.id === popup.id);
    this._updatePopupConfig({
      ...popupConfig,
      ...popup
    });
  },
  async hideAllPopups() {
    if (!isMobile()) {
      return;
    }
    this.__isNoRenderWhileHidingRef = true;
    this.__currentPopupRef = null;
    if (this.__isNoRenderWhileHidingRef) {
      await this.__doSupportiveTransition();
    }
    if (this.__isNoRenderWhileHidingRef) {
      await this.updateContentSize();
    }
    if (this.__isNoRenderWhileHidingRef) {
      await new Promise((res) => {
        setTimeout(res, POPUP_APPEARANCE_DURATION / 4);
      });
    }
    if (this.__isNoRenderWhileHidingRef) {
      unfreezeScroll();
      this.currentPopup = null;
      this.__popupHistory = [];
    }
  },
  hideCurrentPopup() {
    var _a;
    if (!isMobile()) {
      return;
    }
    document.removeEventListener("keydown", this._onKeyDown);
    (_a = this.originalFocusableEl) == null ? void 0 : _a.focus();
    this.originalFocusableEl = null;
    const popup = this.__currentPopupRef;
    const popupConfig = __popups.find((p) => p.id === popup);
    if (popupConfig && popupConfig.isPreventOverlayClose) {
      return;
    }
    for (let i = this.__popupHistory.length - 1; i >= 0; i--) {
      if (this.__popupHistory[i] === popup) {
        this.__popupHistory.pop();
      } else {
        break;
      }
    }
    const lastPopup = this.__popupHistory[this.__popupHistory.length - 1];
    if (!lastPopup) {
      this.hideAllPopups();
      return;
    }
    this.showPopup(lastPopup);
  },
  __updatePopupHeight(popup) {
    if (popup) {
      this.__popupContentHeight = document.getElementById("popup-content-portal").getBoundingClientRect().height;
    } else {
      this.__popupContentHeight = 0;
    }
  },
  async __doSupportiveTransition(popup = null) {
    var _a;
    const start = ((_a = document.getElementById("end-of-header")) == null ? void 0 : _a.getBoundingClientRect().top) || 0;
    this.__endOfHeaderHeight = start;
    this.__updatePopupHeight(popup);
    this.__nextPopupRef = popup;
    this._nextPopup = popup;
    if (!popup || Alpine.store("main").isReducedMotion) {
      return;
    }
    await new Promise((resolve) => {
      document.getElementById("popup-content").addEventListener(
        "transitionstart",
        () => {
          resolve();
        },
        { once: true }
      );
    });
  },
  async showPopup(popup, isClosePrevious = true) {
    if (!isMobile()) {
      return;
    }
    this.originalFocusableEl = document.activeElement.closest(SELECTOR_LIST);
    document.addEventListener("keydown", this._onKeyDown.bind(this));
    if (this.__currentPopupRef) {
      const currentPopupConfig = __popups.find(
        (p) => p.id === this.__currentPopupRef
      );
      const nextPopupConfig = __popups.find((p) => p.id === popup);
      if (currentPopupConfig && currentPopupConfig.isFullScreen && (nextPopupConfig == null ? void 0 : nextPopupConfig.isFullScreen)) {
        this.__popupHistory.pop();
      }
    }
    if (!isClosePrevious && this.__currentPopupRef) {
      this.__popupHistory.unshift(popup);
      return;
    }
    const lastPopup = this.__popupHistory[this.__popupHistory.length - 1];
    if (lastPopup !== popup) {
      this.__popupHistory.push(popup);
    }
    const isAlreadyOpen = this.__currentPopupRef === popup;
    const popupConfig = __popups.find((p) => p.id === popup);
    if (!popupConfig) {
      return;
    }
    await Promise.resolve();
    this.__isNoRenderWhileHidingRef = false;
    if (!isAlreadyOpen) {
      await this.__doSupportiveTransition(popup);
    }
    const { isFocused } = popupConfig;
    if (isFocused) {
      freezeScroll();
      this.__mutationObserver = new MutationObserver(() => {
        this.__updateScrollLockIfNeeded();
      });
      this.__mutationObserver.observe(
        document.getElementById("popup-content-portal"),
        {
          childList: true,
          subtree: true
        }
      );
    } else {
      unfreezeScroll();
      if (this.__mutationObserver) {
        this.__mutationObserver.disconnect();
        this.__mutationObserver = null;
      }
    }
    try {
      Alpine.nextTick(() => {
        this.__updatePopupHeight(popup);
        this.__nextPopupRef = null;
        this.__currentPopupRef = popup;
        this.currentPopup = popup;
      });
    } catch (e) {
    }
  },
  _onKeyDown(e) {
    const isEscPressed = e.key === ESC_KEY;
    if (isEscPressed) {
      this.hideCurrentPopup();
    }
  },
  hidePopup(popup) {
    if (popup === this.__currentPopupRef) {
      this.hideCurrentPopup();
    }
  },
  __getWindowHeight() {
    if (this.__isKeyboardVisibleRef) {
      return this.__prevWindowHeightRef;
    }
    const newWindowHeight = window.visualViewport ? window.visualViewport.height : window.screen.availHeight;
    this.__prevWindowHeightRef = newWindowHeight;
    return newWindowHeight;
  },
  __updateScrollLockIfNeeded() {
    const contentPortal = document.getElementById("popup-content-portal");
    if (!contentPortal) {
      return;
    }
    const availableHeight = this.__getWindowHeight() - this.__endOfHeaderHeight - 8 * 4;
    const hasViewportOverflow = contentPortal.scrollHeight > availableHeight;
    const hasContentOverflow = contentPortal.scrollHeight - contentPortal.clientHeight > 1;
    if (hasViewportOverflow || hasContentOverflow) {
      makeElementScrollable(contentPortal);
    } else {
      makeElementNotScrollable();
    }
  },
  onPopupOverlayClick() {
    const event = new CustomEvent(POPUP_OVERLAY_CLICK_EVENT);
    document.dispatchEvent(event);
    this.hideCurrentPopup();
  },
  updateContentSize() {
    var _a;
    this.__updatePopupHeight(this.__currentPopupRef);
    this.__updateScrollLockIfNeeded();
    (_a = document.getElementById("popup-content-portal")) == null ? void 0 : _a.scrollTo({
      top: 0
    });
  },
  useOnPopupOverlayClick(popup, callback) {
    this.extendPopupConfig({ id: popup, overlayCallback: callback });
  },
  __addOverlayCallback(callback) {
    if (this.__attachedOverlayCallback && this.__attachedOverlayCallback !== callback) {
      this.__removeOverlayCallback();
    }
    if (!this.__attachedOverlayCallback) {
      document.addEventListener(POPUP_OVERLAY_CLICK_EVENT, callback);
      this.__attachedOverlayCallback = callback;
    }
  },
  __removeOverlayCallback() {
    if (this.__attachedOverlayCallback) {
      document.removeEventListener(
        POPUP_OVERLAY_CLICK_EVENT,
        this.__attachedOverlayCallback
      );
      this.__attachedOverlayCallback = null;
    }
  }
};
let _all = {};
const ResizableStore = {
  _current: {},
  originalFocusableEl: null,
  _keyDownEventListener: () => {
  },
  __observer: null,
  __onResize(entries) {
    for (const entry of entries) {
      const { id } = entry.target;
      if (!this._current[id]) {
        continue;
      }
      if (entry.contentBoxSize) {
        const { blockSize, inlineSize } = entry.contentBoxSize[0];
        this._current[id] = {
          width: inlineSize,
          height: blockSize
        };
        if (isDocumentFreezed && blockSize < entry.target.scrollHeight) {
          makeElementScrollable(document.getElementById(id));
        }
      }
    }
  },
  _maxHeight: window.innerHeight - 66,
  init() {
    this.__observer = new ResizeObserver(this.__onResize.bind(this));
    document.addEventListener("resize", () => {
      this._maxHeight = window.innerHeight - 66;
    });
  },
  _register(config) {
    _all[config.id] = config;
  },
  _unregister(areaId) {
    delete _all[areaId];
  },
  _onKeyDown(e, id) {
    const isEscPressed = e.key === ESC_KEY;
    if (isEscPressed) {
      this.hide(id);
    }
  },
  async show(id) {
    var _a;
    const config = _all[id];
    const isAlreadyOpen = Object.keys(this._current).length > 0;
    if (isAlreadyOpen) {
      Object.keys(this._current).forEach((id2) => {
        this.hide(id2);
      });
      await new Promise((resolve) => {
        setTimeout(resolve, 300);
      });
    }
    if (config) {
      const { width, height } = document.getElementById(id).getBoundingClientRect();
      this._current[id] = {
        width,
        height
      };
    }
    const resizable = document.getElementById(id);
    (_a = this.__observer) == null ? void 0 : _a.observe(resizable);
    this._keyDownEventListener = (e) => {
      this._onKeyDown(e, id);
    };
    document.addEventListener("keydown", this._keyDownEventListener);
    this.originalFocusableEl = document.activeElement.closest(SELECTOR_LIST);
  },
  hide(id) {
    var _a;
    const wrapperEl = document.querySelector(
      ".resizable--visible .resizable__content--portal"
    );
    if (wrapperEl) {
      wrapperEl.removeAttribute("role");
      wrapperEl.removeAttribute("aria-modal");
      wrapperEl.removeAttribute("aria-labelledby");
    }
    const resizable = document.getElementById(id);
    (_a = this.__observer) == null ? void 0 : _a.unobserve(resizable);
    delete this._current[id];
    document.removeEventListener("keydown", this._keyDownEventListener);
    resizable.closest(".resizable").addEventListener(
      "transitionend",
      () => {
        var _a2;
        (_a2 = this.originalFocusableEl) == null ? void 0 : _a2.focus();
      },
      { once: true }
    );
  },
  hideAll() {
    Object.keys(this._current).forEach((id) => {
      this.hide(id);
    });
  },
  isVisible(id = null) {
    const keys = Object.keys(this._current);
    if (id) {
      return keys.includes(id);
    }
    return keys.length;
  }
};
const ProductListStore = {
  isFiltersSidebarExpanded: true,
  toggleFiltersSidebar() {
    this.isFiltersSidebarExpanded = !this.isFiltersSidebarExpanded;
  }
};
const Main = {
  showCurrency: false,
  isHeaderShadowVisible: false,
  scaleFactor: 1,
  yOffset: 0,
  totalCartQty: 0,
  isMobile: isMobile(),
  isPrint: window.matchMedia("print").matches,
  isReducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  opacityOnZoom: 1,
  init() {
    this.setTransformValues();
    this.onResize();
    window.addEventListener("resize", this.onResize.bind(this));
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    mediaQuery.addEventListener("change", (e) => {
      this.isReducedMotion = e.matches;
    });
    const printQuery = window.matchMedia("print");
    printQuery.addEventListener("change", (e) => {
      this.isPrint = e.matches;
    });
  },
  onResize() {
    const newIsMobile = isMobile();
    if (this.isMobile !== newIsMobile) {
      Alpine.store("popup").currentPopup = null;
      Alpine.store("resizable")._current = {};
      unfreezeScroll();
    }
    this.isMobile = newIsMobile;
    document.documentElement.style.setProperty(
      "--screen-width",
      window.innerWidth.toString()
    );
    document.documentElement.style.setProperty(
      "--screen-height",
      window.innerHeight.toString()
    );
  },
  setTransformValues() {
    const desiredOffset = 8;
    const windowHeight = window.innerHeight;
    const windowWidth = window.innerWidth;
    const desiredEndWidth = windowWidth + desiredOffset * 2;
    const documentScrollHeight = document.body.scrollHeight;
    const widthScaleFactor = (desiredEndWidth - windowWidth) / windowWidth;
    const heightScaleFactor = (windowHeight - desiredOffset * 2) / windowHeight;
    const minScaleFactor = Math.min(widthScaleFactor, heightScaleFactor);
    const newScaleFactor = 1 + minScaleFactor;
    const newYOffset = documentScrollHeight * minScaleFactor * -1 * window.scrollY / documentScrollHeight;
    this.scaleFactor = newScaleFactor;
    this.yOffset = newYOffset;
  },
  getPrice(value) {
    var _a, _b, _c;
    const locale = ((_a = window == null ? void 0 : window.Shopify) == null ? void 0 : _a.locale) || "en";
    const currency = ((_c = (_b = window == null ? void 0 : window.Shopify) == null ? void 0 : _b.currency) == null ? void 0 : _c.active) || "USD";
    const displayedCurrency = this.showCurrency ? ` ${currency}` : "";
    const price = Number.isInteger(value) ? value / 100 : Number(value) || 0;
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(price) + displayedCurrency;
  },
  isPopupFocused() {
    return this.isMobile ? Alpine.store("popup").isCurrentPopupFocused : Object.keys(Alpine.store("resizable")._current).length > 0;
  },
  hideAllPopupsAndResizables() {
    Alpine.store("popup").onPopupOverlayClick();
    Alpine.store("resizable").hideAll();
  }
};
const CART_RESIZABLE_ID = "cart-desktop";
const CART_POPUP_ID = "cart";
const SECTION_MAIN_CART_ITEMS = "main-cart-items";
const ABORT_ERROR_NAME = "AbortError";
const CartStore = {
  cartType: "drawer",
  cartUrl: "",
  cartItems: [],
  discounts: [],
  isCartInitialized: false,
  isLoading: false,
  addingItemIds: [],
  removingItemKey: null,
  abortController: null,
  error: {
    message: void 0,
    errors: {}
  },
  setCartItems(cartItems) {
    this.cartItems = cartItems;
    Alpine.store("main").totalCartQty = cartItems.reduce(
      (total, item) => total + item.quantity,
      0
    );
  },
  addCartItems(cartItems) {
    this.setCartItems([...cartItems, ...this.cartItems]);
  },
  // Cart items returned from 'cart/add.js' and 'cart/update.js' AJAX calls have image SRCs with cdn.shopify.com base URL.
  // This method updates the image SRCs to make them consistent with the SRCs we already have in PDP
  processCartItems(items) {
    return items.map((item) => {
      var _a;
      return {
        ...item,
        image: (_a = item.image) == null ? void 0 : _a.replace(
          /^https:\/\/cdn\.shopify\.com\/s\/files\/(?:\d+\/)+files/,
          `//${window.Shopify.cdnHost}/shop/files`
        )
      };
    });
  },
  addToCart(itemProps) {
    const { id } = itemProps;
    if (!this.addingItemIds.includes(id)) {
      this.addingItemIds.push(id);
    }
    const formData = {
      items: [itemProps],
      sections: "header"
    };
    fetch(`${window.Shopify.routes.root}cart/add.js`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(formData)
    }).then((response) => response.json()).then((response) => {
      var _a;
      if (response.status === 422) {
        this.error.message = response.description;
        this.error.errors = response.errors;
        this.updateCart();
        return;
      }
      const items = this.processCartItems(response.items);
      this.addCartItems(items);
      if (this.cartType === "page") {
        navigateWithTransition(this.cartUrl);
        return;
      }
      this.focusInCart((_a = response.items[0]) == null ? void 0 : _a.key);
      this.error.message = "";
      this.error.errors = {};
      if (response.sections.header) {
        replaceContent(
          response.sections.header,
          "mini-cart",
          document.getElementById("mini-cart")
        );
      }
    }).catch((error) => console.error("Error:", error)).finally(() => {
      this.addingItemIds = this.addingItemIds.filter(
        (itemId) => itemId !== id
      );
    });
  },
  updateCartItem(key, qty) {
    if (this.abortController) {
      this.removingItemKey = null;
      this.abortController.abort();
    }
    this.isLoading = true;
    this.abortController = new AbortController();
    const cartItem = this.cartItems.find((item) => item.key === key);
    if (!cartItem) {
      return;
    }
    if (cartItem.quantity === 0) {
      cartItem.isDeleted = true;
      this.removingItemKey = key;
    }
    fetch(`${window.Shopify.routes.root}cart/update.js`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        updates: {
          [key]: qty
        },
        sections: SECTION_MAIN_CART_ITEMS
      }),
      signal: this.abortController.signal
    }).then((response) => response.json()).then((data) => {
      var _a;
      this.setDiscounts(
        (_a = data.cart_level_discount_applications) == null ? void 0 : _a.map((discount) => {
          var _a2, _b;
          return {
            title: (_a2 = discount.discount_application) == null ? void 0 : _a2.title,
            total_allocated_amount: (_b = discount.discount_application) == null ? void 0 : _b.total_allocated_amount
          };
        })
      );
      const items = this.processCartItems(data.items);
      this.setCartItems(items);
      this.isLoading = false;
      this.removingItemKey = null;
    }).catch((error) => {
      if (error.name !== ABORT_ERROR_NAME) {
        console.error("Error:", error);
        this.isLoading = false;
        this.removingItemKey = null;
      }
    });
  },
  updateCart() {
    if (this.abortController) {
      this.removingItemKey = null;
      this.abortController.abort();
    }
    this.isLoading = true;
    this.abortController = new AbortController();
    fetch(`${window.Shopify.routes.root}cart/update.js`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        updates: {},
        sections: SECTION_MAIN_CART_ITEMS
      }),
      signal: this.abortController.signal
    }).then((response) => response.json()).then((data) => {
      var _a;
      this.setDiscounts(
        (_a = data.cart_level_discount_applications) == null ? void 0 : _a.map((discount) => {
          var _a2, _b;
          return {
            title: (_a2 = discount.discount_application) == null ? void 0 : _a2.title,
            total_allocated_amount: (_b = discount.discount_application) == null ? void 0 : _b.total_allocated_amount
          };
        })
      );
      const items = this.processCartItems(data.items);
      this.setCartItems(items);
      this.isLoading = false;
      this.removingItemKey = null;
    }).catch((error) => {
      if (error.name !== ABORT_ERROR_NAME) {
        console.error("Error:", error);
        this.isLoading = false;
        this.removingItemKey = null;
      }
    });
  },
  increaseQty(key, openCart = false) {
    const cartItem = this.cartItems.find((item) => item.key === key);
    if (cartItem) {
      cartItem.quantity = Number(cartItem.quantity) + 1;
      this.updateCartItem(key, cartItem.quantity);
      if (openCart) {
        return this.focusInCart(key);
      }
    }
  },
  focusInCart(key) {
    this.cartItems.forEach((cartItem) => {
      const isFocused = cartItem.key === key;
      cartItem.focusedUntil = isFocused ? Date.now() + 2e3 : void 0;
    });
    this.showCart();
  },
  showCart() {
    if (Alpine.store("main").isMobile) {
      Alpine.store("popup").showPopup(CART_POPUP_ID, true);
    } else {
      Alpine.store("resizable").show(CART_RESIZABLE_ID);
    }
  },
  hideCart() {
    this._updateFocusAnimation();
    if (Alpine.store("main").isMobile) {
      Alpine.store("popup").hidePopup(CART_POPUP_ID);
    } else {
      Alpine.store("resizable").hide(CART_RESIZABLE_ID);
    }
  },
  decreaseQty(key, openCart = false) {
    const cartItem = this.cartItems.find((item) => item.key === key);
    if (cartItem) {
      cartItem.quantity = Number(cartItem.quantity) - 1;
      this.updateCartItem(key, cartItem.quantity);
      if (openCart) {
        return this.focusInCart(key);
      }
    }
  },
  setQty(quantity, key) {
    const cartItem = this.cartItems.find((item) => item.key === key);
    if (cartItem) {
      cartItem.quantity = Math.max(0, Number(quantity));
      this.updateCartItem(key, cartItem.quantity);
    }
  },
  setDiscounts(discounts) {
    this.discounts = discounts;
  },
  subtotalPrice() {
    const subtotalPrice = this.cartItems.reduce(
      (total, item) => total + item.final_price * item.quantity,
      0
    );
    return Alpine.store("main").getPrice(subtotalPrice);
  },
  totalPrice() {
    const subtotalPrice = this.cartItems.reduce(
      (total, item) => total + item.final_price * item.quantity,
      0
    );
    const discounts = this.discounts.reduce(
      (total, discount) => total + discount.total_allocated_amount,
      0
    );
    return Alpine.store("main").getPrice(subtotalPrice - discounts);
  },
  _updateFocusAnimation() {
    this.cartItems.forEach((cartItem) => {
      if (cartItem.focusedUntil) {
        cartItem.focusedUntil = Date.now() < cartItem.focusedUntil ? cartItem.focusedUntil : void 0;
      }
    });
  }
};
const BeforeAfter = (props) => ({
  wrapperRect: null,
  wrapperEl: null,
  exposure: 50,
  init() {
    const { id } = props;
    this.wrapperEl = document.getElementById(id);
    const computeWrapperRect = () => {
      if (!this.wrapperEl) {
        return;
      }
      const rect = this.wrapperEl.getBoundingClientRect();
      this.wrapperRect = rect;
    };
    window.addEventListener("resize", computeWrapperRect);
    computeWrapperRect();
    this.$watch("exposure", (value) => {
      if (!this.wrapperEl) {
        return;
      }
      this.wrapperEl.style.setProperty(
        "--exposure",
        `${100 - parseInt(value, 10)}%`
      );
    });
  },
  onPointerDown() {
    const move = (e) => {
      if (!this.wrapperEl || !this.wrapperRect) {
        return;
      }
      const x = e.clientX - this.wrapperRect.left;
      this.exposure = Math.min(
        100,
        Math.max(0, x / this.wrapperRect.width * 100)
      );
    };
    const up = () => {
      document.removeEventListener("pointermove", move);
      document.removeEventListener("pointerup", up);
    };
    document.addEventListener("pointermove", move);
    document.addEventListener("pointerup", up);
  },
  onKeyDown(e) {
    if (!this.wrapperEl) {
      return;
    }
    if (e.key === ARROW_RIGHT_KEY && this.exposure < 100) {
      this.exposure++;
      e.preventDefault();
    }
    if (e.key === ARROW_LEFT_KEY && this.exposure > 0) {
      this.exposure--;
      e.preventDefault();
    }
  }
});
const easeInOutQuad = (x) => {
  return x;
};
const OFFSET_TOP = window.innerHeight > 1080 ? 400 : 200;
let prevIsMobile = isMobile();
const TransitionPreview = () => ({
  isActive: false,
  lastSeenWithoutPreview: 0,
  offsetTop: OFFSET_TOP,
  maxScroll: OFFSET_TOP / 4 * 3,
  _scrollContainerRef: null,
  init() {
    Alpine.nextTick(() => {
      this._scrollContainerRef = this.$refs.scrollContainer;
    });
    window.addEventListener("pushstate", async (event) => {
      const { state } = event.detail;
      if (state == null ? void 0 : state.isPreview) {
        this.lastSeenWithoutPreview += 1;
        this.showPreview();
      } else {
        this.lastSeenWithoutPreview = 0;
        this.hidePreview();
      }
    });
    window.addEventListener("popstate", async (event) => {
      const { state } = event;
      if (state == null ? void 0 : state.isPreview) {
        this.lastSeenWithoutPreview -= 1;
        this.showPreview();
      } else {
        this.lastSeenWithoutPreview = 0;
        this.hidePreview();
      }
    });
    window.addEventListener("beforeunload", function() {
      const { isPreview } = window.history.state || {};
      if (isPreview) {
        history.replaceState({ isPreview: false }, "", window.location.href);
      }
    });
    this.$refs.scrollContainer.addEventListener("scroll", () => {
      const percentOfMaxScroll = Math.min(
        this.$refs.scrollContainer.scrollTop / this.maxScroll,
        1
      );
      this.$refs.preview.style.setProperty(
        "--scroll-progress",
        easeInOutQuad(percentOfMaxScroll).toString()
      );
    });
    window.addEventListener("resize", () => {
      if (prevIsMobile !== isMobile()) {
        this.hidePreview();
      }
    });
  },
  scrollToPreviewTop() {
    var _a;
    (_a = this._scrollContainerRef) == null ? void 0 : _a.scrollTo({
      top: this.maxScroll,
      behavior: "smooth"
    });
  },
  scrollToTop() {
    var _a;
    (_a = this._scrollContainerRef) == null ? void 0 : _a.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  },
  showPreview() {
    if (this.isActive) {
      this.scrollToPreviewTop();
      return;
    }
    this.isActive = true;
    Alpine.store("transition").isPreviewActive = true;
    this.scrollToTop();
    freezeScroll();
    makeElementScrollable(this._scrollContainerRef);
    document.addEventListener("keydown", this._onKeyDown.bind(this));
  },
  hidePreview() {
    if (!this.isActive) return;
    this.scrollToTop();
    this.isActive = false;
    Alpine.store("transition").isPreviewActive = false;
    if (this.lastSeenWithoutPreview) {
      history.go(-this.lastSeenWithoutPreview);
    }
    unfreezeScroll();
    setTimeout(() => {
      var _a;
      const wrapperEl = document.querySelector(".transition-preview");
      if (wrapperEl) {
        wrapperEl.removeAttribute("role");
        wrapperEl.removeAttribute("aria-modal");
        wrapperEl.removeAttribute("aria-labelledby");
      }
      document.getElementById("PreviewContent").innerHTML = "";
      (_a = Alpine.store("transition").originalFocusableEl) == null ? void 0 : _a.focus();
      Alpine.store("transition").originalFocusableEl = null;
    }, 300);
    document.removeEventListener("keydown", this._onKeyDown);
  },
  _onKeyDown(e) {
    const isEscPressed = e.key === ESC_KEY;
    if (isEscPressed) {
      const resizables = Alpine.store("resizable")._current;
      if (!Object.keys(resizables).length) {
        this.hidePreview();
      }
    }
  }
});
const SEARCH_QUERY_NAME = "q";
const ProductList = (...args) => {
  const [path] = args;
  return {
    isLoadingProducts: false,
    isMobile: window.innerWidth <= 767,
    _sidebarElement: null,
    _sidebarPlaceholder: null,
    _sidebarPlaceholderIsDynamic: false,
    _sidebarHeaderOffset: null,
    _sidebarBottomGap: null,
    _sidebarWidth: null,
    _sidebarMaxHeight: null,
    _sidebarContainer: null,
    _sidebarLayout: null,
    _boundScrollHandler: null,
    _scrollFrame: null,
    _boundResizeHandler: null,
    init() {
      this._fetchPage = this._fetchPage.bind(this);
      this._boundResizeHandler = this._handleResize.bind(this);
      window.addEventListener('resize', this._boundResizeHandler);
      this._setupMobileSidebar();
    },
    _setupMobileSidebar() {
      if (!this.isMobile) return;

      this.$nextTick(() => {
        this._applyMobileStickyFix();
        this._bindMobileScroll();
      });
    },
    _handleResize() {
      const wasMobile = this.isMobile;
      this.isMobile = window.innerWidth <= 767;

      if (wasMobile !== this.isMobile) {
        if (this.isMobile) {
          this._setupMobileSidebar();
        } else {
          this._cleanupMobileSidebar();
        }
      } else if (this.isMobile) {
        // Handle mobile resize
        this._applyMobileStickyFix();
      }
    },
    _applyMobileStickyFix() {
      if (!this.isMobile) return;

      const container = this.$refs?.ProductGridContainer || document.getElementById('ProductGridContainer');
      if (!container) return;

      const layout = container.querySelector('.collection-layout');
      const sidebar = layout ? layout.querySelector('.collection-sidebar') : null;
      if (!layout || !sidebar) return;

      const computedStyles = window.getComputedStyle(sidebar);
      const headerOffset =
        parseFloat(computedStyles.getPropertyValue('--collection-sidebar-offset')) ||
        (window.innerWidth <= 480 ? 65 : 70);
      const bottomGap =
        parseFloat(computedStyles.getPropertyValue('--collection-sidebar-bottom-gap')) ||
        (window.innerWidth <= 480 ? 12 : 16);
      const viewportHeight = window.innerHeight;

      // Calculate max-height for the sidebar
      const maxHeight = viewportHeight - headerOffset - bottomGap;

      // Get sidebar dimensions and position
      const sidebarRect = sidebar.getBoundingClientRect();
      const sidebarWidth = sidebarRect.width;

      // Store initial values
      this._sidebarElement = sidebar;
      this._sidebarHeaderOffset = headerOffset;
      this._sidebarBottomGap = bottomGap;
      this._sidebarWidth = sidebarWidth;
      this._sidebarMaxHeight = maxHeight;
      this._sidebarContainer = container;
      this._sidebarLayout = layout;

      // Ensure placeholder reference matches current DOM
      this._sidebarPlaceholder = null;
      this._sidebarPlaceholderIsDynamic = false;
      const placeholder = this._ensureSidebarPlaceholder();
      if (placeholder) {
        placeholder.style.display = 'none';
        placeholder.style.width = `${sidebarWidth}px`;
        placeholder.style.height = `${sidebar.offsetHeight}px`;
        placeholder.style.flexShrink = '0';
      }

      // Apply initial positioning
      this._updateMobileSidebarPosition();
    },
    _ensureSidebarPlaceholder() {
      if (!this._sidebarLayout || !this._sidebarElement) {
        return null;
      }

      if (this._sidebarPlaceholder) {
        if (!this._sidebarPlaceholder.parentNode) {
          this._sidebarLayout.insertBefore(this._sidebarPlaceholder, this._sidebarElement);
        }
        return this._sidebarPlaceholder;
      }

      const existing = this._sidebarLayout.querySelector('.collection-sidebar__placeholder');
      if (existing) {
        existing.style.display = 'none';
        this._sidebarPlaceholder = existing;
        this._sidebarPlaceholderIsDynamic = false;
        return existing;
      }

      const placeholder = document.createElement('div');
      placeholder.className = 'collection-sidebar__placeholder';
      placeholder.setAttribute('aria-hidden', 'true');
      placeholder.style.display = 'none';
      placeholder.style.visibility = 'hidden';
      placeholder.style.pointerEvents = 'none';
      placeholder.style.flexShrink = '0';
      this._sidebarLayout.insertBefore(placeholder, this._sidebarElement);
      this._sidebarPlaceholder = placeholder;
      this._sidebarPlaceholderIsDynamic = true;
      return placeholder;
    },
    _getScrollTop() {
      if (document.scrollingElement) {
        return document.scrollingElement.scrollTop;
      }
      if (typeof window.pageYOffset === 'number') {
        return window.pageYOffset;
      }
      if (document.documentElement && typeof document.documentElement.scrollTop === 'number') {
        return document.documentElement.scrollTop;
      }
      if (document.body && typeof document.body.scrollTop === 'number') {
        return document.body.scrollTop;
      }
      return 0;
    },
    _showSidebarPlaceholder(sidebarWidth, sidebarHeight) {
      const placeholder = this._ensureSidebarPlaceholder();
      if (!placeholder) {
        return null;
      }
      placeholder.style.display = 'block';
      placeholder.style.width = `${sidebarWidth}px`;
      placeholder.style.flexBasis = `${sidebarWidth}px`;
      placeholder.style.height = `${sidebarHeight}px`;
      placeholder.style.flexShrink = '0';
      return placeholder;
    },
    _hideSidebarPlaceholder(sidebarWidth, sidebarHeight) {
      if (!this._sidebarPlaceholder) {
        return;
      }
      if (Number.isFinite(sidebarWidth)) {
        this._sidebarPlaceholder.style.width = `${sidebarWidth}px`;
      }
      if (Number.isFinite(sidebarHeight)) {
        this._sidebarPlaceholder.style.height = `${sidebarHeight}px`;
      }
      this._sidebarPlaceholder.style.display = 'none';
    },
    _updateMobileSidebarPosition() {
      if (!this.isMobile) return;

      const sidebar = this._sidebarElement;
      const layout = this._sidebarLayout;
      if (!sidebar || !layout) return;

      const scrollTop = this._getScrollTop();
      const headerOffset = this._sidebarHeaderOffset || 70;
      const maxHeight = this._sidebarMaxHeight || 500;
      const sidebarRect = sidebar.getBoundingClientRect();
      const sidebarWidth = sidebarRect.width || sidebar.offsetWidth || this._sidebarWidth || sidebar.clientWidth;
      const sidebarHeight = sidebarRect.height || sidebar.offsetHeight || sidebar.scrollHeight;
      const layoutRect = layout.getBoundingClientRect();
      const layoutTop = layoutRect.top + scrollTop;
      const layoutBottom = layoutRect.bottom + scrollTop;
      this._sidebarWidth = sidebarWidth;

      const viewportTop = scrollTop + headerOffset;
      const viewportBottom = viewportTop + sidebarHeight;
      const beforeLayout = viewportTop <= layoutTop;

      if (beforeLayout) {
        this._hideSidebarPlaceholder(sidebarWidth, sidebarHeight);
        sidebar.style.position = '';
        sidebar.style.top = '';
        sidebar.style.left = '';
        sidebar.style.width = '';
        sidebar.style.maxHeight = `${maxHeight}px`;
        sidebar.style.zIndex = '';
        return;
      }

      const placeholder = this._showSidebarPlaceholder(sidebarWidth, sidebarHeight);
      const referenceRect = (placeholder || sidebar).getBoundingClientRect();
      const pastBottom = viewportBottom >= layoutBottom;
      const offsetTop = pastBottom ? layoutBottom - sidebarHeight - scrollTop : headerOffset;

      sidebar.style.position = 'fixed';
      sidebar.style.top = `${offsetTop}px`;
      sidebar.style.left = `${referenceRect.left}px`;
      sidebar.style.width = `${sidebarWidth}px`;
      sidebar.style.maxHeight = `${maxHeight}px`;
      sidebar.style.zIndex = '15';
    },
    _bindMobileScroll() {
      if (this._boundScrollHandler) return;

      this._boundScrollHandler = () => {
        if (!this.isMobile) return;
        
        if (this._scrollFrame) {
          cancelAnimationFrame(this._scrollFrame);
        }
        
        this._scrollFrame = requestAnimationFrame(() => {
          this._updateMobileSidebarPosition();
          this._scrollFrame = null;
        });
      };

      window.addEventListener('scroll', this._boundScrollHandler, { passive: true });
    },
    _unbindMobileScroll() {
      if (this._boundScrollHandler) {
        window.removeEventListener('scroll', this._boundScrollHandler);
        this._boundScrollHandler = null;
      }

      if (this._scrollFrame) {
        cancelAnimationFrame(this._scrollFrame);
        this._scrollFrame = null;
      }
    },
    _cleanupMobileSidebar() {
      this._unbindMobileScroll();

      const fallbackSidebar = this.$refs?.ProductGridContainer
        ? this.$refs.ProductGridContainer.querySelector('.collection-sidebar')
        : document.querySelector('.collection-sidebar');
      const sidebar = this._sidebarElement || fallbackSidebar;

      if (sidebar) {
        sidebar.style.position = '';
        sidebar.style.top = '';
        sidebar.style.left = '';
        sidebar.style.width = '';
        sidebar.style.maxHeight = '';
        sidebar.style.height = '';
        sidebar.style.zIndex = '';
      }

      // Reset placeholder
      this._hideSidebarPlaceholder();
      if (this._sidebarPlaceholder && this._sidebarPlaceholderIsDynamic && this._sidebarPlaceholder.parentNode) {
        this._sidebarPlaceholder.parentNode.removeChild(this._sidebarPlaceholder);
      }

      this._sidebarElement = null;
      this._sidebarPlaceholder = null;
      this._sidebarPlaceholderIsDynamic = false;
      this._sidebarHeaderOffset = null;
      this._sidebarBottomGap = null;
      this._sidebarWidth = null;
      this._sidebarMaxHeight = null;
      this._sidebarContainer = null;
      this._sidebarLayout = null;
      this._scrollFrame = null;
    },
    resetAll() {
      this._fetchPage(this._getSearchQueryString(), true);
      this.$dispatch("reset-filters");
    },
    _getSearchQuery() {
      return new URLSearchParams(window.location.search).get(SEARCH_QUERY_NAME) || "";
    },
    _getSearchQueryString() {
      const searchValue = this._getSearchQuery();
      return searchValue ? `?${SEARCH_QUERY_NAME}=${searchValue}` : "";
    },
    _fetchPage(queryString, isReset = false) {
      this.isLoadingProducts = true;
      fetch(`${path}${queryString}`).then((response) => response.text()).then((data) => {
        const resultHtml = document.createElement("div");
        resultHtml.innerHTML = data;
        const productGridHtml = resultHtml.querySelector(
          "#ProductGridContainer"
        );
        const productGridElem = this.$refs.ProductGridContainer;
        replaceElement(productGridElem, productGridHtml, isReset);
        if (this.isMobile) {
          this._cleanupMobileSidebar();
          this.$nextTick(() => {
            this._setupMobileSidebar();
          });
        }
        history.replaceState(
          history.state,
          "",
          queryString || location.pathname
        );
      }).catch((error) => console.error("Error:", error)).finally(() => this.isLoadingProducts = false);
    }
  };
};
const formatPrice = (price, currency) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency
  }).format(price);
};
const POPUP_FILTERS = "filters";
const POPUP_BOTTOM_FILTERS = "bottom-filters";
const FILTER_SORT = "sort_by";
const FILTER_PRICE = "Price";
const FILTER_PRICE_PARAM_NAME = "filter.v.price";
const FILTER_PRICE_MIN = "filter.v.price.gte";
const FILTER_PRICE_MAX = "filter.v.price.lte";
const Filters = (defaultSort, minPrice, maxPrice, currency) => ({
  currentName: "",
  searchQuery: "",
  isTopLevel: true,
  isTopFilterVisible: null,
  filters: [],
  sortOptions: [],
  // If the default sort option is selected, then this.sortBy will be false.
  // otherwise, this.sortBy will have the string value of the selected sort option.
  sortBy: false,
  init() {
    this.updateFilters = this.updateFilters.bind(this);
    this.onResetButtonClick = this.onResetButtonClick.bind(this);
    this.searchQuery = this._getSearchQuery();
    this.$watch("currentName", (value, oldValue) => {
      if (value != oldValue) {
        this.$nextTick(() => {
          setTimeout(() => {
            this.$store.popup.updateContentSize();
          }, 50);
        });
      }
    });
    this.$watch("isTopFilterVisible", (value) => {
      if (value) {
        this.$store.popup.hidePopup(POPUP_BOTTOM_FILTERS);
      } else {
        this.$store.popup.showPopup(POPUP_BOTTOM_FILTERS, false);
      }
    });
    this.$watch("$store.popup.currentPopup", (value) => {
      if (value === POPUP_BOTTOM_FILTERS && this.isTopFilterVisible) {
        this.$store.popup.hidePopup(POPUP_BOTTOM_FILTERS);
      }
    });
  },
  onResetButtonClick() {
    if (this.isTopLevel) {
      this.resetAll();
      this.hideFilters();
    } else {
      this.resetCurrent();
    }
  },
  showFilters(isTopLevel = true, currentName = "") {
    this.isTopLevel = isTopLevel;
    this.currentName = currentName;
    this.$store.popup.showPopup(POPUP_FILTERS, true);
  },
  hideFilters() {
    this.$store.popup.hidePopup(POPUP_FILTERS);
    this.isTopLevel = false;
    this.currentName = "";
  },
  getPriceFilter() {
    return this.filters.find((f) => f.param_name === FILTER_PRICE_PARAM_NAME);
  },
  getFormattedMinPrice() {
    return formatPrice(
      parseFloat(this.getPriceFilter().min_value.value),
      currency
    );
  },
  getFormattedMaxPrice() {
    return formatPrice(
      parseFloat(this.getPriceFilter().max_value.value),
      currency
    );
  },
  // Remove all of the selected filters from this.filters and this.sortBy
  // This function only changes the state data. so it only affects the UI.
  resetSelectedFiltersState() {
    this.filters.forEach((filter) => {
      if (filter.param_name === FILTER_PRICE_PARAM_NAME) {
        filter.min_value.value = "";
        filter.max_value.value = "";
      } else {
        filter.active_values = [];
      }
    });
    this.sortBy = false;
  },
  setSortBy(value) {
    this.sortBy = value || false;
    if (this.sortBy === defaultSort) {
      this.sortBy = false;
    }
  },
  getSelectedSortOption() {
    if (this.sortBy) {
      return this.sortOptions.find((option) => option.value === this.sortBy);
    } else {
      return this.sortOptions.find((option) => option.value === defaultSort);
    }
  },
  // Determine if a specific filter value is selected or not. For example it can be used to see if a filter checkbox/radio should be checked or not.
  getIsFilterValueSelected(param_name, value) {
    if (param_name === FILTER_SORT) {
      return this.getSelectedSortOption().value === value;
    } else {
      const filter = this.filters.find(
        (filter2) => filter2.param_name === param_name
      );
      const activeValue = filter == null ? void 0 : filter.active_values.find(
        (a) => a.value === value
      );
      return Boolean(activeValue);
    }
  },
  // Determine if a specific filter is selected or not. For example it can be used to check if "reset" button should be rendered or not.
  getIsFilterSelected(param_name) {
    if (param_name === FILTER_SORT) {
      return Boolean(this.sortBy);
    } else if (param_name === FILTER_PRICE_PARAM_NAME) {
      const priceFilter = this.getPriceFilter();
      return Boolean(priceFilter.min_value.value) || Boolean(priceFilter.max_value.value);
    } else {
      const filter = this.filters.find(
        (filter2) => filter2.param_name === param_name
      );
      return Boolean(filter == null ? void 0 : filter.active_values.length);
    }
  },
  // If there is no filter selected then isDefault is true otherwise it's false.
  getIsDefault() {
    let isDefault = true;
    this.filters.forEach((filter) => {
      if (filter.param_name === FILTER_PRICE_PARAM_NAME) {
        if (filter.min_value.value || filter.max_value.value) {
          isDefault = false;
        }
      } else {
        if (filter.active_values.length) {
          isDefault = false;
        }
      }
    });
    if (this.sortBy) {
      isDefault = false;
    }
    return isDefault;
  },
  updateFilters(removedAttr = {}) {
    const form = document.getElementById("FilterForm");
    const formData = new FormData(form);
    let urlParams = new URLSearchParams(formData);
    [...urlParams.entries()].forEach(([key, value]) => {
      if (this._isFilterEmptyOrDefault(key, value)) {
        urlParams.delete(key);
        return;
      }
      if (this._isFilterRemoved(key, value, removedAttr)) {
        const paramValues = urlParams.getAll(key);
        urlParams.delete(key);
        if (value && paramValues.length > 1) {
          paramValues.forEach((paramValue) => {
            if (paramValue !== value) {
              urlParams.append(key, paramValue);
            }
          });
        }
      }
    });
    urlParams.sort();
    const queryString = urlParams.toString() ? `?${urlParams.toString()}` : "";
    if (queryString === window.location.search) {
      return;
    }
    this.resetSelectedFiltersState();
    [...urlParams.entries()].forEach(([key, value]) => {
      var _a;
      if (key === FILTER_SORT) {
        this.setSortBy(value);
      } else if (key === FILTER_PRICE_MIN) {
        this.getPriceFilter().min_value.value = value;
      } else if (key === FILTER_PRICE_MAX) {
        this.getPriceFilter().max_value.value = value;
      } else {
        const filter = this.filters.find((f) => f.param_name === key);
        const label = ((_a = filter == null ? void 0 : filter.values.find(
          (v) => v.param_name === key && v.value === value
        )) == null ? void 0 : _a.label) || "";
        filter == null ? void 0 : filter.active_values.push({
          label,
          param_name: key,
          value
        });
      }
    });
    this._fetchPage(queryString, !!Object.keys(removedAttr).length);
    setTimeout(() => {
      window.scrollTo({
        top: 0,
        behavior: "smooth"
      });
    }, 300);
  },
  removeFilter(name, value = "") {
    this.updateFilters({ [name]: value });
    this.$dispatch("reset-filters", { name });
  },
  resetCurrent(filterWrapperId) {
    const filterWrapper = document.getElementById(
      filterWrapperId || `filter-${this.currentName.toLowerCase()}`
    );
    if (!filterWrapper) {
      return;
    }
    let removedAttr = {};
    Array.from(filterWrapper.getElementsByTagName("input")).forEach(
      (item) => {
        if (item.name && item.value && !removedAttr.hasOwnProperty(item.name)) {
          removedAttr[item.name] = "";
        }
      }
    );
    if (Object.keys(removedAttr).length) {
      this.updateFilters(removedAttr);
      this.$dispatch("reset-filters", { name: this.currentName });
    }
  },
  _isFilterEmptyOrDefault(key, value) {
    return !value || key === FILTER_SORT && value === String(defaultSort) || key === FILTER_PRICE_MIN && value === String(minPrice) || key === FILTER_PRICE_MAX && value === String(maxPrice);
  },
  _isFilterRemoved(key, value, removedAttr) {
    if (!(key in removedAttr)) {
      return false;
    }
    return !removedAttr[key] || value == removedAttr[key];
  }
});
const POPUP_BOTTOM_ACTIONS = "product_bottom_actions";
const ProductPage = () => ({
  isVariantInCart: false,
  variantQty: 1,
  selectedVariantId: void 0,
  selectedOptions: [],
  manuallySelectedVariantId: void 0,
  productId: void 0,
  contentId: "product-page",
  isSyncedWithUrl: true,
  isScrollingToTop: true,
  productUrl: "",
  sectionId: null,
  XRMediaModels: [],
  properties: {
    __shopify_send_gift_card_to_recipient: false,
    "Recipient email": null,
    "Recipient name": null,
    Message: null,
    "Send on": null
  },
  cartItemKey: void 0,
  variantsCount: null,
  _formRef: null,
  _mutationObserver: null,
  productActionsPopup: "product_actions",
  variants: [],
  variantsOptions: [],
  isVariantAvailable: true,
  setProductPageProps({
    manuallySelectedVariantId,
    selectedVariantId,
    selectedOptions,
    productId,
    productUrl,
    isSyncedWithUrl = false,
    isScrollingToTop = false,
    sectionId = null,
    XRMediaModels = [],
    variants = []
  }) {
    this.isVariantManuallySelected = !!manuallySelectedVariantId;
    this.selectedVariantId = selectedVariantId;
    this.selectedOptions = selectedOptions;
    this.productId = productId;
    this.productActionsPopup += `-${productId}`;
    this.productUrl = productUrl;
    this.isSyncedWithUrl = isSyncedWithUrl;
    this.isScrollingToTop = isScrollingToTop;
    this.sectionId = sectionId;
    this.XRMediaModels = XRMediaModels;
    this.variants = variants;
    this.variantsOptions = variants.map((variant) => variant.options);
    this.variantsCount = variants.length;
    if (sectionId) {
      this.productActionsPopup += `-${sectionId}`;
    }
    this._updateSelectedVariantCartState();
    if (this.XRMediaModels.length) {
      this.setupShopifyXR();
    }
  },
  get isProductBeingRemoved() {
    return Alpine.store("cart").removingItemKey === this.cartItemKey;
  },
  get isProductBeingAdded() {
    if (this.selectedVariantId) {
      return Alpine.store("cart").addingItemIds.includes(
        this.selectedVariantId
      );
    } else {
      return false;
    }
  },
  init() {
    var _a;
    (_a = window.Shopify.PaymentButton) == null ? void 0 : _a.init();
    this._formRef = this.$refs.ProductForm;
    this.$watch("$store.cart.cartItems", () => {
      this._updateSelectedVariantCartState();
    });
    this.$watch("properties", () => {
      if (!this.properties.__shopify_send_gift_card_to_recipient) {
        this.properties = {
          __shopify_send_gift_card_to_recipient: false,
          "Recipient email": null,
          "Recipient name": null,
          Message: null,
          "Send on": null
        };
      }
      this._updateSelectedVariantCartState();
    });
    Alpine.nextTick(() => {
      if (!this._formRef) {
        return;
      }
      this._mutationObserver = new MutationObserver((mutationList) => {
        for (const mutation of mutationList) {
          if (mutation.type === "childList") {
            this._updateSelectedVariantCartState();
            return;
          }
          if (mutation.target.nodeName === "INPUT" && mutation.target.name === "selling_plan") {
            this._updateSelectedVariantCartState();
          }
        }
      });
      this._mutationObserver.observe(this._formRef, {
        attributeFilter: ["value"],
        subtree: true,
        childList: true
      });
    });
    document.addEventListener(POPUP_OVERLAY_CLICK_EVENT, () => {
      if (this.$store.popup.currentPopup === this.productActionsPopup) {
        this._handleStickyProductActionsClosure();
      }
    });
  },
  setupShopifyXR() {
    window.Shopify.loadFeatures([
      {
        name: "shopify-xr",
        version: "1.0",
        onLoad: this.setupXRElements.bind(this)
      }
    ]);
  },
  setupXRElements(errors) {
    if (errors) return;
    if (!window.ShopifyXR) {
      document.addEventListener("shopify_xr_initialized", () => {
        this.setupXRElements();
      });
      return;
    }
    window.ShopifyXR.addModels(this.XRMediaModels);
    window.ShopifyXR.setupXRElements();
  },
  _updateSelectedVariantCartState() {
    if (!this.selectedVariantId) {
      return;
    }
    const cartItem = Alpine.store("cart").cartItems.find(
      this.checkIsItemInCart.bind(this)
    );
    this.isVariantInCart = !!cartItem;
    this.variantQty = (cartItem == null ? void 0 : cartItem.quantity) || 1;
    this.cartItemKey = cartItem == null ? void 0 : cartItem.key;
  },
  _updateSuitableBreedsDisplay(variantId) {
    const breedsDisplay = document.getElementById("suitable-breeds-display");
    if (!breedsDisplay) {
      return;
    }
    const breedsDataElement = document.getElementById("variant-breeds-data");
    if (!breedsDataElement) {
      return;
    }
    try {
      const breedsData = JSON.parse(breedsDataElement.textContent);
      const breedsContent = document.getElementById("breeds-content");
      const label = breedsDisplay.getAttribute("data-label") || "Suitable for";
      const variantBreeds = breedsData[variantId];
      if (breedsContent) {
        breedsDisplay.style.opacity = "0";
        setTimeout(() => {
          if (variantBreeds && variantBreeds !== "") {
            breedsContent.textContent = variantBreeds;
          } else {
            breedsContent.textContent = "Not specified";
          }
          breedsDisplay.style.opacity = "1";
        }, 100);
      }
    } catch (error) {
      console.error("Error updating suitable breeds display:", error);
    }
  },
  checkIsItemInCart(item) {
    var _a, _b;
    if (item.isDeleted) {
      return false;
    }
    if (item.id !== this.selectedVariantId) {
      return false;
    }
    const selling_plan = (_a = this._formRef) == null ? void 0 : _a.querySelector(
      "input[name=selling_plan]"
    );
    if (Number((selling_plan == null ? void 0 : selling_plan.value) || null) !== Number(((_b = item.selling_plan_allocation) == null ? void 0 : _b.selling_plan.id) || null)) {
      return false;
    }
    const isDifferentRecipient = Object.keys(this.properties).some((key) => {
      const value = this.properties[key];
      const valueToCheck = value === "" ? null : value;
      const itemProps = Object.keys(item.properties).length ? item.properties : {
        __shopify_send_gift_card_to_recipient: false,
        "Recipient email": null,
        "Recipient name": null,
        Message: null,
        "Send on": null
      };
      return itemProps[key] !== valueToCheck;
    });
    if (isDifferentRecipient) {
      return false;
    }
    return true;
  },
  async selectOptionAndSetVariantId(optionIndex, optionValue, variantId, variantImg) {
    var _a;
    if (!this.selectedOptions) {
      return;
    }
    this.selectedOptions[optionIndex] = optionValue;
    this.isVariantManuallySelected = true;
    this.isVariantAvailable = this.variantsOptions.some(
      (variant) => variant.every((option) => {
        var _a2;
        return (_a2 = this.selectedOptions) == null ? void 0 : _a2.includes(option);
      })
    );
    if (!this.isVariantAvailable) {
      const value = Object.values(this.selectedOptions)[0];
      const variant = this.variants.find((v) => v.option1 === value) || this.variants.find((v) => v.option2 === value) || this.variants.find((v) => v.option3 === value);
      variantId = variant.id;
    }
    if (this.selectedVariantId === variantId) {
      return;
    }
    this.selectedVariantId = variantId;
    this._updateSelectedVariantCartState();
    this._updateSuitableBreedsDisplay(variantId);
    if (this.variantsCount == 1) {
      return;
    }
    const nextUrl = new URL(this.productUrl, document.baseURI);
    nextUrl.searchParams.set("variant", variantId.toString());
    if (this.sectionId) {
      nextUrl.searchParams.set("section_id", this.sectionId);
    }
    nProgress.start();
    const nextPage = fetchPage(nextUrl.href);
    const html = await nextPage;
    const wrapper = document.getElementById(
      this.sectionId || this.contentId
    );
    wrapper.classList.add("disable-fade");
    Alpine.store("transition").pageData = {
      ...Alpine.store("transition").pageData,
      variantImg
    };
    replaceContent(
      html,
      this.sectionId || `${this.contentId}-content`,
      wrapper
    );
    if (this.isSyncedWithUrl) {
      history.replaceState(history.state, "", nextUrl.href);
    }
    if (this.isScrollingToTop) {
      this.scrollToTop();
    }
    (_a = window.Shopify.PaymentButton) == null ? void 0 : _a.init();
    nProgress.done();
  },
  toggleStickyProductActions(show) {
    if (this.$store.popup.currentPopup && this.$store.popup.currentPopup !== POPUP_BOTTOM_ACTIONS) {
      return;
    }
    if (!show) {
      this.$store.popup.hidePopup(POPUP_BOTTOM_ACTIONS);
    } else {
      this.$store.popup.showPopup(POPUP_BOTTOM_ACTIONS, true);
    }
  },
  decreaseQty() {
    if (!this.selectedVariantId && this.variantQty <= 0) {
      return;
    }
    this.variantQty -= 1;
    Alpine.store("cart").decreaseQty(this.cartItemKey);
  },
  increaseQty() {
    if (!this.selectedVariantId) {
      return;
    }
    this.variantQty += 1;
    Alpine.store("cart").increaseQty(this.cartItemKey);
  },
  setQuantity(quantity) {
    if (!this.selectedVariantId) {
      return;
    }
    this.variantQty = Math.max(0, Number(quantity));
    Alpine.store("cart").setQty(quantity, this.cartItemKey);
  },
  addToCart() {
    if (!this.selectedVariantId) {
      return;
    }
    const formData = new FormData(this._formRef);
    const formProps = Object.fromEntries(formData);
    this.hideProductActions();
    this.$store.cart.addToCart({
      ...formProps,
      id: this.selectedVariantId,
      quantity: this.variantQty,
      properties: this.properties
    });
  },
  hideProductActions() {
    this._handleStickyProductActionsClosure();
    // Close custom quick buy popup
    window.dispatchEvent(new CustomEvent('close-quick-buy-' + this.productActionsPopup));
  },
  _handleStickyProductActionsClosure() {
    const el = document.getElementById(
      "product-actions"
    );
    if (el && el._x_visible) {
      this.$store.popup.__popupHistory = this.$store.popup.__popupHistory.filter((p) => {
        return p !== POPUP_BOTTOM_ACTIONS;
      });
    }
  },
  showProductActions() {
    this.$store.popup.showPopup(this.productActionsPopup, true);
  },
  quickBuy(singleVariant) {
    if (singleVariant) {
      if (this.isVariantInCart) {
        return Alpine.store("cart").increaseQty(this.cartItemKey, true);
      }
      return this.$store.cart.addToCart({
        id: this.selectedVariantId,
        quantity: 1
      });
    }
    // Trigger custom quick buy popup
    window.dispatchEvent(new CustomEvent('open-quick-buy-' + this.productActionsPopup));
  },
  scrollToTop() {
    if (typeof this.scrollToPreviewTop !== "undefined") {
      this.scrollToPreviewTop();
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  },
  async fetchProductRecommendations(id, url) {
    const nextPage = fetchPage(url);
    const text = await nextPage;
    const html = document.createElement("div");
    html.innerHTML = text;
    const fallback = html.querySelector(`#${id}`);
    const wrapper = document.querySelector(`#${id}-wrapper`);
    if (fallback) {
      wrapper.remove();
      return;
    }
    const content = html.querySelector(`#${id}-wrapper`);
    wrapper.innerHTML = content == null ? void 0 : content.innerHTML;
  }
});
const Dropdown = () => ({
  isDropdownVisible: false,
  _dropdownWrapper: null,
  _onClick: (_event) => {
  },
  _onKeydown: (_event) => {
  },
  init() {
    Alpine.nextTick(() => {
      this._dropdownWrapper = this.$refs.DropdownWrapper;
    });
  },
  toggleDropdown() {
    if (this.isDropdownVisible) {
      this.hide();
    } else {
      this.show();
    }
  },
  show() {
    this.isDropdownVisible = true;
    this._onClick = (e) => {
      var _a;
      if (!((_a = this._dropdownWrapper) == null ? void 0 : _a.contains(e.target))) {
        this.hide();
      }
    };
    document.addEventListener("click", this._onClick);
    this._onKeydown = (e) => {
      const isEscPressed = e.key === ESC_KEY;
      if (isEscPressed) {
        this.hide();
      }
    };
    document.addEventListener("keydown", this._onKeydown);
  },
  hide() {
    this.isDropdownVisible = false;
    document.removeEventListener("click", this._onClick);
    document.removeEventListener("keydown", this._onKeydown);
  },
  search(value) {
    var _a;
    const options = (_a = this._dropdownWrapper) == null ? void 0 : _a.querySelectorAll("li a");
    options == null ? void 0 : options.forEach((option) => {
      const optionValue = option.outerText.toLowerCase();
      const match = optionValue.includes(value.toLowerCase());
      option.classList.toggle("hidden", !match);
    });
  }
});
const SEARCH_OPTIONS = {
  "resources[type]": "product,collection,query",
  "resources[limit]": "4",
  "resources[limit_scope]": "each"
};
const initialSearch = new URLSearchParams(window.location.search).get("q");
const Search = () => ({
  isLoading: false,
  searchTerm: initialSearch || "",
  searchTermInput: initialSearch || "",
  queries: [],
  products: [],
  categories: [],
  isNoResults: false,
  _defaultPlaceholder: "",
  _typewriterTimeout: null,
  _typewriterPhrases: [
    "Search for Festive Wear",
    "Search for Winter Wear",
    "Search for Dog Bedding",
    "Search for Dog's toys"
  ],
  _typewriterIndex: 0,
  _typewriterCharIndex: 0,
  _typewriterIsDeleting: false,
  _typewriterDelayForward: 110,
  _typewriterDelayBackward: 60,
  _typewriterPauseDuration: 1800,
  getIsSearchActive() {
    return !!this.searchTerm && (this.products.length || this.isNoResults);
  },
  init() {
    if (this.searchTerm) {
      this.search();
    }
    this.$watch("searchTerm", (value) => {
      if (value) {
        this.search();
      }
    });
    Alpine.nextTick(() => {
      this._setupTypewriter();
    });
  },
  setSearchTerm() {
    if (this.searchTerm.trim() !== this.searchTermInput.trim()) {
      this.isLoading = true;
    }
    this.searchTerm = this.searchTermInput.trim();
  },
  resetSearchTerm() {
    this.searchTermInput = "";
    this.setSearchTerm();
    this.isLoading = false;
  },
  search() {
    this.isLoading = true;
    const urlParams = new URLSearchParams(SEARCH_OPTIONS);
    urlParams.set("q", this.searchTerm);
    const searchQuery = urlParams.toString();
    fetch(`${window.Shopify.routes.root}search/suggest.json?${searchQuery}`).then((response) => response.json()).then((suggestions) => {
      this.queries = suggestions.resources.results.queries;
      this.products = suggestions.resources.results.products;
      this.categories = suggestions.resources.results.collections;
      this.isNoResults = !this.queries.length && !this.products.length && !this.categories.length;
    }).catch((error) => console.error("Error:", error)).finally(() => this.isLoading = false);
  },
  goToSearchPage(path) {
    if (!this.searchTermInput.trim()) {
      return;
    }
    navigateWithTransition(this.getSearchUrl(path), {
      type: "search",
      animate: true,
      data: {
        search: this.searchTermInput
      }
    });
  },
  getSearchUrl(path) {
    return this.searchTermInput ? `${path}?q=${encodeURIComponent(this.searchTermInput.trim())}` : path;
  },
  _setupTypewriter() {
    const input = this.$refs.searchInput;
    if (!input || !this._typewriterPhrases.length) {
      return;
    }
    this._defaultPlaceholder = input.getAttribute("data-default-placeholder") || input.getAttribute("placeholder") || "";
    const onFocus = () => {
      this._stopTypewriter(true);
    };
    const onBlur = () => {
      if (!this.searchTermInput) {
        this._startTypewriter();
      }
    };
    input.addEventListener("focus", onFocus);
    input.addEventListener("blur", onBlur);
    this.$watch("searchTermInput", (value) => {
      if (value) {
        this._stopTypewriter(true);
      } else if (document.activeElement !== input) {
        this._startTypewriter();
      }
    });
    if (!this.searchTermInput) {
      this._startTypewriter();
    }
  },
  _startTypewriter() {
    if (this._typewriterTimeout || this.searchTermInput) {
      return;
    }
    if (!this._defaultPlaceholder) {
      this._defaultPlaceholder = "";
    }
    this._typewriterTick();
  },
  _stopTypewriter(restoreDefault = false) {
    if (this._typewriterTimeout) {
      clearTimeout(this._typewriterTimeout);
      this._typewriterTimeout = null;
    }
    if (restoreDefault) {
      this._setPlaceholder(this._defaultPlaceholder);
    }
  },
  _typewriterTick() {
    const input = this.$refs.searchInput;
    if (!input) {
      return;
    }
    const phrase = this._typewriterPhrases[this._typewriterIndex] || "";
    if (!phrase) {
      return;
    }
    if (this._typewriterIsDeleting) {
      this._typewriterCharIndex = Math.max(this._typewriterCharIndex - 1, 0);
    } else {
      this._typewriterCharIndex = Math.min(this._typewriterCharIndex + 1, phrase.length);
    }
    const nextValue = phrase.slice(0, this._typewriterCharIndex);
    this._setPlaceholder(nextValue);
    let delay = this._typewriterIsDeleting ? this._typewriterDelayBackward : this._typewriterDelayForward;
    if (!this._typewriterIsDeleting && this._typewriterCharIndex === phrase.length) {
      delay = this._typewriterPauseDuration;
      this._typewriterIsDeleting = true;
    } else if (this._typewriterIsDeleting && this._typewriterCharIndex === 0) {
      delay = 400;
      this._typewriterIsDeleting = false;
      this._typewriterIndex = (this._typewriterIndex + 1) % this._typewriterPhrases.length;
    }
    this._typewriterTimeout = setTimeout(() => {
      this._typewriterTimeout = null;
      if (!this.searchTermInput && document.activeElement !== this.$refs.searchInput) {
        this._typewriterTick();
      } else {
        this._stopTypewriter(true);
      }
    }, delay);
  },
  _setPlaceholder(value) {
    const input = this.$refs.searchInput;
    if (!input) {
      return;
    }
    input.setAttribute("placeholder", value || " ");
  }
});
const Accordion = (isExpanded = false, duration = 0, onlyMobile = false) => ({
  _buttonRef: null,
  _panelRef: null,
  _iconRef: null,
  isExpanded: Boolean(isExpanded),
  duration: Number(duration),
  init() {
    if (onlyMobile && !Alpine.store("main").isMobile) {
      return;
    }
    this._initElements();
    Alpine.nextTick(() => {
      this._update();
      this.$watch("isExpanded", this._update.bind(this));
    });
  },
  _initElements() {
    this._buttonRef = this.$refs.AccordionButton;
    this._panelRef = this.$refs.AccordionPanel;
    this._iconRef = this.$refs.AccordionIcon;
    if (this._buttonRef) {
      this._buttonRef.addEventListener("click", this._toggle.bind(this));
    }
    if (this._panelRef) {
      this._panelRef.style.transitionDuration = `${this.duration}ms`;
    }
    if (this._iconRef) {
      this._iconRef.style.transitionProperty = "rotate";
      this._iconRef.style.transitionDuration = `${this.duration}ms`;
    }
  },
  _toggle() {
    this.isExpanded = !this.isExpanded;
  },
  _update() {
    if (this._panelRef) {
      this._panelRef.style.opacity = this.isExpanded ? "1" : "0";
      const containerMaxheight = this._panelRef.scrollHeight ? `${String(this._panelRef.scrollHeight)}px` : "10000px";
      this._panelRef.style.maxHeight = this.isExpanded ? containerMaxheight : "0";
    }
    if (this._iconRef) {
      this._iconRef.style.rotate = this.isExpanded ? "-180deg" : "";
    }
  }
});
const Address = () => ({
  renderedPage: "",
  address: {},
  province: null,
  deleteId: null,
  editId: null,
  _onKeyDown(e) {
    if (e.key === ESC_KEY) {
      this.hideForm();
    }
  },
  showForm(page, popup_id) {
    this.focusableEl = document.activeElement;
    document.addEventListener("keydown", this._onKeyDown.bind(this));
    this._updateProvince(this.$refs.address_country);
    if (Alpine.store("main").isMobile) {
      Alpine.store("popup").showPopup(popup_id, true);
      return;
    }
    this.renderedPage = page;
    this._focusOnForm(popup_id);
  },
  _focusOnForm(popup_id) {
    setTimeout(() => {
      var _a;
      const firstEl = (_a = document.querySelector(`#${popup_id}-desktop form`)) == null ? void 0 : _a.querySelector(
        "a, button, textarea, input:not([type=hidden]), select"
      );
      firstEl == null ? void 0 : firstEl.focus();
    }, 150);
  },
  hideForm() {
    document.removeEventListener("keydown", this._onKeyDown);
    this.renderedPage = "";
    this.address = {};
    this.deleteId = null;
    this.editId = null;
    setTimeout(() => {
      var _a;
      (_a = this.focusableEl) == null ? void 0 : _a.focus();
      this.focusableEl = null;
    }, 150);
  },
  updateCountry(e) {
    const country = e.target;
    this.address.country = country.selectedOptions[0].text;
    this._updateProvince(country);
  },
  _updateProvince(country) {
    Alpine.nextTick(() => {
      this.province = JSON.parse(
        (country == null ? void 0 : country.selectedOptions[0].dataset.provinces) || "[]"
      );
    });
  }
});
const isRTL = () => {
  return document.dir === "rtl" || document.documentElement.dir === "rtl";
};
const ANIMATION_DURATION = 300;
const RangeSlider = (min, max, minValue, maxValue) => ({
  isLeftThumbActive: false,
  isRightThumbActive: false,
  isResetting: false,
  min: Number(min),
  max: Number(max),
  minValue: Number(minValue),
  maxValue: Number(maxValue),
  onMinValueInput() {
    this.isLeftThumbActive = true;
    this.minValue = Math.min(this.minValue, this.maxValue - 1);
  },
  onMaxValueInput() {
    this.isRightThumbActive = true;
    this.maxValue = Math.max(this.maxValue, this.minValue + 1);
  },
  onValueChange() {
    this.isLeftThumbActive = false;
    this.isRightThumbActive = false;
    this.updateFilters();
  },
  onTrackClick(event) {
    const trackPosition = event.target.getBoundingClientRect();
    const clickPosition = event.pageX - trackPosition.left;
    const midpoint = this.minValue + (this.maxValue - this.minValue) / 2;
    const pxByUnit = (trackPosition.right - trackPosition.left) / (this.max - this.min);
    const clickedValue = Math.round(clickPosition / pxByUnit);
    this.isResetting = true;
    if (clickedValue > midpoint) {
      this.maxValue = clickedValue;
    } else {
      this.minValue = clickedValue;
    }
    setTimeout(() => {
      this.isResetting = false;
      this.onValueChange();
    }, ANIMATION_DURATION);
  },
  resetValues() {
    if (!this.$event.detail.name || this.$event.detail.name === FILTER_PRICE || this.$event.detail.name === FILTER_PRICE_MIN) {
      this.isResetting = true;
      this.minValue = this.min;
    }
    if (!this.$event.detail.name || this.$event.detail.name === FILTER_PRICE || this.$event.detail.name === FILTER_PRICE_MAX) {
      this.isResetting = true;
      this.maxValue = this.max;
    }
    setTimeout(() => {
      this.isResetting = false;
    }, ANIMATION_DURATION);
  },
  handleMinThumbKeydown(event) {
    const rtlMode = isRTL();
    switch (event.key) {
      case "ArrowLeft":
        if (rtlMode) {
          if (this.minValue < this.max) {
            this.minValue++;
          }
        } else {
          if (this.minValue > this.min) {
            this.minValue--;
          }
        }
        break;
      case "ArrowRight":
        if (rtlMode) {
          if (this.minValue > this.min) {
            this.minValue--;
          }
        } else {
          if (this.minValue < this.max) {
            this.minValue++;
          }
        }
        break;
      case "ArrowDown":
        this.minValue = this.min;
        break;
      case "ArrowUp":
        this.minValue = this.max;
        break;
      case "Enter":
        this.onValueChange();
        break;
    }
  },
  handleMaxThumbKeydown(event) {
    const rtlMode = isRTL();
    switch (event.key) {
      case "ArrowLeft":
        if (rtlMode) {
          if (this.maxValue < this.max) {
            this.maxValue++;
          }
        } else {
          if (this.maxValue > this.min) {
            this.maxValue--;
          }
        }
        break;
      case "ArrowRight":
        if (rtlMode) {
          if (this.maxValue > this.min) {
            this.maxValue--;
          }
        } else {
          if (this.maxValue < this.max) {
            this.maxValue++;
          }
        }
        break;
      case "ArrowDown":
        this.maxValue = this.min;
        break;
      case "ArrowUp":
        this.maxValue = this.max;
        break;
      case "Enter":
        this.onValueChange();
        break;
    }
  },
  updateFilters() {
  }
});
const Slider = () => ({
  isPrevBtnDisabled: true,
  isNextBtnDisabled: false,
  currentSlideIndex: 1,
  resizeObserver: null,
  slideWidth: null,
  config: {},
  autoplayInterval: null,
  debouncedHandleManualScroll: () => {
  },
  configureAndStart(config) {
    this.config = config;
    this.start();
    this.play();
  },
  play() {
    const { isAutoplay, autoplaySpeed = 5e3 } = this.config;
    if (!isAutoplay) {
      return;
    }
    if (this.autoplayInterval) {
      window.clearInterval(this.autoplayInterval);
    }
    this.autoplayInterval = window.setInterval(() => {
      if (this.currentSlideIndex < this.$refs.slider.childElementCount) {
        this.goToSlide(this.currentSlideIndex + 1);
      } else {
        this.goToSlide(1);
      }
    }, autoplaySpeed);
  },
  start() {
    const debouncedResizeHandler = Alpine.debounce(() => {
      this.updateCachedValues();
      this.handleManualScroll();
    }, 100);
    this.updateCachedValues();
    this.resizeObserver = new ResizeObserver(debouncedResizeHandler);
    this.resizeObserver.observe(this.$refs.slider);
    this.debouncedHandleManualScroll = Alpine.debounce(() => {
      this.handleManualScroll();
    }, 100);
    this.debouncedHandleManualScroll();
    const { gap } = this.config;
    const proxScrollTarget = (this.currentSlideIndex - 1) * ((this.slideWidth || 1) + gap);
    this.setScrollLeft(proxScrollTarget);
  },
  destroy() {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
  },
  updateCachedValues() {
    if (!this.$refs.slider) {
      return;
    }
    if (this.$refs.slider.childElementCount) {
      this.slideWidth = this.$refs.slider.children[0].offsetWidth;
    }
  },
  goToSlide(index, focus = false) {
    const { gap } = this.config;
    const maxIndex = this.$refs.slider.childElementCount;
    const validIndex = Math.max(1, Math.min(index, maxIndex));
    const proxScrollTarget = (validIndex - 1) * ((this.slideWidth || 1) + gap);
    this.setScrollLeft(proxScrollTarget);
    if (focus) {
      setTimeout(
        () => {
          const slide = this.$refs.slider.children[index - 1].querySelector(
            SELECTOR_LIST
          );
          slide.focus();
        },
        Alpine.store("main").isReducedMotion ? 0 : 500
      );
    }
    this.currentSlideIndex = validIndex;
  },
  showNextSlide() {
    const nextIndex = this.currentSlideIndex + Math.floor(this.getSlidesAmountInView()) <= this.$refs.slider.childElementCount ? this.currentSlideIndex + Math.floor(this.getSlidesAmountInView()) : this.$refs.slider.childElementCount;
    this.goToSlide(nextIndex);
    this.play();
  },
  showPrevSlide() {
    const prevIndex = this.currentSlideIndex - Math.floor(this.getSlidesAmountInView()) >= 1 ? this.currentSlideIndex - Math.floor(this.getSlidesAmountInView()) : 1;
    this.goToSlide(prevIndex);
    this.play();
  },
  handleManualScroll() {
    if (!this.$refs.slider) {
      return;
    }
    const { gap } = this.config;
    const containerScrollLeft = this.getScrollLeft();
    const currentSlideIndex = Math.ceil(containerScrollLeft / ((this.slideWidth || 1) + gap)) + 1;
    this.currentSlideIndex = currentSlideIndex;
    this.isNextBtnDisabled = currentSlideIndex > Math.ceil(
      this.$refs.slider.childElementCount - this.getSlidesAmountInView()
    );
    this.isPrevBtnDisabled = currentSlideIndex <= 1;
  },
  getSlidesAmountInView() {
    const {
      slidesAmountInView: { xs, sm, md, lg, xl, xxl }
    } = this.config;
    const viewWidth = Math.max(
      document.documentElement.clientWidth || 0,
      window.innerWidth || 0
    );
    const screenSm = 640;
    const screenMd = 768;
    const screenLg = 1024;
    const screenXl = 1280;
    const screen2xl = 1536;
    if (viewWidth >= screen2xl) {
      return xxl;
    }
    if (viewWidth >= screenXl) {
      return xl;
    }
    if (viewWidth >= screenLg) {
      return lg;
    }
    if (viewWidth >= screenMd) {
      return md;
    }
    if (viewWidth >= screenSm) {
      return sm;
    }
    return xs;
  },
  getScrollLeft() {
    if (!isRTL()) {
      return this.$refs.slider.scrollLeft;
    }
    const scrollLeft = this.$refs.slider.scrollLeft;
    const scrollWidth = this.$refs.slider.scrollWidth;
    const clientWidth = this.$refs.slider.clientWidth;
    if (scrollLeft <= 0) {
      return Math.abs(scrollLeft);
    } else {
      return scrollWidth - clientWidth - scrollLeft;
    }
  },
  setScrollLeft(position) {
    if (!isRTL()) {
      this.$refs.slider.scrollTo({
        left: position,
        behavior: Alpine.store("main").isReducedMotion ? "instant" : "smooth"
      });
      return;
    }
    const scrollWidth = this.$refs.slider.scrollWidth;
    const clientWidth = this.$refs.slider.clientWidth;
    const testScroll = this.$refs.slider.scrollLeft;
    let rtlPosition;
    if (testScroll <= 0) {
      rtlPosition = -position;
    } else {
      rtlPosition = scrollWidth - clientWidth - position;
    }
    this.$refs.slider.scrollTo({
      left: rtlPosition,
      behavior: Alpine.store("main").isReducedMotion ? "instant" : "smooth"
    });
  }
});
const CountdownTimer = (targetDateString = "", isInfinite = false, remainingChunk = {
  days: 0,
  hours: 0,
  minutes: 0,
  seconds: 0
}) => ({
  targetDateString,
  isLoaded: false,
  isFinished: false,
  isInfinite,
  remainingChunk,
  init() {
    let target = new Date(this.targetDateString);
    const now = /* @__PURE__ */ new Date();
    let remainingTime = Number(target) - Number(now);
    if (this.isInfinite) {
      while (target < now) {
        target = new Date(target.setDate(target.getDate() + 14));
        remainingTime = Number(target) - Number(now);
      }
    }
    if (remainingTime <= 0) {
      this.isFinished = true;
      this.isLoaded = true;
      this.remainingChunk = {
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0
      };
      return;
    }
    this.isLoaded = true;
    var timerId = setInterval(() => {
      const now2 = /* @__PURE__ */ new Date();
      const remainingTime2 = Number(target) - Number(now2);
      if (remainingTime2 <= 0) {
        clearInterval(timerId);
        this.isFinished = true;
      } else {
        this.remainingChunk = {
          days: Math.floor(remainingTime2 / (1e3 * 60 * 60 * 24)),
          hours: Math.floor(remainingTime2 / (1e3 * 60 * 60) % 24),
          minutes: Math.floor(remainingTime2 / 1e3 / 60 % 60),
          seconds: Math.floor(remainingTime2 / 1e3 % 60)
        };
      }
    }, 1e3);
  }
});
const TransitionImage = (props) => ({
  src: "",
  isImgLoaded: false,
  init() {
    if (!this.src) {
      this.isImgLoaded = true;
    }
    this.src = props.src;
    const { imageId: mainImageId } = props;
    const mainImage = document.getElementById(mainImageId);
    if (!mainImage) {
      return;
    }
    if (mainImage.complete) {
      this.isImgLoaded = true;
    } else {
      mainImage.addEventListener(
        "load",
        () => {
          this.isImgLoaded = true;
        },
        { once: true }
      );
    }
  }
});
const ZOOM_RATIO = 2;
const minScale = 1;
const maxScale = 3;
const getDistance = (touch1, touch2) => {
  const dx = touch1.clientX - touch2.clientX;
  const dy = touch1.clientY - touch2.clientY;
  return Math.sqrt(dx * dx + dy * dy);
};
const productCarousel = () => ({
  currentSlide: 0,
  totalSlides: 0,
  // touch state
  touchStartX: null,
  touchStartY: null,
  touchDeltaX: 0,
  isSwiping: false,

  init() {
    // Calculate total slides from child elements
    const container = this.$el.querySelector('.flex');
    if (container) {
      this.totalSlides = container.children.length;
    }

    // Add keyboard navigation
    document.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') {
        this.prevSlide();
      } else if (e.key === 'ArrowRight') {
        this.nextSlide();
      }
    });
  },

  onTouchStart(event) {
    if (!event.touches || event.touches.length !== 1) return;
    this.touchStartX = event.touches[0].clientX;
    this.touchStartY = event.touches[0].clientY;
    this.touchDeltaX = 0;
    this.isSwiping = true;
  },

  onTouchMove(event) {
    if (!this.isSwiping || !event.touches || event.touches.length !== 1) return;
    const currentX = event.touches[0].clientX;
    const currentY = event.touches[0].clientY;
    const dx = currentX - this.touchStartX;
    const dy = currentY - this.touchStartY;
    // Only treat as horizontal swipe if horizontal movement dominates
    if (Math.abs(dx) > Math.abs(dy)) {
      // Prevent the page from scrolling while swiping horizontally
      event.preventDefault();
      this.touchDeltaX = dx;
    } else {
      // vertical scroll - cancel swipe
      this.isSwiping = false;
      this.touchDeltaX = 0;
    }
  },

  onTouchEnd() {
    if (!this.isSwiping) return;
    const threshold = 50; // px to trigger slide
    if (this.touchDeltaX <= -threshold) {
      this.nextSlide();
    } else if (this.touchDeltaX >= threshold) {
      this.prevSlide();
    }
    this.isSwiping = false;
    this.touchStartX = null;
    this.touchStartY = null;
    this.touchDeltaX = 0;
  },

  nextSlide() {
    if (this.currentSlide < this.totalSlides - 1) {
      this.currentSlide++;
    }
  },

  prevSlide() {
    if (this.currentSlide > 0) {
      this.currentSlide--;
    }
  },

  goToSlide(index) {
    this.currentSlide = index;
  }
});

const ImageZoom = () => ({
  previousTouches: null,
  scale: 1,
  translate: { x: 0, y: 0 },
  resetTimeoutRef: null,
  reset: false,
  init() {
    this.$watch("scale", () => {
      Alpine.store("main").opacityOnZoom = Math.max(2 - this.scale, 0);
    });
  },
  zoomImage(e) {
    if (Alpine.store("main").isMobile) {
      return;
    }
    const img = e.currentTarget.querySelector(
      "img:not(.transition-image)"
    );
    const overlayImage = document.createElement("img");
    overlayImage.setAttribute("src", img.src);
    const overlay = document.createElement("div");
    overlay.setAttribute("class", "zoomed-img");
    overlay.setAttribute("aria-hidden", "true");
    overlay.style.backgroundImage = `url('${img.src}')`;
    overlayImage.onload = () => {
      img.parentElement.insertBefore(overlay, img);
    };
    overlay.onclick = (event) => {
      event.stopPropagation();
      overlay.remove();
    };
    overlay.onmousemove = (event) => this.moveWithHover(img, event, overlay);
    overlay.onmouseleave = () => overlay.remove();
    this.moveWithHover(img, e, overlay);
  },
  moveWithHover(img, event, overlay) {
    const ratio = img.height / img.width;
    const container = event.currentTarget.getBoundingClientRect();
    const xPosition = event.clientX - container.left;
    const yPosition = event.clientY - container.top;
    const xPercent = `${xPosition / (img.clientWidth / 100)}%`;
    const yPercent = `${yPosition / (img.clientWidth * ratio / 100)}%`;
    overlay.style.backgroundPosition = `${xPercent} ${yPercent}`;
    overlay.style.backgroundSize = `${img.width * ZOOM_RATIO}px`;
  },
  onTouchStart(event) {
    if (event.touches.length === 2) {
      event.preventDefault();
      this.previousTouches = event.touches;
    }
  },
  onTouchMove(event) {
    if (event.touches.length === 2 && this.previousTouches) {
      event.preventDefault();
      const newDistance = getDistance(event.touches[0], event.touches[1]);
      const oldDistance = getDistance(
        this.previousTouches[0],
        this.previousTouches[1]
      );
      const scaleChange = newDistance / oldDistance;
      const newScale = Math.min(
        maxScale,
        Math.max(minScale, this.scale * scaleChange)
      );
      const midPoint = {
        x: (event.touches[0].clientX + event.touches[1].clientX) / 2,
        y: (event.touches[0].clientY + event.touches[1].clientY) / 2
      };
      const previousMidPoint = {
        x: (this.previousTouches[0].clientX + this.previousTouches[1].clientX) / 2,
        y: (this.previousTouches[0].clientY + this.previousTouches[1].clientY) / 2
      };
      const movementX = midPoint.x - previousMidPoint.x;
      const movementY = midPoint.y - previousMidPoint.y;
      if (event.currentTarget) {
        const rect = event.currentTarget.getBoundingClientRect();
        const xCenter = (rect.left + rect.right) / 2;
        const yCenter = (rect.top + rect.bottom) / 2;
        const xDiff = midPoint.x - xCenter;
        const yDiff = midPoint.y - yCenter;
        const scalingTranslateX = (this.translate.x - xDiff) * (newScale / this.scale) + xDiff;
        const scalingTranslateY = (this.translate.y - yDiff) * (newScale / this.scale) + yDiff;
        this.translate = {
          x: scalingTranslateX + movementX,
          y: scalingTranslateY + movementY
        };
      }
      this.scale = newScale;
      this.reset = false;
      this.previousTouches = event.touches;
    }
  },
  onTouchEnd() {
    this.previousTouches = null;
    this.resetAfterDelay();
  },
  onWheel(event) {
    if (!event.ctrlKey) {
      return;
    }
    event.preventDefault();
    const scaleChange = 1 - event.deltaY * 0.01;
    const newScale = Math.min(
      maxScale,
      Math.max(minScale, this.scale * scaleChange)
    );
    if (event.currentTarget) {
      const rect = event.currentTarget.getBoundingClientRect();
      const xCenter = (rect.left + rect.right) / 2;
      const yCenter = (rect.top + rect.bottom) / 2;
      const xDiff = event.clientX - xCenter;
      const yDiff = event.clientY - yCenter;
      const translateX = (this.translate.x - xDiff) * (newScale / this.scale) + xDiff;
      const translateY = (this.translate.y - yDiff) * (newScale / this.scale) + yDiff;
      this.translate = { x: translateX, y: translateY };
    }
    this.scale = newScale;
    this.reset = false;
    this.resetAfterDelay(true);
  },
  resetAfterDelay(wheel = false) {
    if (this.resetTimeoutRef !== null) {
      clearTimeout(this.resetTimeoutRef);
    }
    this.resetTimeoutRef = window.setTimeout(
      () => {
        this.scale = 1;
        this.translate = { x: 0, y: 0 };
        this.reset = true;
      },
      wheel ? 300 : 0
    );
  }
});
let Sunrise = {
  updateQuantity(line, qty) {
    fetch("/cart/change.js", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quantity: qty, line })
    }).then((response) => response.json()).then((data) => {
      window.dispatchEvent(new Event("cart-updated"));
    }).catch((error) => {
      console.error("Error:", error);
    });
  }
};
window.Sunrise = Sunrise;
document.addEventListener("alpine:init", () => {
  Alpine.plugin(Portal);
  Alpine.plugin(StickyScroll);
  Alpine.plugin(module_default$1);
  Alpine.plugin(module_default);
  Alpine.plugin(TransitionPlugin);
  Alpine.plugin(ElementIntersection);
  Alpine.plugin(Pagination);
  Alpine.plugin(Accessibility);
  Alpine.store("popup", PopupStore);
  Alpine.store("main", Main);
  Alpine.store("resizable", ResizableStore);
  Alpine.store("productList", ProductListStore);
  Alpine.store("cart", CartStore);
  Alpine.data("TransitionPreview", TransitionPreview);
  Alpine.data("BeforeAfter", BeforeAfter);
  Alpine.data("ProductList", ProductList);
  Alpine.data("Filters", Filters);
  Alpine.data("ProductPage", ProductPage);
  Alpine.data("Dropdown", Dropdown);
  Alpine.data("Search", Search);
  Alpine.data("Accordion", Accordion);
  Alpine.data("Address", Address);
  Alpine.data("RangeSlider", RangeSlider);
  Alpine.data("Slider", Slider);
  Alpine.data("CountdownTimer", CountdownTimer);
  Alpine.data("TransitionImage", TransitionImage);
  Alpine.data("productCarousel", productCarousel);
  Alpine.data("ImageZoom", ImageZoom);
});

const initVariantOptionScroll = () => {
  // document.querySelectorAll('.variant-pill-scroll[data-scroll="true"]').forEach((container) => {
  //   if (container.dataset.variantScrollWheelBound === 'true') {
  //     return;
  //   }

  //   // Force a recalculation of scroll properties
  //   const updateScrollability = () => {
  //     const hasOverflow = container.scrollWidth > container.clientWidth + 1; // Add 1px tolerance
  //     container.style.overflowX = hasOverflow ? 'auto' : 'visible';
  //   };

  //   // Check immediately
  //   updateScrollability();

  //   // Check again after a short delay to account for dynamic content
  //   setTimeout(updateScrollability, 100);

  //   container.addEventListener('wheel', (event) => {
  //     const hasOverflow = container.scrollWidth > container.clientWidth + 1;
  //     if (!hasOverflow) {
  //       return;
  //     }

  //     if (Math.abs(event.deltaY) > Math.abs(event.deltaX)) {
  //       container.scrollLeft += event.deltaY;
  //       event.preventDefault();
  //     }
  //   }, { passive: false });

  //   container.dataset.variantScrollWheelBound = 'true';
  // });
};

document.addEventListener('DOMContentLoaded', initVariantOptionScroll);
window.addEventListener('resize', initVariantOptionScroll);
document.addEventListener('shopify:section:load', initVariantOptionScroll);
