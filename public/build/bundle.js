
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    function assign(tar, src) {
        // @ts-ignore
        for (const k in src)
            tar[k] = src[k];
        return tar;
    }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function exclude_internal_props(props) {
        const result = {};
        for (const k in props)
            if (k[0] !== '$')
                result[k] = props[k];
        return result;
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function prevent_default(fn) {
        return function (event) {
            event.preventDefault();
            // @ts-ignore
            return fn.call(this, event);
        };
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
    }
    function select_option(select, value) {
        for (let i = 0; i < select.options.length; i += 1) {
            const option = select.options[i];
            if (option.__value === value) {
                option.selected = true;
                return;
            }
        }
    }
    function select_value(select) {
        const selected_option = select.querySelector(':checked') || select.options[0];
        return selected_option && selected_option.__value;
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error(`Function called outside component initialization`);
        return current_component;
    }
    function createEventDispatcher() {
        const component = get_current_component();
        return (type, detail) => {
            const callbacks = component.$$.callbacks[type];
            if (callbacks) {
                // TODO are there situations where events could be dispatched
                // in a server (non-DOM) environment?
                const event = custom_event(type, detail);
                callbacks.slice().forEach(fn => {
                    fn.call(component, event);
                });
            }
        };
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    function add_flush_callback(fn) {
        flush_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }

    function get_spread_update(levels, updates) {
        const update = {};
        const to_null_out = {};
        const accounted_for = { $$scope: 1 };
        let i = levels.length;
        while (i--) {
            const o = levels[i];
            const n = updates[i];
            if (n) {
                for (const key in o) {
                    if (!(key in n))
                        to_null_out[key] = 1;
                }
                for (const key in n) {
                    if (!accounted_for[key]) {
                        update[key] = n[key];
                        accounted_for[key] = 1;
                    }
                }
                levels[i] = n;
            }
            else {
                for (const key in o) {
                    accounted_for[key] = 1;
                }
            }
        }
        for (const key in to_null_out) {
            if (!(key in update))
                update[key] = undefined;
        }
        return update;
    }
    function get_spread_object(spread_props) {
        return typeof spread_props === 'object' && spread_props !== null ? spread_props : {};
    }

    function bind(component, name, callback) {
        const index = component.$$.props[name];
        if (index !== undefined) {
            component.$$.bound[index] = callback;
            callback(component.$$.ctx[index]);
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const prop_values = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if ($$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set() {
            // overridden by instance, if it has props
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.23.2' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev("SvelteDOMInsert", { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev("SvelteDOMInsert", { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev("SvelteDOMRemove", { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ["capture"] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev("SvelteDOMAddEventListener", { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev("SvelteDOMRemoveEventListener", { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev("SvelteDOMRemoveAttribute", { node, attribute });
        else
            dispatch_dev("SvelteDOMSetAttribute", { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.data === data)
            return;
        dispatch_dev("SvelteDOMSetData", { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error(`'target' is a required option`);
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn(`Component was already destroyed`); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    // Unique ID creation requires a high quality random # generator. In the browser we therefore
    // require the crypto API and do not support built-in fallback to lower quality random number
    // generators (like Math.random()).
    // getRandomValues needs to be invoked in a context where "this" is a Crypto implementation. Also,
    // find the complete implementation of crypto (msCrypto) on IE11.
    var getRandomValues = typeof crypto !== 'undefined' && crypto.getRandomValues && crypto.getRandomValues.bind(crypto) || typeof msCrypto !== 'undefined' && typeof msCrypto.getRandomValues === 'function' && msCrypto.getRandomValues.bind(msCrypto);
    var rnds8 = new Uint8Array(16);
    function rng() {
      if (!getRandomValues) {
        throw new Error('crypto.getRandomValues() not supported. See https://github.com/uuidjs/uuid#getrandomvalues-not-supported');
      }

      return getRandomValues(rnds8);
    }

    /**
     * Convert array of 16 byte values to UUID string format of the form:
     * XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX
     */
    var byteToHex = [];

    for (var i = 0; i < 256; ++i) {
      byteToHex.push((i + 0x100).toString(16).substr(1));
    }

    function bytesToUuid(buf, offset) {
      var i = offset || 0;
      var bth = byteToHex; // Note: Be careful editing this code!  It's been tuned for performance
      // and works in ways you may not expect. See https://github.com/uuidjs/uuid/pull/434

      return (bth[buf[i + 0]] + bth[buf[i + 1]] + bth[buf[i + 2]] + bth[buf[i + 3]] + '-' + bth[buf[i + 4]] + bth[buf[i + 5]] + '-' + bth[buf[i + 6]] + bth[buf[i + 7]] + '-' + bth[buf[i + 8]] + bth[buf[i + 9]] + '-' + bth[buf[i + 10]] + bth[buf[i + 11]] + bth[buf[i + 12]] + bth[buf[i + 13]] + bth[buf[i + 14]] + bth[buf[i + 15]]).toLowerCase();
    }

    function v4(options, buf, offset) {
      if (typeof options === 'string') {
        buf = options === 'binary' ? new Uint8Array(16) : null;
        options = null;
      }

      options = options || {};
      var rnds = options.random || (options.rng || rng)(); // Per 4.4, set bits for version and `clock_seq_hi_and_reserved`

      rnds[6] = rnds[6] & 0x0f | 0x40;
      rnds[8] = rnds[8] & 0x3f | 0x80; // Copy bytes to buffer, if provided

      if (buf) {
        var start = offset || 0;

        for (var i = 0; i < 16; ++i) {
          buf[start + i] = rnds[i];
        }

        return buf;
      }

      return bytesToUuid(rnds);
    }

    var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

    function unwrapExports (x) {
    	return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
    }

    function createCommonjsModule(fn, basedir, module) {
    	return module = {
    	  path: basedir,
    	  exports: {},
    	  require: function (path, base) {
          return commonjsRequire(path, (base === undefined || base === null) ? module.path : base);
        }
    	}, fn(module, module.exports), module.exports;
    }

    function commonjsRequire () {
    	throw new Error('Dynamic requires are not currently supported by @rollup/plugin-commonjs');
    }

    var noty = createCommonjsModule(function (module, exports) {
    /* 
      @package NOTY - Dependency-free notification library 
      @version version: 3.2.0-beta 
      @contributors https://github.com/needim/noty/graphs/contributors 
      @documentation Examples and Documentation - https://ned.im/noty 
      @license Licensed under the MIT licenses: http://www.opensource.org/licenses/mit-license.php 
    */

    (function webpackUniversalModuleDefinition(root, factory) {
    	module.exports = factory();
    })(commonjsGlobal, function() {
    return /******/ (function(modules) { // webpackBootstrap
    /******/ 	// The module cache
    /******/ 	var installedModules = {};
    /******/
    /******/ 	// The require function
    /******/ 	function __webpack_require__(moduleId) {
    /******/
    /******/ 		// Check if module is in cache
    /******/ 		if(installedModules[moduleId]) {
    /******/ 			return installedModules[moduleId].exports;
    /******/ 		}
    /******/ 		// Create a new module (and put it into the cache)
    /******/ 		var module = installedModules[moduleId] = {
    /******/ 			i: moduleId,
    /******/ 			l: false,
    /******/ 			exports: {}
    /******/ 		};
    /******/
    /******/ 		// Execute the module function
    /******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
    /******/
    /******/ 		// Flag the module as loaded
    /******/ 		module.l = true;
    /******/
    /******/ 		// Return the exports of the module
    /******/ 		return module.exports;
    /******/ 	}
    /******/
    /******/
    /******/ 	// expose the modules object (__webpack_modules__)
    /******/ 	__webpack_require__.m = modules;
    /******/
    /******/ 	// expose the module cache
    /******/ 	__webpack_require__.c = installedModules;
    /******/
    /******/ 	// identity function for calling harmony imports with the correct context
    /******/ 	__webpack_require__.i = function(value) { return value; };
    /******/
    /******/ 	// define getter function for harmony exports
    /******/ 	__webpack_require__.d = function(exports, name, getter) {
    /******/ 		if(!__webpack_require__.o(exports, name)) {
    /******/ 			Object.defineProperty(exports, name, {
    /******/ 				configurable: false,
    /******/ 				enumerable: true,
    /******/ 				get: getter
    /******/ 			});
    /******/ 		}
    /******/ 	};
    /******/
    /******/ 	// getDefaultExport function for compatibility with non-harmony modules
    /******/ 	__webpack_require__.n = function(module) {
    /******/ 		var getter = module && module.__esModule ?
    /******/ 			function getDefault() { return module['default']; } :
    /******/ 			function getModuleExports() { return module; };
    /******/ 		__webpack_require__.d(getter, 'a', getter);
    /******/ 		return getter;
    /******/ 	};
    /******/
    /******/ 	// Object.prototype.hasOwnProperty.call
    /******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
    /******/
    /******/ 	// __webpack_public_path__
    /******/ 	__webpack_require__.p = "";
    /******/
    /******/ 	// Load entry module and return exports
    /******/ 	return __webpack_require__(__webpack_require__.s = 6);
    /******/ })
    /************************************************************************/
    /******/ ([
    /* 0 */
    /***/ (function(module, exports, __webpack_require__) {


    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.css = exports.deepExtend = exports.animationEndEvents = undefined;

    var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

    exports.inArray = inArray;
    exports.stopPropagation = stopPropagation;
    exports.generateID = generateID;
    exports.outerHeight = outerHeight;
    exports.addListener = addListener;
    exports.hasClass = hasClass;
    exports.addClass = addClass;
    exports.removeClass = removeClass;
    exports.remove = remove;
    exports.classList = classList;
    exports.visibilityChangeFlow = visibilityChangeFlow;
    exports.createAudioElements = createAudioElements;

    var _api = __webpack_require__(1);

    var API = _interopRequireWildcard(_api);

    function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

    var animationEndEvents = exports.animationEndEvents = 'webkitAnimationEnd mozAnimationEnd MSAnimationEnd oanimationend animationend';

    function inArray(needle, haystack, argStrict) {
      var key = void 0;
      var strict = !!argStrict;

      if (strict) {
        for (key in haystack) {
          if (haystack.hasOwnProperty(key) && haystack[key] === needle) {
            return true;
          }
        }
      } else {
        for (key in haystack) {
          if (haystack.hasOwnProperty(key) && haystack[key] === needle) {
            return true;
          }
        }
      }
      return false;
    }

    function stopPropagation(evt) {
      evt = evt || window.event;

      if (typeof evt.stopPropagation !== 'undefined') {
        evt.stopPropagation();
      } else {
        evt.cancelBubble = true;
      }
    }

    var deepExtend = exports.deepExtend = function deepExtend(out) {
      out = out || {};

      for (var i = 1; i < arguments.length; i++) {
        var obj = arguments[i];

        if (!obj) continue;

        for (var key in obj) {
          if (obj.hasOwnProperty(key)) {
            if (Array.isArray(obj[key])) {
              out[key] = obj[key];
            } else if (_typeof(obj[key]) === 'object' && obj[key] !== null) {
              out[key] = deepExtend(out[key], obj[key]);
            } else {
              out[key] = obj[key];
            }
          }
        }
      }

      return out;
    };

    function generateID() {
      var prefix = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '';

      var id = 'noty_' + prefix + '_';

      id += 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0;
        var v = c === 'x' ? r : r & 0x3 | 0x8;
        return v.toString(16);
      });

      return id;
    }

    function outerHeight(el) {
      var height = el.offsetHeight;
      var style = window.getComputedStyle(el);

      height += parseInt(style.marginTop) + parseInt(style.marginBottom);
      return height;
    }

    var css = exports.css = function () {
      var cssPrefixes = ['Webkit', 'O', 'Moz', 'ms'];
      var cssProps = {};

      function camelCase(string) {
        return string.replace(/^-ms-/, 'ms-').replace(/-([\da-z])/gi, function (match, letter) {
          return letter.toUpperCase();
        });
      }

      function getVendorProp(name) {
        var style = document.body.style;
        if (name in style) return name;

        var i = cssPrefixes.length;
        var capName = name.charAt(0).toUpperCase() + name.slice(1);
        var vendorName = void 0;

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

      return function (element, properties) {
        var args = arguments;
        var prop = void 0;
        var value = void 0;

        if (args.length === 2) {
          for (prop in properties) {
            if (properties.hasOwnProperty(prop)) {
              value = properties[prop];
              if (value !== undefined && properties.hasOwnProperty(prop)) {
                applyCss(element, prop, value);
              }
            }
          }
        } else {
          applyCss(element, args[1], args[2]);
        }
      };
    }();

    function addListener(el, events, cb) {
      var useCapture = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : false;

      events = events.split(' ');
      for (var i = 0; i < events.length; i++) {
        if (document.addEventListener) {
          el.addEventListener(events[i], cb, useCapture);
        } else if (document.attachEvent) {
          el.attachEvent('on' + events[i], cb);
        }
      }
    }

    function hasClass(element, name) {
      var list = typeof element === 'string' ? element : classList(element);
      return list.indexOf(' ' + name + ' ') >= 0;
    }

    function addClass(element, name) {
      var oldList = classList(element);
      var newList = oldList + name;

      if (hasClass(oldList, name)) return;

      // Trim the opening space.
      element.className = newList.substring(1);
    }

    function removeClass(element, name) {
      var oldList = classList(element);
      var newList = void 0;

      if (!hasClass(element, name)) return;

      // Replace the class name.
      newList = oldList.replace(' ' + name + ' ', ' ');

      // Trim the opening and closing spaces.
      element.className = newList.substring(1, newList.length - 1);
    }

    function remove(element) {
      if (element.parentNode) {
        element.parentNode.removeChild(element);
      }
    }

    function classList(element) {
      return (' ' + (element && element.className || '') + ' ').replace(/\s+/gi, ' ');
    }

    function visibilityChangeFlow() {
      var hidden = void 0;
      var visibilityChange = void 0;
      if (typeof document.hidden !== 'undefined') {
        // Opera 12.10 and Firefox 18 and later support
        hidden = 'hidden';
        visibilityChange = 'visibilitychange';
      } else if (typeof document.msHidden !== 'undefined') {
        hidden = 'msHidden';
        visibilityChange = 'msvisibilitychange';
      } else if (typeof document.webkitHidden !== 'undefined') {
        hidden = 'webkitHidden';
        visibilityChange = 'webkitvisibilitychange';
      }

      function onVisibilityChange() {
        API.PageHidden = document[hidden];
        handleVisibilityChange();
      }

      function onBlur() {
        API.PageHidden = true;
        handleVisibilityChange();
      }

      function onFocus() {
        API.PageHidden = false;
        handleVisibilityChange();
      }

      function handleVisibilityChange() {
        if (API.PageHidden) stopAll();else resumeAll();
      }

      function stopAll() {
        setTimeout(function () {
          Object.keys(API.Store).forEach(function (id) {
            if (API.Store.hasOwnProperty(id)) {
              if (API.Store[id].options.visibilityControl) {
                API.Store[id].stop();
              }
            }
          });
        }, 100);
      }

      function resumeAll() {
        setTimeout(function () {
          Object.keys(API.Store).forEach(function (id) {
            if (API.Store.hasOwnProperty(id)) {
              if (API.Store[id].options.visibilityControl) {
                API.Store[id].resume();
              }
            }
          });
          API.queueRenderAll();
        }, 100);
      }

      if (visibilityChange) {
        addListener(document, visibilityChange, onVisibilityChange);
      }

      addListener(window, 'blur', onBlur);
      addListener(window, 'focus', onFocus);
    }

    function createAudioElements(ref) {
      if (ref.hasSound) {
        var audioElement = document.createElement('audio');

        ref.options.sounds.sources.forEach(function (s) {
          var source = document.createElement('source');
          source.src = s;
          source.type = 'audio/' + getExtension(s);
          audioElement.appendChild(source);
        });

        if (ref.barDom) {
          ref.barDom.appendChild(audioElement);
        } else {
          document.querySelector('body').appendChild(audioElement);
        }

        audioElement.volume = ref.options.sounds.volume;

        if (!ref.soundPlayed) {
          audioElement.play();
          ref.soundPlayed = true;
        }

        audioElement.onended = function () {
          remove(audioElement);
        };
      }
    }

    function getExtension(fileName) {
      return fileName.match(/\.([^.]+)$/)[1];
    }

    /***/ }),
    /* 1 */
    /***/ (function(module, exports, __webpack_require__) {


    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.Defaults = exports.Store = exports.Queues = exports.DefaultMaxVisible = exports.docTitle = exports.DocModalCount = exports.PageHidden = undefined;
    exports.getQueueCounts = getQueueCounts;
    exports.addToQueue = addToQueue;
    exports.removeFromQueue = removeFromQueue;
    exports.queueRender = queueRender;
    exports.queueRenderAll = queueRenderAll;
    exports.ghostFix = ghostFix;
    exports.build = build;
    exports.hasButtons = hasButtons;
    exports.handleModal = handleModal;
    exports.handleModalClose = handleModalClose;
    exports.queueClose = queueClose;
    exports.dequeueClose = dequeueClose;
    exports.fire = fire;
    exports.openFlow = openFlow;
    exports.closeFlow = closeFlow;

    var _utils = __webpack_require__(0);

    var Utils = _interopRequireWildcard(_utils);

    function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

    var PageHidden = exports.PageHidden = false;
    var DocModalCount = exports.DocModalCount = 0;

    var DocTitleProps = {
      originalTitle: null,
      count: 0,
      changed: false,
      timer: -1
    };

    var docTitle = exports.docTitle = {
      increment: function increment() {
        DocTitleProps.count++;

        docTitle._update();
      },

      decrement: function decrement() {
        DocTitleProps.count--;

        if (DocTitleProps.count <= 0) {
          docTitle._clear();
          return;
        }

        docTitle._update();
      },

      _update: function _update() {
        var title = document.title;

        if (!DocTitleProps.changed) {
          DocTitleProps.originalTitle = title;
          document.title = '(' + DocTitleProps.count + ') ' + title;
          DocTitleProps.changed = true;
        } else {
          document.title = '(' + DocTitleProps.count + ') ' + DocTitleProps.originalTitle;
        }
      },

      _clear: function _clear() {
        if (DocTitleProps.changed) {
          DocTitleProps.count = 0;
          document.title = DocTitleProps.originalTitle;
          DocTitleProps.changed = false;
        }
      }
    };

    var DefaultMaxVisible = exports.DefaultMaxVisible = 5;

    var Queues = exports.Queues = {
      global: {
        maxVisible: DefaultMaxVisible,
        queue: []
      }
    };

    var Store = exports.Store = {};

    var Defaults = exports.Defaults = {
      type: 'alert',
      layout: 'topRight',
      theme: 'mint',
      text: '',
      timeout: false,
      progressBar: true,
      closeWith: ['click'],
      animation: {
        open: 'noty_effects_open',
        close: 'noty_effects_close'
      },
      id: false,
      force: false,
      killer: false,
      queue: 'global',
      container: false,
      buttons: [],
      callbacks: {
        beforeShow: null,
        onShow: null,
        afterShow: null,
        onClose: null,
        afterClose: null,
        onClick: null,
        onHover: null,
        onTemplate: null
      },
      sounds: {
        sources: [],
        volume: 1,
        conditions: []
      },
      titleCount: {
        conditions: []
      },
      modal: false,
      visibilityControl: false

      /**
       * @param {string} queueName
       * @return {object}
       */
    };function getQueueCounts() {
      var queueName = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 'global';

      var count = 0;
      var max = DefaultMaxVisible;

      if (Queues.hasOwnProperty(queueName)) {
        max = Queues[queueName].maxVisible;
        Object.keys(Store).forEach(function (i) {
          if (Store[i].options.queue === queueName && !Store[i].closed) count++;
        });
      }

      return {
        current: count,
        maxVisible: max
      };
    }

    /**
     * @param {Noty} ref
     * @return {void}
     */
    function addToQueue(ref) {
      if (!Queues.hasOwnProperty(ref.options.queue)) {
        Queues[ref.options.queue] = { maxVisible: DefaultMaxVisible, queue: [] };
      }

      Queues[ref.options.queue].queue.push(ref);
    }

    /**
     * @param {Noty} ref
     * @return {void}
     */
    function removeFromQueue(ref) {
      if (Queues.hasOwnProperty(ref.options.queue)) {
        var queue = [];
        Object.keys(Queues[ref.options.queue].queue).forEach(function (i) {
          if (Queues[ref.options.queue].queue[i].id !== ref.id) {
            queue.push(Queues[ref.options.queue].queue[i]);
          }
        });
        Queues[ref.options.queue].queue = queue;
      }
    }

    /**
     * @param {string} queueName
     * @return {void}
     */
    function queueRender() {
      var queueName = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 'global';

      if (Queues.hasOwnProperty(queueName)) {
        var noty = Queues[queueName].queue.shift();

        if (noty) noty.show();
      }
    }

    /**
     * @return {void}
     */
    function queueRenderAll() {
      Object.keys(Queues).forEach(function (queueName) {
        queueRender(queueName);
      });
    }

    /**
     * @param {Noty} ref
     * @return {void}
     */
    function ghostFix(ref) {
      var ghostID = Utils.generateID('ghost');
      var ghost = document.createElement('div');
      ghost.setAttribute('id', ghostID);
      Utils.css(ghost, {
        height: Utils.outerHeight(ref.barDom) + 'px'
      });

      ref.barDom.insertAdjacentHTML('afterend', ghost.outerHTML);

      Utils.remove(ref.barDom);
      ghost = document.getElementById(ghostID);
      Utils.addClass(ghost, 'noty_fix_effects_height');
      Utils.addListener(ghost, Utils.animationEndEvents, function () {
        Utils.remove(ghost);
      });
    }

    /**
     * @param {Noty} ref
     * @return {void}
     */
    function build(ref) {
      findOrCreateContainer(ref);

      var markup = '<div class="noty_body">' + ref.options.text + '</div>' + buildButtons(ref) + '<div class="noty_progressbar"></div>';

      ref.barDom = document.createElement('div');
      ref.barDom.setAttribute('id', ref.id);
      Utils.addClass(ref.barDom, 'noty_bar noty_type__' + ref.options.type + ' noty_theme__' + ref.options.theme);

      ref.barDom.innerHTML = markup;

      fire(ref, 'onTemplate');
    }

    /**
     * @param {Noty} ref
     * @return {boolean}
     */
    function hasButtons(ref) {
      return !!(ref.options.buttons && Object.keys(ref.options.buttons).length);
    }

    /**
     * @param {Noty} ref
     * @return {string}
     */
    function buildButtons(ref) {
      if (hasButtons(ref)) {
        var buttons = document.createElement('div');
        Utils.addClass(buttons, 'noty_buttons');

        Object.keys(ref.options.buttons).forEach(function (key) {
          buttons.appendChild(ref.options.buttons[key].dom);
        });

        ref.options.buttons.forEach(function (btn) {
          buttons.appendChild(btn.dom);
        });
        return buttons.outerHTML;
      }
      return '';
    }

    /**
     * @param {Noty} ref
     * @return {void}
     */
    function handleModal(ref) {
      if (ref.options.modal) {
        if (DocModalCount === 0) {
          createModal();
        }

        exports.DocModalCount = DocModalCount += 1;
      }
    }

    /**
     * @param {Noty} ref
     * @return {void}
     */
    function handleModalClose(ref) {
      if (ref.options.modal && DocModalCount > 0) {
        exports.DocModalCount = DocModalCount -= 1;

        if (DocModalCount <= 0) {
          var modal = document.querySelector('.noty_modal');

          if (modal) {
            Utils.removeClass(modal, 'noty_modal_open');
            Utils.addClass(modal, 'noty_modal_close');
            Utils.addListener(modal, Utils.animationEndEvents, function () {
              Utils.remove(modal);
            });
          }
        }
      }
    }

    /**
     * @return {void}
     */
    function createModal() {
      var body = document.querySelector('body');
      var modal = document.createElement('div');
      Utils.addClass(modal, 'noty_modal');
      body.insertBefore(modal, body.firstChild);
      Utils.addClass(modal, 'noty_modal_open');

      Utils.addListener(modal, Utils.animationEndEvents, function () {
        Utils.removeClass(modal, 'noty_modal_open');
      });
    }

    /**
     * @param {Noty} ref
     * @return {void}
     */
    function findOrCreateContainer(ref) {
      if (ref.options.container) {
        ref.layoutDom = document.querySelector(ref.options.container);
        return;
      }

      var layoutID = 'noty_layout__' + ref.options.layout;
      ref.layoutDom = document.querySelector('div#' + layoutID);

      if (!ref.layoutDom) {
        ref.layoutDom = document.createElement('div');
        ref.layoutDom.setAttribute('id', layoutID);
        ref.layoutDom.setAttribute('role', 'alert');
        ref.layoutDom.setAttribute('aria-live', 'polite');
        Utils.addClass(ref.layoutDom, 'noty_layout');
        document.querySelector('body').appendChild(ref.layoutDom);
      }
    }

    /**
     * @param {Noty} ref
     * @return {void}
     */
    function queueClose(ref) {
      if (ref.options.timeout) {
        if (ref.options.progressBar && ref.progressDom) {
          Utils.css(ref.progressDom, {
            transition: 'width ' + ref.options.timeout + 'ms linear',
            width: '0%'
          });
        }

        clearTimeout(ref.closeTimer);

        ref.closeTimer = setTimeout(function () {
          ref.close();
        }, ref.options.timeout);
      }
    }

    /**
     * @param {Noty} ref
     * @return {void}
     */
    function dequeueClose(ref) {
      if (ref.options.timeout && ref.closeTimer) {
        clearTimeout(ref.closeTimer);
        ref.closeTimer = -1;

        if (ref.options.progressBar && ref.progressDom) {
          Utils.css(ref.progressDom, {
            transition: 'width 0ms linear',
            width: '100%'
          });
        }
      }
    }

    /**
     * @param {Noty} ref
     * @param {string} eventName
     * @return {void}
     */
    function fire(ref, eventName) {
      if (ref.listeners.hasOwnProperty(eventName)) {
        ref.listeners[eventName].forEach(function (cb) {
          if (typeof cb === 'function') {
            cb.apply(ref);
          }
        });
      }
    }

    /**
     * @param {Noty} ref
     * @return {void}
     */
    function openFlow(ref) {
      fire(ref, 'afterShow');
      queueClose(ref);

      Utils.addListener(ref.barDom, 'mouseenter', function () {
        dequeueClose(ref);
      });

      Utils.addListener(ref.barDom, 'mouseleave', function () {
        queueClose(ref);
      });
    }

    /**
     * @param {Noty} ref
     * @return {void}
     */
    function closeFlow(ref) {
      delete Store[ref.id];
      ref.closing = false;
      fire(ref, 'afterClose');

      Utils.remove(ref.barDom);

      if (ref.layoutDom.querySelectorAll('.noty_bar').length === 0 && !ref.options.container) {
        Utils.remove(ref.layoutDom);
      }

      if (Utils.inArray('docVisible', ref.options.titleCount.conditions) || Utils.inArray('docHidden', ref.options.titleCount.conditions)) {
        docTitle.decrement();
      }

      queueRender(ref.options.queue);
    }

    /***/ }),
    /* 2 */
    /***/ (function(module, exports, __webpack_require__) {


    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.NotyButton = undefined;

    var _utils = __webpack_require__(0);

    var Utils = _interopRequireWildcard(_utils);

    function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

    function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

    var NotyButton = exports.NotyButton = function NotyButton(html, classes, cb) {
      var _this = this;

      var attributes = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : {};

      _classCallCheck(this, NotyButton);

      this.dom = document.createElement('button');
      this.dom.innerHTML = html;
      this.id = attributes.id = attributes.id || Utils.generateID('button');
      this.cb = cb;
      Object.keys(attributes).forEach(function (propertyName) {
        _this.dom.setAttribute(propertyName, attributes[propertyName]);
      });
      Utils.addClass(this.dom, classes || 'noty_btn');

      return this;
    };

    /***/ }),
    /* 3 */
    /***/ (function(module, exports, __webpack_require__) {


    Object.defineProperty(exports, "__esModule", {
      value: true
    });

    var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

    function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

    var Push = exports.Push = function () {
      function Push() {
        var workerPath = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '/service-worker.js';

        _classCallCheck(this, Push);

        this.subData = {};
        this.workerPath = workerPath;
        this.listeners = {
          onPermissionGranted: [],
          onPermissionDenied: [],
          onSubscriptionSuccess: [],
          onSubscriptionCancel: [],
          onWorkerError: [],
          onWorkerSuccess: [],
          onWorkerNotSupported: []
        };
        return this;
      }

      /**
       * @param {string} eventName
       * @param {function} cb
       * @return {Push}
       */


      _createClass(Push, [{
        key: 'on',
        value: function on(eventName) {
          var cb = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : function () {};

          if (typeof cb === 'function' && this.listeners.hasOwnProperty(eventName)) {
            this.listeners[eventName].push(cb);
          }

          return this;
        }
      }, {
        key: 'fire',
        value: function fire(eventName) {
          var _this = this;

          var params = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];

          if (this.listeners.hasOwnProperty(eventName)) {
            this.listeners[eventName].forEach(function (cb) {
              if (typeof cb === 'function') {
                cb.apply(_this, params);
              }
            });
          }
        }
      }, {
        key: 'create',
        value: function create() {
          console.log('NOT IMPLEMENTED YET');
        }

        /**
         * @return {boolean}
         */

      }, {
        key: 'isSupported',
        value: function isSupported() {
          var result = false;

          try {
            result = window.Notification || window.webkitNotifications || navigator.mozNotification || window.external && window.external.msIsSiteMode() !== undefined;
          } catch (e) {}

          return result;
        }

        /**
         * @return {string}
         */

      }, {
        key: 'getPermissionStatus',
        value: function getPermissionStatus() {
          var perm = 'default';

          if (window.Notification && window.Notification.permissionLevel) {
            perm = window.Notification.permissionLevel;
          } else if (window.webkitNotifications && window.webkitNotifications.checkPermission) {
            switch (window.webkitNotifications.checkPermission()) {
              case 1:
                perm = 'default';
                break;
              case 0:
                perm = 'granted';
                break;
              default:
                perm = 'denied';
            }
          } else if (window.Notification && window.Notification.permission) {
            perm = window.Notification.permission;
          } else if (navigator.mozNotification) {
            perm = 'granted';
          } else if (window.external && window.external.msIsSiteMode() !== undefined) {
            perm = window.external.msIsSiteMode() ? 'granted' : 'default';
          }

          return perm.toString().toLowerCase();
        }

        /**
         * @return {string}
         */

      }, {
        key: 'getEndpoint',
        value: function getEndpoint(subscription) {
          var endpoint = subscription.endpoint;
          var subscriptionId = subscription.subscriptionId;

          // fix for Chrome < 45
          if (subscriptionId && endpoint.indexOf(subscriptionId) === -1) {
            endpoint += '/' + subscriptionId;
          }

          return endpoint;
        }

        /**
         * @return {boolean}
         */

      }, {
        key: 'isSWRegistered',
        value: function isSWRegistered() {
          try {
            return navigator.serviceWorker.controller.state === 'activated';
          } catch (e) {
            return false;
          }
        }

        /**
         * @return {void}
         */

      }, {
        key: 'unregisterWorker',
        value: function unregisterWorker() {
          var self = this;
          if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistrations().then(function (registrations) {
              var _iteratorNormalCompletion = true;
              var _didIteratorError = false;
              var _iteratorError = undefined;

              try {
                for (var _iterator = registrations[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                  var registration = _step.value;

                  registration.unregister();
                  self.fire('onSubscriptionCancel');
                }
              } catch (err) {
                _didIteratorError = true;
                _iteratorError = err;
              } finally {
                try {
                  if (!_iteratorNormalCompletion && _iterator.return) {
                    _iterator.return();
                  }
                } finally {
                  if (_didIteratorError) {
                    throw _iteratorError;
                  }
                }
              }
            });
          }
        }

        /**
         * @return {void}
         */

      }, {
        key: 'requestSubscription',
        value: function requestSubscription() {
          var _this2 = this;

          var userVisibleOnly = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : true;

          var self = this;
          var current = this.getPermissionStatus();
          var cb = function cb(result) {
            if (result === 'granted') {
              _this2.fire('onPermissionGranted');

              if ('serviceWorker' in navigator) {
                navigator.serviceWorker.register(_this2.workerPath).then(function () {
                  navigator.serviceWorker.ready.then(function (serviceWorkerRegistration) {
                    self.fire('onWorkerSuccess');
                    serviceWorkerRegistration.pushManager.subscribe({
                      userVisibleOnly: userVisibleOnly
                    }).then(function (subscription) {
                      var key = subscription.getKey('p256dh');
                      var token = subscription.getKey('auth');

                      self.subData = {
                        endpoint: self.getEndpoint(subscription),
                        p256dh: key ? window.btoa(String.fromCharCode.apply(null, new Uint8Array(key))) : null,
                        auth: token ? window.btoa(String.fromCharCode.apply(null, new Uint8Array(token))) : null
                      };

                      self.fire('onSubscriptionSuccess', [self.subData]);
                    }).catch(function (err) {
                      self.fire('onWorkerError', [err]);
                    });
                  });
                });
              } else {
                self.fire('onWorkerNotSupported');
              }
            } else if (result === 'denied') {
              _this2.fire('onPermissionDenied');
              _this2.unregisterWorker();
            }
          };

          if (current === 'default') {
            if (window.Notification && window.Notification.requestPermission) {
              window.Notification.requestPermission(cb);
            } else if (window.webkitNotifications && window.webkitNotifications.checkPermission) {
              window.webkitNotifications.requestPermission(cb);
            }
          } else {
            cb(current);
          }
        }
      }]);

      return Push;
    }();

    /***/ }),
    /* 4 */
    /***/ (function(module, exports, __webpack_require__) {

    /* WEBPACK VAR INJECTION */(function(process, global) {var require;/*!
     * @overview es6-promise - a tiny implementation of Promises/A+.
     * @copyright Copyright (c) 2014 Yehuda Katz, Tom Dale, Stefan Penner and contributors (Conversion to ES6 API by Jake Archibald)
     * @license   Licensed under MIT license
     *            See https://raw.githubusercontent.com/stefanpenner/es6-promise/master/LICENSE
     * @version   4.1.1
     */

    (function (global, factory) {
    	  module.exports = factory() ;
    }(this, (function () {
    function objectOrFunction(x) {
      var type = typeof x;
      return x !== null && (type === 'object' || type === 'function');
    }

    function isFunction(x) {
      return typeof x === 'function';
    }

    var _isArray = undefined;
    if (Array.isArray) {
      _isArray = Array.isArray;
    } else {
      _isArray = function (x) {
        return Object.prototype.toString.call(x) === '[object Array]';
      };
    }

    var isArray = _isArray;

    var len = 0;
    var vertxNext = undefined;
    var customSchedulerFn = undefined;

    var asap = function asap(callback, arg) {
      queue[len] = callback;
      queue[len + 1] = arg;
      len += 2;
      if (len === 2) {
        // If len is 2, that means that we need to schedule an async flush.
        // If additional callbacks are queued before the queue is flushed, they
        // will be processed by this flush that we are scheduling.
        if (customSchedulerFn) {
          customSchedulerFn(flush);
        } else {
          scheduleFlush();
        }
      }
    };

    function setScheduler(scheduleFn) {
      customSchedulerFn = scheduleFn;
    }

    function setAsap(asapFn) {
      asap = asapFn;
    }

    var browserWindow = typeof window !== 'undefined' ? window : undefined;
    var browserGlobal = browserWindow || {};
    var BrowserMutationObserver = browserGlobal.MutationObserver || browserGlobal.WebKitMutationObserver;
    var isNode = typeof self === 'undefined' && typeof process !== 'undefined' && ({}).toString.call(process) === '[object process]';

    // test for web worker but not in IE10
    var isWorker = typeof Uint8ClampedArray !== 'undefined' && typeof importScripts !== 'undefined' && typeof MessageChannel !== 'undefined';

    // node
    function useNextTick() {
      // node version 0.10.x displays a deprecation warning when nextTick is used recursively
      // see https://github.com/cujojs/when/issues/410 for details
      return function () {
        return process.nextTick(flush);
      };
    }

    // vertx
    function useVertxTimer() {
      if (typeof vertxNext !== 'undefined') {
        return function () {
          vertxNext(flush);
        };
      }

      return useSetTimeout();
    }

    function useMutationObserver() {
      var iterations = 0;
      var observer = new BrowserMutationObserver(flush);
      var node = document.createTextNode('');
      observer.observe(node, { characterData: true });

      return function () {
        node.data = iterations = ++iterations % 2;
      };
    }

    // web worker
    function useMessageChannel() {
      var channel = new MessageChannel();
      channel.port1.onmessage = flush;
      return function () {
        return channel.port2.postMessage(0);
      };
    }

    function useSetTimeout() {
      // Store setTimeout reference so es6-promise will be unaffected by
      // other code modifying setTimeout (like sinon.useFakeTimers())
      var globalSetTimeout = setTimeout;
      return function () {
        return globalSetTimeout(flush, 1);
      };
    }

    var queue = new Array(1000);
    function flush() {
      for (var i = 0; i < len; i += 2) {
        var callback = queue[i];
        var arg = queue[i + 1];

        callback(arg);

        queue[i] = undefined;
        queue[i + 1] = undefined;
      }

      len = 0;
    }

    function attemptVertx() {
      try {
        var r = require;
        var vertx = __webpack_require__(9);
        vertxNext = vertx.runOnLoop || vertx.runOnContext;
        return useVertxTimer();
      } catch (e) {
        return useSetTimeout();
      }
    }

    var scheduleFlush = undefined;
    // Decide what async method to use to triggering processing of queued callbacks:
    if (isNode) {
      scheduleFlush = useNextTick();
    } else if (BrowserMutationObserver) {
      scheduleFlush = useMutationObserver();
    } else if (isWorker) {
      scheduleFlush = useMessageChannel();
    } else if (browserWindow === undefined && "function" === 'function') {
      scheduleFlush = attemptVertx();
    } else {
      scheduleFlush = useSetTimeout();
    }

    function then(onFulfillment, onRejection) {
      var _arguments = arguments;

      var parent = this;

      var child = new this.constructor(noop);

      if (child[PROMISE_ID] === undefined) {
        makePromise(child);
      }

      var _state = parent._state;

      if (_state) {
        (function () {
          var callback = _arguments[_state - 1];
          asap(function () {
            return invokeCallback(_state, child, callback, parent._result);
          });
        })();
      } else {
        subscribe(parent, child, onFulfillment, onRejection);
      }

      return child;
    }

    /**
      `Promise.resolve` returns a promise that will become resolved with the
      passed `value`. It is shorthand for the following:

      ```javascript
      let promise = new Promise(function(resolve, reject){
        resolve(1);
      });

      promise.then(function(value){
        // value === 1
      });
      ```

      Instead of writing the above, your code now simply becomes the following:

      ```javascript
      let promise = Promise.resolve(1);

      promise.then(function(value){
        // value === 1
      });
      ```

      @method resolve
      @static
      @param {Any} value value that the returned promise will be resolved with
      Useful for tooling.
      @return {Promise} a promise that will become fulfilled with the given
      `value`
    */
    function resolve$1(object) {
      /*jshint validthis:true */
      var Constructor = this;

      if (object && typeof object === 'object' && object.constructor === Constructor) {
        return object;
      }

      var promise = new Constructor(noop);
      resolve(promise, object);
      return promise;
    }

    var PROMISE_ID = Math.random().toString(36).substring(16);

    function noop() {}

    var PENDING = void 0;
    var FULFILLED = 1;
    var REJECTED = 2;

    var GET_THEN_ERROR = new ErrorObject();

    function selfFulfillment() {
      return new TypeError("You cannot resolve a promise with itself");
    }

    function cannotReturnOwn() {
      return new TypeError('A promises callback cannot return that same promise.');
    }

    function getThen(promise) {
      try {
        return promise.then;
      } catch (error) {
        GET_THEN_ERROR.error = error;
        return GET_THEN_ERROR;
      }
    }

    function tryThen(then$$1, value, fulfillmentHandler, rejectionHandler) {
      try {
        then$$1.call(value, fulfillmentHandler, rejectionHandler);
      } catch (e) {
        return e;
      }
    }

    function handleForeignThenable(promise, thenable, then$$1) {
      asap(function (promise) {
        var sealed = false;
        var error = tryThen(then$$1, thenable, function (value) {
          if (sealed) {
            return;
          }
          sealed = true;
          if (thenable !== value) {
            resolve(promise, value);
          } else {
            fulfill(promise, value);
          }
        }, function (reason) {
          if (sealed) {
            return;
          }
          sealed = true;

          reject(promise, reason);
        }, 'Settle: ' + (promise._label || ' unknown promise'));

        if (!sealed && error) {
          sealed = true;
          reject(promise, error);
        }
      }, promise);
    }

    function handleOwnThenable(promise, thenable) {
      if (thenable._state === FULFILLED) {
        fulfill(promise, thenable._result);
      } else if (thenable._state === REJECTED) {
        reject(promise, thenable._result);
      } else {
        subscribe(thenable, undefined, function (value) {
          return resolve(promise, value);
        }, function (reason) {
          return reject(promise, reason);
        });
      }
    }

    function handleMaybeThenable(promise, maybeThenable, then$$1) {
      if (maybeThenable.constructor === promise.constructor && then$$1 === then && maybeThenable.constructor.resolve === resolve$1) {
        handleOwnThenable(promise, maybeThenable);
      } else {
        if (then$$1 === GET_THEN_ERROR) {
          reject(promise, GET_THEN_ERROR.error);
          GET_THEN_ERROR.error = null;
        } else if (then$$1 === undefined) {
          fulfill(promise, maybeThenable);
        } else if (isFunction(then$$1)) {
          handleForeignThenable(promise, maybeThenable, then$$1);
        } else {
          fulfill(promise, maybeThenable);
        }
      }
    }

    function resolve(promise, value) {
      if (promise === value) {
        reject(promise, selfFulfillment());
      } else if (objectOrFunction(value)) {
        handleMaybeThenable(promise, value, getThen(value));
      } else {
        fulfill(promise, value);
      }
    }

    function publishRejection(promise) {
      if (promise._onerror) {
        promise._onerror(promise._result);
      }

      publish(promise);
    }

    function fulfill(promise, value) {
      if (promise._state !== PENDING) {
        return;
      }

      promise._result = value;
      promise._state = FULFILLED;

      if (promise._subscribers.length !== 0) {
        asap(publish, promise);
      }
    }

    function reject(promise, reason) {
      if (promise._state !== PENDING) {
        return;
      }
      promise._state = REJECTED;
      promise._result = reason;

      asap(publishRejection, promise);
    }

    function subscribe(parent, child, onFulfillment, onRejection) {
      var _subscribers = parent._subscribers;
      var length = _subscribers.length;

      parent._onerror = null;

      _subscribers[length] = child;
      _subscribers[length + FULFILLED] = onFulfillment;
      _subscribers[length + REJECTED] = onRejection;

      if (length === 0 && parent._state) {
        asap(publish, parent);
      }
    }

    function publish(promise) {
      var subscribers = promise._subscribers;
      var settled = promise._state;

      if (subscribers.length === 0) {
        return;
      }

      var child = undefined,
          callback = undefined,
          detail = promise._result;

      for (var i = 0; i < subscribers.length; i += 3) {
        child = subscribers[i];
        callback = subscribers[i + settled];

        if (child) {
          invokeCallback(settled, child, callback, detail);
        } else {
          callback(detail);
        }
      }

      promise._subscribers.length = 0;
    }

    function ErrorObject() {
      this.error = null;
    }

    var TRY_CATCH_ERROR = new ErrorObject();

    function tryCatch(callback, detail) {
      try {
        return callback(detail);
      } catch (e) {
        TRY_CATCH_ERROR.error = e;
        return TRY_CATCH_ERROR;
      }
    }

    function invokeCallback(settled, promise, callback, detail) {
      var hasCallback = isFunction(callback),
          value = undefined,
          error = undefined,
          succeeded = undefined,
          failed = undefined;

      if (hasCallback) {
        value = tryCatch(callback, detail);

        if (value === TRY_CATCH_ERROR) {
          failed = true;
          error = value.error;
          value.error = null;
        } else {
          succeeded = true;
        }

        if (promise === value) {
          reject(promise, cannotReturnOwn());
          return;
        }
      } else {
        value = detail;
        succeeded = true;
      }

      if (promise._state !== PENDING) ; else if (hasCallback && succeeded) {
          resolve(promise, value);
        } else if (failed) {
          reject(promise, error);
        } else if (settled === FULFILLED) {
          fulfill(promise, value);
        } else if (settled === REJECTED) {
          reject(promise, value);
        }
    }

    function initializePromise(promise, resolver) {
      try {
        resolver(function resolvePromise(value) {
          resolve(promise, value);
        }, function rejectPromise(reason) {
          reject(promise, reason);
        });
      } catch (e) {
        reject(promise, e);
      }
    }

    var id = 0;
    function nextId() {
      return id++;
    }

    function makePromise(promise) {
      promise[PROMISE_ID] = id++;
      promise._state = undefined;
      promise._result = undefined;
      promise._subscribers = [];
    }

    function Enumerator$1(Constructor, input) {
      this._instanceConstructor = Constructor;
      this.promise = new Constructor(noop);

      if (!this.promise[PROMISE_ID]) {
        makePromise(this.promise);
      }

      if (isArray(input)) {
        this.length = input.length;
        this._remaining = input.length;

        this._result = new Array(this.length);

        if (this.length === 0) {
          fulfill(this.promise, this._result);
        } else {
          this.length = this.length || 0;
          this._enumerate(input);
          if (this._remaining === 0) {
            fulfill(this.promise, this._result);
          }
        }
      } else {
        reject(this.promise, validationError());
      }
    }

    function validationError() {
      return new Error('Array Methods must be provided an Array');
    }

    Enumerator$1.prototype._enumerate = function (input) {
      for (var i = 0; this._state === PENDING && i < input.length; i++) {
        this._eachEntry(input[i], i);
      }
    };

    Enumerator$1.prototype._eachEntry = function (entry, i) {
      var c = this._instanceConstructor;
      var resolve$$1 = c.resolve;

      if (resolve$$1 === resolve$1) {
        var _then = getThen(entry);

        if (_then === then && entry._state !== PENDING) {
          this._settledAt(entry._state, i, entry._result);
        } else if (typeof _then !== 'function') {
          this._remaining--;
          this._result[i] = entry;
        } else if (c === Promise$2) {
          var promise = new c(noop);
          handleMaybeThenable(promise, entry, _then);
          this._willSettleAt(promise, i);
        } else {
          this._willSettleAt(new c(function (resolve$$1) {
            return resolve$$1(entry);
          }), i);
        }
      } else {
        this._willSettleAt(resolve$$1(entry), i);
      }
    };

    Enumerator$1.prototype._settledAt = function (state, i, value) {
      var promise = this.promise;

      if (promise._state === PENDING) {
        this._remaining--;

        if (state === REJECTED) {
          reject(promise, value);
        } else {
          this._result[i] = value;
        }
      }

      if (this._remaining === 0) {
        fulfill(promise, this._result);
      }
    };

    Enumerator$1.prototype._willSettleAt = function (promise, i) {
      var enumerator = this;

      subscribe(promise, undefined, function (value) {
        return enumerator._settledAt(FULFILLED, i, value);
      }, function (reason) {
        return enumerator._settledAt(REJECTED, i, reason);
      });
    };

    /**
      `Promise.all` accepts an array of promises, and returns a new promise which
      is fulfilled with an array of fulfillment values for the passed promises, or
      rejected with the reason of the first passed promise to be rejected. It casts all
      elements of the passed iterable to promises as it runs this algorithm.

      Example:

      ```javascript
      let promise1 = resolve(1);
      let promise2 = resolve(2);
      let promise3 = resolve(3);
      let promises = [ promise1, promise2, promise3 ];

      Promise.all(promises).then(function(array){
        // The array here would be [ 1, 2, 3 ];
      });
      ```

      If any of the `promises` given to `all` are rejected, the first promise
      that is rejected will be given as an argument to the returned promises's
      rejection handler. For example:

      Example:

      ```javascript
      let promise1 = resolve(1);
      let promise2 = reject(new Error("2"));
      let promise3 = reject(new Error("3"));
      let promises = [ promise1, promise2, promise3 ];

      Promise.all(promises).then(function(array){
        // Code here never runs because there are rejected promises!
      }, function(error) {
        // error.message === "2"
      });
      ```

      @method all
      @static
      @param {Array} entries array of promises
      @param {String} label optional string for labeling the promise.
      Useful for tooling.
      @return {Promise} promise that is fulfilled when all `promises` have been
      fulfilled, or rejected if any of them become rejected.
      @static
    */
    function all$1(entries) {
      return new Enumerator$1(this, entries).promise;
    }

    /**
      `Promise.race` returns a new promise which is settled in the same way as the
      first passed promise to settle.

      Example:

      ```javascript
      let promise1 = new Promise(function(resolve, reject){
        setTimeout(function(){
          resolve('promise 1');
        }, 200);
      });

      let promise2 = new Promise(function(resolve, reject){
        setTimeout(function(){
          resolve('promise 2');
        }, 100);
      });

      Promise.race([promise1, promise2]).then(function(result){
        // result === 'promise 2' because it was resolved before promise1
        // was resolved.
      });
      ```

      `Promise.race` is deterministic in that only the state of the first
      settled promise matters. For example, even if other promises given to the
      `promises` array argument are resolved, but the first settled promise has
      become rejected before the other promises became fulfilled, the returned
      promise will become rejected:

      ```javascript
      let promise1 = new Promise(function(resolve, reject){
        setTimeout(function(){
          resolve('promise 1');
        }, 200);
      });

      let promise2 = new Promise(function(resolve, reject){
        setTimeout(function(){
          reject(new Error('promise 2'));
        }, 100);
      });

      Promise.race([promise1, promise2]).then(function(result){
        // Code here never runs
      }, function(reason){
        // reason.message === 'promise 2' because promise 2 became rejected before
        // promise 1 became fulfilled
      });
      ```

      An example real-world use case is implementing timeouts:

      ```javascript
      Promise.race([ajax('foo.json'), timeout(5000)])
      ```

      @method race
      @static
      @param {Array} promises array of promises to observe
      Useful for tooling.
      @return {Promise} a promise which settles in the same way as the first passed
      promise to settle.
    */
    function race$1(entries) {
      /*jshint validthis:true */
      var Constructor = this;

      if (!isArray(entries)) {
        return new Constructor(function (_, reject) {
          return reject(new TypeError('You must pass an array to race.'));
        });
      } else {
        return new Constructor(function (resolve, reject) {
          var length = entries.length;
          for (var i = 0; i < length; i++) {
            Constructor.resolve(entries[i]).then(resolve, reject);
          }
        });
      }
    }

    /**
      `Promise.reject` returns a promise rejected with the passed `reason`.
      It is shorthand for the following:

      ```javascript
      let promise = new Promise(function(resolve, reject){
        reject(new Error('WHOOPS'));
      });

      promise.then(function(value){
        // Code here doesn't run because the promise is rejected!
      }, function(reason){
        // reason.message === 'WHOOPS'
      });
      ```

      Instead of writing the above, your code now simply becomes the following:

      ```javascript
      let promise = Promise.reject(new Error('WHOOPS'));

      promise.then(function(value){
        // Code here doesn't run because the promise is rejected!
      }, function(reason){
        // reason.message === 'WHOOPS'
      });
      ```

      @method reject
      @static
      @param {Any} reason value that the returned promise will be rejected with.
      Useful for tooling.
      @return {Promise} a promise rejected with the given `reason`.
    */
    function reject$1(reason) {
      /*jshint validthis:true */
      var Constructor = this;
      var promise = new Constructor(noop);
      reject(promise, reason);
      return promise;
    }

    function needsResolver() {
      throw new TypeError('You must pass a resolver function as the first argument to the promise constructor');
    }

    function needsNew() {
      throw new TypeError("Failed to construct 'Promise': Please use the 'new' operator, this object constructor cannot be called as a function.");
    }

    /**
      Promise objects represent the eventual result of an asynchronous operation. The
      primary way of interacting with a promise is through its `then` method, which
      registers callbacks to receive either a promise's eventual value or the reason
      why the promise cannot be fulfilled.

      Terminology
      -----------

      - `promise` is an object or function with a `then` method whose behavior conforms to this specification.
      - `thenable` is an object or function that defines a `then` method.
      - `value` is any legal JavaScript value (including undefined, a thenable, or a promise).
      - `exception` is a value that is thrown using the throw statement.
      - `reason` is a value that indicates why a promise was rejected.
      - `settled` the final resting state of a promise, fulfilled or rejected.

      A promise can be in one of three states: pending, fulfilled, or rejected.

      Promises that are fulfilled have a fulfillment value and are in the fulfilled
      state.  Promises that are rejected have a rejection reason and are in the
      rejected state.  A fulfillment value is never a thenable.

      Promises can also be said to *resolve* a value.  If this value is also a
      promise, then the original promise's settled state will match the value's
      settled state.  So a promise that *resolves* a promise that rejects will
      itself reject, and a promise that *resolves* a promise that fulfills will
      itself fulfill.


      Basic Usage:
      ------------

      ```js
      let promise = new Promise(function(resolve, reject) {
        // on success
        resolve(value);

        // on failure
        reject(reason);
      });

      promise.then(function(value) {
        // on fulfillment
      }, function(reason) {
        // on rejection
      });
      ```

      Advanced Usage:
      ---------------

      Promises shine when abstracting away asynchronous interactions such as
      `XMLHttpRequest`s.

      ```js
      function getJSON(url) {
        return new Promise(function(resolve, reject){
          let xhr = new XMLHttpRequest();

          xhr.open('GET', url);
          xhr.onreadystatechange = handler;
          xhr.responseType = 'json';
          xhr.setRequestHeader('Accept', 'application/json');
          xhr.send();

          function handler() {
            if (this.readyState === this.DONE) {
              if (this.status === 200) {
                resolve(this.response);
              } else {
                reject(new Error('getJSON: `' + url + '` failed with status: [' + this.status + ']'));
              }
            }
          };
        });
      }

      getJSON('/posts.json').then(function(json) {
        // on fulfillment
      }, function(reason) {
        // on rejection
      });
      ```

      Unlike callbacks, promises are great composable primitives.

      ```js
      Promise.all([
        getJSON('/posts'),
        getJSON('/comments')
      ]).then(function(values){
        values[0] // => postsJSON
        values[1] // => commentsJSON

        return values;
      });
      ```

      @class Promise
      @param {function} resolver
      Useful for tooling.
      @constructor
    */
    function Promise$2(resolver) {
      this[PROMISE_ID] = nextId();
      this._result = this._state = undefined;
      this._subscribers = [];

      if (noop !== resolver) {
        typeof resolver !== 'function' && needsResolver();
        this instanceof Promise$2 ? initializePromise(this, resolver) : needsNew();
      }
    }

    Promise$2.all = all$1;
    Promise$2.race = race$1;
    Promise$2.resolve = resolve$1;
    Promise$2.reject = reject$1;
    Promise$2._setScheduler = setScheduler;
    Promise$2._setAsap = setAsap;
    Promise$2._asap = asap;

    Promise$2.prototype = {
      constructor: Promise$2,

      /**
        The primary way of interacting with a promise is through its `then` method,
        which registers callbacks to receive either a promise's eventual value or the
        reason why the promise cannot be fulfilled.
      
        ```js
        findUser().then(function(user){
          // user is available
        }, function(reason){
          // user is unavailable, and you are given the reason why
        });
        ```
      
        Chaining
        --------
      
        The return value of `then` is itself a promise.  This second, 'downstream'
        promise is resolved with the return value of the first promise's fulfillment
        or rejection handler, or rejected if the handler throws an exception.
      
        ```js
        findUser().then(function (user) {
          return user.name;
        }, function (reason) {
          return 'default name';
        }).then(function (userName) {
          // If `findUser` fulfilled, `userName` will be the user's name, otherwise it
          // will be `'default name'`
        });
      
        findUser().then(function (user) {
          throw new Error('Found user, but still unhappy');
        }, function (reason) {
          throw new Error('`findUser` rejected and we're unhappy');
        }).then(function (value) {
          // never reached
        }, function (reason) {
          // if `findUser` fulfilled, `reason` will be 'Found user, but still unhappy'.
          // If `findUser` rejected, `reason` will be '`findUser` rejected and we're unhappy'.
        });
        ```
        If the downstream promise does not specify a rejection handler, rejection reasons will be propagated further downstream.
      
        ```js
        findUser().then(function (user) {
          throw new PedagogicalException('Upstream error');
        }).then(function (value) {
          // never reached
        }).then(function (value) {
          // never reached
        }, function (reason) {
          // The `PedgagocialException` is propagated all the way down to here
        });
        ```
      
        Assimilation
        ------------
      
        Sometimes the value you want to propagate to a downstream promise can only be
        retrieved asynchronously. This can be achieved by returning a promise in the
        fulfillment or rejection handler. The downstream promise will then be pending
        until the returned promise is settled. This is called *assimilation*.
      
        ```js
        findUser().then(function (user) {
          return findCommentsByAuthor(user);
        }).then(function (comments) {
          // The user's comments are now available
        });
        ```
      
        If the assimliated promise rejects, then the downstream promise will also reject.
      
        ```js
        findUser().then(function (user) {
          return findCommentsByAuthor(user);
        }).then(function (comments) {
          // If `findCommentsByAuthor` fulfills, we'll have the value here
        }, function (reason) {
          // If `findCommentsByAuthor` rejects, we'll have the reason here
        });
        ```
      
        Simple Example
        --------------
      
        Synchronous Example
      
        ```javascript
        let result;
      
        try {
          result = findResult();
          // success
        } catch(reason) {
          // failure
        }
        ```
      
        Errback Example
      
        ```js
        findResult(function(result, err){
          if (err) {
            // failure
          } else {
            // success
          }
        });
        ```
      
        Promise Example;
      
        ```javascript
        findResult().then(function(result){
          // success
        }, function(reason){
          // failure
        });
        ```
      
        Advanced Example
        --------------
      
        Synchronous Example
      
        ```javascript
        let author, books;
      
        try {
          author = findAuthor();
          books  = findBooksByAuthor(author);
          // success
        } catch(reason) {
          // failure
        }
        ```
      
        Errback Example
      
        ```js
      
        function foundBooks(books) {
      
        }
      
        function failure(reason) {
      
        }
      
        findAuthor(function(author, err){
          if (err) {
            failure(err);
            // failure
          } else {
            try {
              findBoooksByAuthor(author, function(books, err) {
                if (err) {
                  failure(err);
                } else {
                  try {
                    foundBooks(books);
                  } catch(reason) {
                    failure(reason);
                  }
                }
              });
            } catch(error) {
              failure(err);
            }
            // success
          }
        });
        ```
      
        Promise Example;
      
        ```javascript
        findAuthor().
          then(findBooksByAuthor).
          then(function(books){
            // found books
        }).catch(function(reason){
          // something went wrong
        });
        ```
      
        @method then
        @param {Function} onFulfilled
        @param {Function} onRejected
        Useful for tooling.
        @return {Promise}
      */
      then: then,

      /**
        `catch` is simply sugar for `then(undefined, onRejection)` which makes it the same
        as the catch block of a try/catch statement.
      
        ```js
        function findAuthor(){
          throw new Error('couldn't find that author');
        }
      
        // synchronous
        try {
          findAuthor();
        } catch(reason) {
          // something went wrong
        }
      
        // async with promises
        findAuthor().catch(function(reason){
          // something went wrong
        });
        ```
      
        @method catch
        @param {Function} onRejection
        Useful for tooling.
        @return {Promise}
      */
      'catch': function _catch(onRejection) {
        return this.then(null, onRejection);
      }
    };

    /*global self*/
    function polyfill$1() {
        var local = undefined;

        if (typeof global !== 'undefined') {
            local = global;
        } else if (typeof self !== 'undefined') {
            local = self;
        } else {
            try {
                local = Function('return this')();
            } catch (e) {
                throw new Error('polyfill failed because global object is unavailable in this environment');
            }
        }

        var P = local.Promise;

        if (P) {
            var promiseToString = null;
            try {
                promiseToString = Object.prototype.toString.call(P.resolve());
            } catch (e) {
                // silently ignored
            }

            if (promiseToString === '[object Promise]' && !P.cast) {
                return;
            }
        }

        local.Promise = Promise$2;
    }

    // Strange compat..
    Promise$2.polyfill = polyfill$1;
    Promise$2.Promise = Promise$2;

    return Promise$2;

    })));



    /* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(7), __webpack_require__(8)));

    /***/ }),
    /* 5 */
    /***/ (function(module, exports) {

    // removed by extract-text-webpack-plugin

    /***/ }),
    /* 6 */
    /***/ (function(module, exports, __webpack_require__) {


    Object.defineProperty(exports, "__esModule", {
      value: true
    });

    var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }(); /* global VERSION */

    __webpack_require__(5);

    var _es6Promise = __webpack_require__(4);

    var _es6Promise2 = _interopRequireDefault(_es6Promise);

    var _utils = __webpack_require__(0);

    var Utils = _interopRequireWildcard(_utils);

    var _api = __webpack_require__(1);

    var API = _interopRequireWildcard(_api);

    var _button = __webpack_require__(2);

    var _push = __webpack_require__(3);

    function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

    var Noty = function () {
      /**
       * @param {object} options
       * @return {Noty}
       */
      function Noty() {
        var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

        _classCallCheck(this, Noty);

        this.options = Utils.deepExtend({}, API.Defaults, options);

        if (API.Store[this.options.id]) {
          return API.Store[this.options.id];
        }

        this.id = this.options.id || Utils.generateID('bar');
        this.closeTimer = -1;
        this.barDom = null;
        this.layoutDom = null;
        this.progressDom = null;
        this.showing = false;
        this.shown = false;
        this.closed = false;
        this.closing = false;
        this.killable = this.options.timeout || this.options.closeWith.length > 0;
        this.hasSound = this.options.sounds.sources.length > 0;
        this.soundPlayed = false;
        this.listeners = {
          beforeShow: [],
          onShow: [],
          afterShow: [],
          onClose: [],
          afterClose: [],
          onClick: [],
          onHover: [],
          onTemplate: []
        };
        this.promises = {
          show: null,
          close: null
        };
        this.on('beforeShow', this.options.callbacks.beforeShow);
        this.on('onShow', this.options.callbacks.onShow);
        this.on('afterShow', this.options.callbacks.afterShow);
        this.on('onClose', this.options.callbacks.onClose);
        this.on('afterClose', this.options.callbacks.afterClose);
        this.on('onClick', this.options.callbacks.onClick);
        this.on('onHover', this.options.callbacks.onHover);
        this.on('onTemplate', this.options.callbacks.onTemplate);

        return this;
      }

      /**
       * @param {string} eventName
       * @param {function} cb
       * @return {Noty}
       */


      _createClass(Noty, [{
        key: 'on',
        value: function on(eventName) {
          var cb = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : function () {};

          if (typeof cb === 'function' && this.listeners.hasOwnProperty(eventName)) {
            this.listeners[eventName].push(cb);
          }

          return this;
        }

        /**
         * @return {Noty}
         */

      }, {
        key: 'show',
        value: function show() {
          var _this = this;

          if (this.showing || this.shown) {
            return this; // preventing multiple show
          }

          if (this.options.killer === true) {
            Noty.closeAll();
          } else if (typeof this.options.killer === 'string') {
            Noty.closeAll(this.options.killer);
          }

          var queueCounts = API.getQueueCounts(this.options.queue);

          if (queueCounts.current >= queueCounts.maxVisible || API.PageHidden && this.options.visibilityControl) {
            API.addToQueue(this);

            if (API.PageHidden && this.hasSound && Utils.inArray('docHidden', this.options.sounds.conditions)) {
              Utils.createAudioElements(this);
            }

            if (API.PageHidden && Utils.inArray('docHidden', this.options.titleCount.conditions)) {
              API.docTitle.increment();
            }

            return this;
          }

          API.Store[this.id] = this;

          API.fire(this, 'beforeShow');

          this.showing = true;

          if (this.closing) {
            this.showing = false;
            return this;
          }

          API.build(this);
          API.handleModal(this);

          if (this.options.force) {
            this.layoutDom.insertBefore(this.barDom, this.layoutDom.firstChild);
          } else {
            this.layoutDom.appendChild(this.barDom);
          }

          if (this.hasSound && !this.soundPlayed && Utils.inArray('docVisible', this.options.sounds.conditions)) {
            Utils.createAudioElements(this);
          }

          if (Utils.inArray('docVisible', this.options.titleCount.conditions)) {
            API.docTitle.increment();
          }

          this.shown = true;
          this.closed = false;

          // bind button events if any
          if (API.hasButtons(this)) {
            Object.keys(this.options.buttons).forEach(function (key) {
              var btn = _this.barDom.querySelector('#' + _this.options.buttons[key].id);
              Utils.addListener(btn, 'click', function (e) {
                Utils.stopPropagation(e);
                _this.options.buttons[key].cb(_this);
              });
            });
          }

          this.progressDom = this.barDom.querySelector('.noty_progressbar');

          if (Utils.inArray('click', this.options.closeWith)) {
            Utils.addClass(this.barDom, 'noty_close_with_click');
            Utils.addListener(this.barDom, 'click', function (e) {
              Utils.stopPropagation(e);
              API.fire(_this, 'onClick');
              _this.close();
            }, false);
          }

          Utils.addListener(this.barDom, 'mouseenter', function () {
            API.fire(_this, 'onHover');
          }, false);

          if (this.options.timeout) Utils.addClass(this.barDom, 'noty_has_timeout');
          if (this.options.progressBar) {
            Utils.addClass(this.barDom, 'noty_has_progressbar');
          }

          if (Utils.inArray('button', this.options.closeWith)) {
            Utils.addClass(this.barDom, 'noty_close_with_button');

            var closeButton = document.createElement('div');
            Utils.addClass(closeButton, 'noty_close_button');
            closeButton.innerHTML = '×';
            this.barDom.appendChild(closeButton);

            Utils.addListener(closeButton, 'click', function (e) {
              Utils.stopPropagation(e);
              _this.close();
            }, false);
          }

          API.fire(this, 'onShow');

          if (this.options.animation.open === null) {
            this.promises.show = new _es6Promise2.default(function (resolve) {
              resolve();
            });
          } else if (typeof this.options.animation.open === 'function') {
            this.promises.show = new _es6Promise2.default(this.options.animation.open.bind(this));
          } else {
            Utils.addClass(this.barDom, this.options.animation.open);
            this.promises.show = new _es6Promise2.default(function (resolve) {
              Utils.addListener(_this.barDom, Utils.animationEndEvents, function () {
                Utils.removeClass(_this.barDom, _this.options.animation.open);
                resolve();
              });
            });
          }

          this.promises.show.then(function () {
            var _t = _this;
            setTimeout(function () {
              API.openFlow(_t);
            }, 100);
          });

          return this;
        }

        /**
         * @return {Noty}
         */

      }, {
        key: 'stop',
        value: function stop() {
          API.dequeueClose(this);
          return this;
        }

        /**
         * @return {Noty}
         */

      }, {
        key: 'resume',
        value: function resume() {
          API.queueClose(this);
          return this;
        }

        /**
         * @param {int|boolean} ms
         * @return {Noty}
         */

      }, {
        key: 'setTimeout',
        value: function (_setTimeout) {
          function setTimeout(_x) {
            return _setTimeout.apply(this, arguments);
          }

          setTimeout.toString = function () {
            return _setTimeout.toString();
          };

          return setTimeout;
        }(function (ms) {
          this.stop();
          this.options.timeout = ms;

          if (this.barDom) {
            if (this.options.timeout) {
              Utils.addClass(this.barDom, 'noty_has_timeout');
            } else {
              Utils.removeClass(this.barDom, 'noty_has_timeout');
            }

            var _t = this;
            setTimeout(function () {
              // ugly fix for progressbar display bug
              _t.resume();
            }, 100);
          }

          return this;
        })

        /**
         * @param {string} html
         * @param {boolean} optionsOverride
         * @return {Noty}
         */

      }, {
        key: 'setText',
        value: function setText(html) {
          var optionsOverride = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;

          if (this.barDom) {
            this.barDom.querySelector('.noty_body').innerHTML = html;
          }

          if (optionsOverride) this.options.text = html;

          return this;
        }

        /**
         * @param {string} type
         * @param {boolean} optionsOverride
         * @return {Noty}
         */

      }, {
        key: 'setType',
        value: function setType(type) {
          var _this2 = this;

          var optionsOverride = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;

          if (this.barDom) {
            var classList = Utils.classList(this.barDom).split(' ');

            classList.forEach(function (c) {
              if (c.substring(0, 11) === 'noty_type__') {
                Utils.removeClass(_this2.barDom, c);
              }
            });

            Utils.addClass(this.barDom, 'noty_type__' + type);
          }

          if (optionsOverride) this.options.type = type;

          return this;
        }

        /**
         * @param {string} theme
         * @param {boolean} optionsOverride
         * @return {Noty}
         */

      }, {
        key: 'setTheme',
        value: function setTheme(theme) {
          var _this3 = this;

          var optionsOverride = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;

          if (this.barDom) {
            var classList = Utils.classList(this.barDom).split(' ');

            classList.forEach(function (c) {
              if (c.substring(0, 12) === 'noty_theme__') {
                Utils.removeClass(_this3.barDom, c);
              }
            });

            Utils.addClass(this.barDom, 'noty_theme__' + theme);
          }

          if (optionsOverride) this.options.theme = theme;

          return this;
        }

        /**
         * @return {Noty}
         */

      }, {
        key: 'close',
        value: function close() {
          var _this4 = this;

          if (this.closed) return this;

          if (!this.shown) {
            // it's in the queue
            API.removeFromQueue(this);
            return this;
          }

          API.fire(this, 'onClose');

          this.closing = true;

          if (this.options.animation.close === null || this.options.animation.close === false) {
            this.promises.close = new _es6Promise2.default(function (resolve) {
              resolve();
            });
          } else if (typeof this.options.animation.close === 'function') {
            this.promises.close = new _es6Promise2.default(this.options.animation.close.bind(this));
          } else {
            Utils.addClass(this.barDom, this.options.animation.close);
            this.promises.close = new _es6Promise2.default(function (resolve) {
              Utils.addListener(_this4.barDom, Utils.animationEndEvents, function () {
                if (_this4.options.force) {
                  Utils.remove(_this4.barDom);
                } else {
                  API.ghostFix(_this4);
                }
                resolve();
              });
            });
          }

          this.promises.close.then(function () {
            API.closeFlow(_this4);
            API.handleModalClose(_this4);
          });

          this.closed = true;

          return this;
        }

        // API functions

        /**
         * @param {boolean|string} queueName
         * @return {Noty}
         */

      }], [{
        key: 'closeAll',
        value: function closeAll() {
          var queueName = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : false;

          Object.keys(API.Store).forEach(function (id) {
            if (queueName) {
              if (API.Store[id].options.queue === queueName && API.Store[id].killable) {
                API.Store[id].close();
              }
            } else if (API.Store[id].killable) {
              API.Store[id].close();
            }
          });
          return this;
        }

        /**
         * @param {string} queueName
         * @return {Noty}
         */

      }, {
        key: 'clearQueue',
        value: function clearQueue() {
          var queueName = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 'global';

          if (API.Queues.hasOwnProperty(queueName)) {
            API.Queues[queueName].queue = [];
          }
          return this;
        }

        /**
         * @return {API.Queues}
         */

      }, {
        key: 'overrideDefaults',


        /**
         * @param {Object} obj
         * @return {Noty}
         */
        value: function overrideDefaults(obj) {
          API.Defaults = Utils.deepExtend({}, API.Defaults, obj);
          return this;
        }

        /**
         * @param {int} amount
         * @param {string} queueName
         * @return {Noty}
         */

      }, {
        key: 'setMaxVisible',
        value: function setMaxVisible() {
          var amount = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : API.DefaultMaxVisible;
          var queueName = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'global';

          if (!API.Queues.hasOwnProperty(queueName)) {
            API.Queues[queueName] = { maxVisible: amount, queue: [] };
          }

          API.Queues[queueName].maxVisible = amount;
          return this;
        }

        /**
         * @param {string} innerHtml
         * @param {String} classes
         * @param {Function} cb
         * @param {Object} attributes
         * @return {NotyButton}
         */

      }, {
        key: 'button',
        value: function button(innerHtml) {
          var classes = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
          var cb = arguments[2];
          var attributes = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : {};

          return new _button.NotyButton(innerHtml, classes, cb, attributes);
        }

        /**
         * @return {string}
         */

      }, {
        key: 'version',
        value: function version() {
          return "3.2.0-beta";
        }

        /**
         * @param {String} workerPath
         * @return {Push}
         */

      }, {
        key: 'Push',
        value: function Push(workerPath) {
          return new _push.Push(workerPath);
        }
      }, {
        key: 'Queues',
        get: function get() {
          return API.Queues;
        }

        /**
         * @return {API.PageHidden}
         */

      }, {
        key: 'PageHidden',
        get: function get() {
          return API.PageHidden;
        }
      }]);

      return Noty;
    }();

    // Document visibility change controller


    exports.default = Noty;
    if (typeof window !== 'undefined') {
      Utils.visibilityChangeFlow();
    }
    module.exports = exports['default'];

    /***/ }),
    /* 7 */
    /***/ (function(module, exports) {

    // shim for using process in browser
    var process = module.exports = {};

    // cached from whatever global is present so that test runners that stub it
    // don't break things.  But we need to wrap it in a try catch in case it is
    // wrapped in strict mode code which doesn't define any globals.  It's inside a
    // function because try/catches deoptimize in certain engines.

    var cachedSetTimeout;
    var cachedClearTimeout;

    function defaultSetTimout() {
        throw new Error('setTimeout has not been defined');
    }
    function defaultClearTimeout () {
        throw new Error('clearTimeout has not been defined');
    }
    (function () {
        try {
            if (typeof setTimeout === 'function') {
                cachedSetTimeout = setTimeout;
            } else {
                cachedSetTimeout = defaultSetTimout;
            }
        } catch (e) {
            cachedSetTimeout = defaultSetTimout;
        }
        try {
            if (typeof clearTimeout === 'function') {
                cachedClearTimeout = clearTimeout;
            } else {
                cachedClearTimeout = defaultClearTimeout;
            }
        } catch (e) {
            cachedClearTimeout = defaultClearTimeout;
        }
    } ());
    function runTimeout(fun) {
        if (cachedSetTimeout === setTimeout) {
            //normal enviroments in sane situations
            return setTimeout(fun, 0);
        }
        // if setTimeout wasn't available but was latter defined
        if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
            cachedSetTimeout = setTimeout;
            return setTimeout(fun, 0);
        }
        try {
            // when when somebody has screwed with setTimeout but no I.E. maddness
            return cachedSetTimeout(fun, 0);
        } catch(e){
            try {
                // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
                return cachedSetTimeout.call(null, fun, 0);
            } catch(e){
                // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
                return cachedSetTimeout.call(this, fun, 0);
            }
        }


    }
    function runClearTimeout(marker) {
        if (cachedClearTimeout === clearTimeout) {
            //normal enviroments in sane situations
            return clearTimeout(marker);
        }
        // if clearTimeout wasn't available but was latter defined
        if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
            cachedClearTimeout = clearTimeout;
            return clearTimeout(marker);
        }
        try {
            // when when somebody has screwed with setTimeout but no I.E. maddness
            return cachedClearTimeout(marker);
        } catch (e){
            try {
                // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
                return cachedClearTimeout.call(null, marker);
            } catch (e){
                // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
                // Some versions of I.E. have different rules for clearTimeout vs setTimeout
                return cachedClearTimeout.call(this, marker);
            }
        }



    }
    var queue = [];
    var draining = false;
    var currentQueue;
    var queueIndex = -1;

    function cleanUpNextTick() {
        if (!draining || !currentQueue) {
            return;
        }
        draining = false;
        if (currentQueue.length) {
            queue = currentQueue.concat(queue);
        } else {
            queueIndex = -1;
        }
        if (queue.length) {
            drainQueue();
        }
    }

    function drainQueue() {
        if (draining) {
            return;
        }
        var timeout = runTimeout(cleanUpNextTick);
        draining = true;

        var len = queue.length;
        while(len) {
            currentQueue = queue;
            queue = [];
            while (++queueIndex < len) {
                if (currentQueue) {
                    currentQueue[queueIndex].run();
                }
            }
            queueIndex = -1;
            len = queue.length;
        }
        currentQueue = null;
        draining = false;
        runClearTimeout(timeout);
    }

    process.nextTick = function (fun) {
        var args = new Array(arguments.length - 1);
        if (arguments.length > 1) {
            for (var i = 1; i < arguments.length; i++) {
                args[i - 1] = arguments[i];
            }
        }
        queue.push(new Item(fun, args));
        if (queue.length === 1 && !draining) {
            runTimeout(drainQueue);
        }
    };

    // v8 likes predictible objects
    function Item(fun, array) {
        this.fun = fun;
        this.array = array;
    }
    Item.prototype.run = function () {
        this.fun.apply(null, this.array);
    };
    process.title = 'browser';
    process.browser = true;
    process.env = {};
    process.argv = [];
    process.version = ''; // empty string to avoid regexp issues
    process.versions = {};

    function noop() {}

    process.on = noop;
    process.addListener = noop;
    process.once = noop;
    process.off = noop;
    process.removeListener = noop;
    process.removeAllListeners = noop;
    process.emit = noop;
    process.prependListener = noop;
    process.prependOnceListener = noop;

    process.listeners = function (name) { return [] };

    process.binding = function (name) {
        throw new Error('process.binding is not supported');
    };

    process.cwd = function () { return '/' };
    process.chdir = function (dir) {
        throw new Error('process.chdir is not supported');
    };
    process.umask = function() { return 0; };


    /***/ }),
    /* 8 */
    /***/ (function(module, exports) {

    var g;

    // This works in non-strict mode
    g = (function() {
    	return this;
    })();

    try {
    	// This works if eval is allowed (see CSP)
    	g = g || Function("return this")() || (1,eval)("this");
    } catch(e) {
    	// This works if the window reference is available
    	if(typeof window === "object")
    		g = window;
    }

    // g can still be undefined, but nothing to do about it...
    // We return undefined, instead of nothing here, so it's
    // easier to handle this case. if(!global) { ...}

    module.exports = g;


    /***/ }),
    /* 9 */
    /***/ (function(module, exports) {

    /* (ignored) */

    /***/ })
    /******/ ]);
    });

    });

    var Noty = unwrapExports(noty);

    const vec = ['laptops', 'periferico', 'servidor'];

    function getCategoria(id = 0) {
        return vec[id]
    }

    function notySuccess(msj = "") {

        new Noty({
            theme: "metroui",
            type: "success",
            timeout: 3000,
            text: msj
        }).show();

    }

    function notyDanger(msj = "", callback = () => {}) {
       
       const n = new Noty({
            text: msj,
            theme: "metroui",
            buttons: [
              Noty.button('SI', 'btn btn-success', function () {
                callback();
                n.close();
              }, {id: 'button1', 'data-status': 'ok'}),
          
              Noty.button('NO', 'btn btn-error', function () {             
                  n.close();
              })
            ]
          });

          n.show();

    }

    /* src\components\Form.svelte generated by Svelte v3.23.2 */
    const file = "src\\components\\Form.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[0] = list[i];
    	child_ctx[13] = i;
    	return child_ctx;
    }

    // (68:6) {#each vec as producto, i}
    function create_each_block(ctx) {
    	let option;
    	let t_value = /*producto*/ ctx[0] + "";
    	let t;
    	let option_value_value;

    	const block = {
    		c: function create() {
    			option = element("option");
    			t = text(t_value);
    			option.__value = option_value_value = /*i*/ ctx[13];
    			option.value = option.__value;
    			add_location(option, file, 68, 8, 1508);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, option, anchor);
    			append_dev(option, t);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(option);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(68:6) {#each vec as producto, i}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let form;
    	let div0;
    	let input0;
    	let t0;
    	let div1;
    	let textarea;
    	let t1;
    	let div2;
    	let input1;
    	let t2;
    	let div3;
    	let select;
    	let t3;
    	let button0;
    	let t4;
    	let t5;
    	let button1;
    	let t7;
    	let p;
    	let t8;
    	let mounted;
    	let dispose;
    	let each_value = vec;
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			form = element("form");
    			div0 = element("div");
    			input0 = element("input");
    			t0 = space();
    			div1 = element("div");
    			textarea = element("textarea");
    			t1 = space();
    			div2 = element("div");
    			input1 = element("input");
    			t2 = space();
    			div3 = element("div");
    			select = element("select");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t3 = space();
    			button0 = element("button");
    			t4 = text(/*tipoProceso*/ ctx[2]);
    			t5 = space();
    			button1 = element("button");
    			button1.textContent = "Reiniciar";
    			t7 = space();
    			p = element("p");
    			t8 = text(/*nameApp*/ ctx[1]);
    			attr_dev(input0, "type", "text");
    			attr_dev(input0, "placeholder", "Nombre Producto");
    			attr_dev(input0, "class", "form-control");
    			add_location(input0, file, 40, 4, 789);
    			attr_dev(div0, "class", "form-group");
    			add_location(div0, file, 39, 2, 759);
    			attr_dev(textarea, "id", "des-producto");
    			attr_dev(textarea, "rows", "3");
    			attr_dev(textarea, "placeholder", "Descripcion del producto");
    			attr_dev(textarea, "class", "form-control");
    			add_location(textarea, file, 48, 4, 964);
    			attr_dev(div1, "class", "form-group");
    			add_location(div1, file, 47, 2, 934);
    			attr_dev(input1, "type", "url");
    			attr_dev(input1, "id", "img-url-producto");
    			attr_dev(input1, "placeholder", "https://dev.martin.com");
    			attr_dev(input1, "class", "form-control");
    			add_location(input1, file, 57, 4, 1178);
    			attr_dev(div2, "class", "form-group");
    			add_location(div2, file, 56, 2, 1148);
    			attr_dev(select, "id", "cateroria");
    			attr_dev(select, "class", "form-control");
    			if (/*producto*/ ctx[0].categoria === void 0) add_render_callback(() => /*select_change_handler*/ ctx[8].call(select));
    			add_location(select, file, 66, 4, 1388);
    			attr_dev(div3, "class", "form-group");
    			add_location(div3, file, 65, 2, 1358);
    			attr_dev(button0, "class", "btn btn-secondary");
    			add_location(button0, file, 73, 2, 1591);
    			attr_dev(button1, "class", "btn btn-secondary");
    			add_location(button1, file, 75, 2, 1653);
    			add_location(form, file, 37, 0, 704);
    			attr_dev(p, "class", "mt-3");
    			add_location(p, file, 84, 0, 1802);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, form, anchor);
    			append_dev(form, div0);
    			append_dev(div0, input0);
    			set_input_value(input0, /*producto*/ ctx[0].nombre);
    			append_dev(form, t0);
    			append_dev(form, div1);
    			append_dev(div1, textarea);
    			set_input_value(textarea, /*producto*/ ctx[0].descripcion);
    			append_dev(form, t1);
    			append_dev(form, div2);
    			append_dev(div2, input1);
    			set_input_value(input1, /*producto*/ ctx[0].imgURL);
    			append_dev(form, t2);
    			append_dev(form, div3);
    			append_dev(div3, select);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(select, null);
    			}

    			select_option(select, /*producto*/ ctx[0].categoria);
    			append_dev(form, t3);
    			append_dev(form, button0);
    			append_dev(button0, t4);
    			append_dev(form, t5);
    			append_dev(form, button1);
    			insert_dev(target, t7, anchor);
    			insert_dev(target, p, anchor);
    			append_dev(p, t8);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input0, "input", /*input0_input_handler*/ ctx[5]),
    					listen_dev(textarea, "input", /*textarea_input_handler*/ ctx[6]),
    					listen_dev(input1, "input", /*input1_input_handler*/ ctx[7]),
    					listen_dev(select, "change", /*select_change_handler*/ ctx[8]),
    					listen_dev(button1, "click", prevent_default(/*click_handler*/ ctx[9]), false, true, false),
    					listen_dev(form, "submit", prevent_default(/*onSubmitHandler*/ ctx[4]), false, true, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*producto*/ 1 && input0.value !== /*producto*/ ctx[0].nombre) {
    				set_input_value(input0, /*producto*/ ctx[0].nombre);
    			}

    			if (dirty & /*producto*/ 1) {
    				set_input_value(textarea, /*producto*/ ctx[0].descripcion);
    			}

    			if (dirty & /*producto*/ 1) {
    				set_input_value(input1, /*producto*/ ctx[0].imgURL);
    			}

    			if (dirty & /*vec*/ 0) {
    				each_value = vec;
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(select, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}

    			if (dirty & /*producto*/ 1) {
    				select_option(select, /*producto*/ ctx[0].categoria);
    			}

    			if (dirty & /*tipoProceso*/ 4) set_data_dev(t4, /*tipoProceso*/ ctx[2]);
    			if (dirty & /*nameApp*/ 2) set_data_dev(t8, /*nameApp*/ ctx[1]);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(form);
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(t7);
    			if (detaching) detach_dev(p);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { nameApp } = $$props;
    	const dispatch = createEventDispatcher();

    	let { producto = {
    		id: "",
    		nombre: "",
    		descripcion: "",
    		categoria: 0,
    		imgURL: ""
    	} } = $$props;

    	const clearProducto = { ...producto };

    	const cleanProducto = () => {
    		$$invalidate(0, producto = { ...clearProducto });
    	};

    	const onSubmitHandler = e => {
    		if (producto.id) {
    			dispatch("productosUpdate");
    		} else {
    			dispatch("productosAdd");
    		}

    		cleanProducto();
    	};

    	const writable_props = ["nameApp", "producto"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Form> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Form", $$slots, []);

    	function input0_input_handler() {
    		producto.nombre = this.value;
    		$$invalidate(0, producto);
    	}

    	function textarea_input_handler() {
    		producto.descripcion = this.value;
    		$$invalidate(0, producto);
    	}

    	function input1_input_handler() {
    		producto.imgURL = this.value;
    		$$invalidate(0, producto);
    	}

    	function select_change_handler() {
    		producto.categoria = select_value(this);
    		$$invalidate(0, producto);
    	}

    	const click_handler = e => {
    		cleanProducto();
    	};

    	$$self.$set = $$props => {
    		if ("nameApp" in $$props) $$invalidate(1, nameApp = $$props.nameApp);
    		if ("producto" in $$props) $$invalidate(0, producto = $$props.producto);
    	};

    	$$self.$capture_state = () => ({
    		vec,
    		createEventDispatcher,
    		nameApp,
    		dispatch,
    		producto,
    		clearProducto,
    		cleanProducto,
    		onSubmitHandler,
    		tipoProceso
    	});

    	$$self.$inject_state = $$props => {
    		if ("nameApp" in $$props) $$invalidate(1, nameApp = $$props.nameApp);
    		if ("producto" in $$props) $$invalidate(0, producto = $$props.producto);
    		if ("tipoProceso" in $$props) $$invalidate(2, tipoProceso = $$props.tipoProceso);
    	};

    	let tipoProceso;

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*producto*/ 1) {
    			 $$invalidate(2, tipoProceso = producto.id ? "Editar producto" : "Guardar producto");
    		}
    	};

    	return [
    		producto,
    		nameApp,
    		tipoProceso,
    		cleanProducto,
    		onSubmitHandler,
    		input0_input_handler,
    		textarea_input_handler,
    		input1_input_handler,
    		select_change_handler,
    		click_handler
    	];
    }

    class Form extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, { nameApp: 1, producto: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Form",
    			options,
    			id: create_fragment.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*nameApp*/ ctx[1] === undefined && !("nameApp" in props)) {
    			console.warn("<Form> was created without expected prop 'nameApp'");
    		}
    	}

    	get nameApp() {
    		throw new Error("<Form>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set nameApp(value) {
    		throw new Error("<Form>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get producto() {
    		throw new Error("<Form>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set producto(value) {
    		throw new Error("<Form>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\components\CardList.svelte generated by Svelte v3.23.2 */
    const file$1 = "src\\components\\CardList.svelte";

    // (30:6) {:else}
    function create_else_block(ctx) {
    	let img;
    	let img_src_value;

    	const block = {
    		c: function create() {
    			img = element("img");
    			if (img.src !== (img_src_value = "img/no-product.png")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "");
    			attr_dev(img, "class", "img-fluid p-2");
    			attr_dev(img, "width", "100%");
    			add_location(img, file$1, 30, 8, 670);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, img, anchor);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(img);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(30:6) {:else}",
    		ctx
    	});

    	return block;
    }

    // (28:6) {#if imgURL}
    function create_if_block(ctx) {
    	let img;
    	let img_src_value;

    	const block = {
    		c: function create() {
    			img = element("img");
    			if (img.src !== (img_src_value = /*imgURL*/ ctx[4])) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "");
    			attr_dev(img, "class", "img-fluid p-2");
    			attr_dev(img, "width", "100%");
    			add_location(img, file$1, 28, 8, 583);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, img, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*imgURL*/ 16 && img.src !== (img_src_value = /*imgURL*/ ctx[4])) {
    				attr_dev(img, "src", img_src_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(img);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(28:6) {#if imgURL}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let div4;
    	let div3;
    	let div0;
    	let t0;
    	let div2;
    	let div1;
    	let h5;
    	let strong;
    	let t1;
    	let t2;
    	let span;
    	let small;
    	let t3_value = getCategoria(/*categoria*/ ctx[2]) + "";
    	let t3;
    	let t4;
    	let p;
    	let t5;
    	let t6;
    	let button0;
    	let t8;
    	let button1;
    	let mounted;
    	let dispose;

    	function select_block_type(ctx, dirty) {
    		if (/*imgURL*/ ctx[4]) return create_if_block;
    		return create_else_block;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			div4 = element("div");
    			div3 = element("div");
    			div0 = element("div");
    			if_block.c();
    			t0 = space();
    			div2 = element("div");
    			div1 = element("div");
    			h5 = element("h5");
    			strong = element("strong");
    			t1 = text(/*nombre*/ ctx[0]);
    			t2 = space();
    			span = element("span");
    			small = element("small");
    			t3 = text(t3_value);
    			t4 = space();
    			p = element("p");
    			t5 = text(/*descripcion*/ ctx[1]);
    			t6 = space();
    			button0 = element("button");
    			button0.textContent = "Delete";
    			t8 = space();
    			button1 = element("button");
    			button1.textContent = "Edit";
    			attr_dev(div0, "class", "col-md-4");
    			add_location(div0, file$1, 26, 4, 531);
    			add_location(strong, file$1, 40, 10, 898);
    			add_location(small, file$1, 42, 12, 955);
    			add_location(span, file$1, 41, 10, 935);
    			add_location(h5, file$1, 39, 8, 882);
    			attr_dev(p, "class", "card-text");
    			add_location(p, file$1, 45, 8, 1039);
    			attr_dev(button0, "class", "btn btn-danger");
    			add_location(button0, file$1, 46, 8, 1087);
    			attr_dev(button1, "class", "btn btn-secondary");
    			add_location(button1, file$1, 47, 8, 1167);
    			attr_dev(div1, "class", "card-body");
    			add_location(div1, file$1, 38, 6, 849);
    			attr_dev(div2, "class", "col-md-8");
    			add_location(div2, file$1, 37, 4, 819);
    			attr_dev(div3, "class", "row");
    			add_location(div3, file$1, 25, 2, 508);
    			attr_dev(div4, "class", "card m-2");
    			add_location(div4, file$1, 24, 0, 482);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div4, anchor);
    			append_dev(div4, div3);
    			append_dev(div3, div0);
    			if_block.m(div0, null);
    			append_dev(div3, t0);
    			append_dev(div3, div2);
    			append_dev(div2, div1);
    			append_dev(div1, h5);
    			append_dev(h5, strong);
    			append_dev(strong, t1);
    			append_dev(h5, t2);
    			append_dev(h5, span);
    			append_dev(span, small);
    			append_dev(small, t3);
    			append_dev(div1, t4);
    			append_dev(div1, p);
    			append_dev(p, t5);
    			append_dev(div1, t6);
    			append_dev(div1, button0);
    			append_dev(div1, t8);
    			append_dev(div1, button1);

    			if (!mounted) {
    				dispose = [
    					listen_dev(
    						button0,
    						"click",
    						function () {
    							if (is_function(/*eliminar*/ ctx[5](/*id*/ ctx[3]))) /*eliminar*/ ctx[5](/*id*/ ctx[3]).apply(this, arguments);
    						},
    						false,
    						false,
    						false
    					),
    					listen_dev(
    						button1,
    						"click",
    						function () {
    							if (is_function(/*actualizar*/ ctx[6](/*id*/ ctx[3]))) /*actualizar*/ ctx[6](/*id*/ ctx[3]).apply(this, arguments);
    						},
    						false,
    						false,
    						false
    					)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, [dirty]) {
    			ctx = new_ctx;

    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(div0, null);
    				}
    			}

    			if (dirty & /*nombre*/ 1) set_data_dev(t1, /*nombre*/ ctx[0]);
    			if (dirty & /*categoria*/ 4 && t3_value !== (t3_value = getCategoria(/*categoria*/ ctx[2]) + "")) set_data_dev(t3, t3_value);
    			if (dirty & /*descripcion*/ 2) set_data_dev(t5, /*descripcion*/ ctx[1]);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div4);
    			if_block.d();
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { nombre } = $$props;
    	let { descripcion } = $$props;
    	let { categoria } = $$props;
    	let { id } = $$props;
    	let { imgURL } = $$props;
    	const dispatch = createEventDispatcher();

    	const eliminar = id => {
    		dispatch("productoDelete", { id });
    	};

    	const actualizar = id => {
    		dispatch("productoUpdate", { producto: $$props });
    	};

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("CardList", $$slots, []);

    	$$self.$set = $$new_props => {
    		$$invalidate(8, $$props = assign(assign({}, $$props), exclude_internal_props($$new_props)));
    		if ("nombre" in $$new_props) $$invalidate(0, nombre = $$new_props.nombre);
    		if ("descripcion" in $$new_props) $$invalidate(1, descripcion = $$new_props.descripcion);
    		if ("categoria" in $$new_props) $$invalidate(2, categoria = $$new_props.categoria);
    		if ("id" in $$new_props) $$invalidate(3, id = $$new_props.id);
    		if ("imgURL" in $$new_props) $$invalidate(4, imgURL = $$new_props.imgURL);
    	};

    	$$self.$capture_state = () => ({
    		getCategoria,
    		createEventDispatcher,
    		nombre,
    		descripcion,
    		categoria,
    		id,
    		imgURL,
    		dispatch,
    		eliminar,
    		actualizar
    	});

    	$$self.$inject_state = $$new_props => {
    		$$invalidate(8, $$props = assign(assign({}, $$props), $$new_props));
    		if ("nombre" in $$props) $$invalidate(0, nombre = $$new_props.nombre);
    		if ("descripcion" in $$props) $$invalidate(1, descripcion = $$new_props.descripcion);
    		if ("categoria" in $$props) $$invalidate(2, categoria = $$new_props.categoria);
    		if ("id" in $$props) $$invalidate(3, id = $$new_props.id);
    		if ("imgURL" in $$props) $$invalidate(4, imgURL = $$new_props.imgURL);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$props = exclude_internal_props($$props);
    	return [nombre, descripcion, categoria, id, imgURL, eliminar, actualizar];
    }

    class CardList extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {
    			nombre: 0,
    			descripcion: 1,
    			categoria: 2,
    			id: 3,
    			imgURL: 4
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "CardList",
    			options,
    			id: create_fragment$1.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*nombre*/ ctx[0] === undefined && !("nombre" in props)) {
    			console.warn("<CardList> was created without expected prop 'nombre'");
    		}

    		if (/*descripcion*/ ctx[1] === undefined && !("descripcion" in props)) {
    			console.warn("<CardList> was created without expected prop 'descripcion'");
    		}

    		if (/*categoria*/ ctx[2] === undefined && !("categoria" in props)) {
    			console.warn("<CardList> was created without expected prop 'categoria'");
    		}

    		if (/*id*/ ctx[3] === undefined && !("id" in props)) {
    			console.warn("<CardList> was created without expected prop 'id'");
    		}

    		if (/*imgURL*/ ctx[4] === undefined && !("imgURL" in props)) {
    			console.warn("<CardList> was created without expected prop 'imgURL'");
    		}
    	}

    	get nombre() {
    		throw new Error("<CardList>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set nombre(value) {
    		throw new Error("<CardList>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get descripcion() {
    		throw new Error("<CardList>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set descripcion(value) {
    		throw new Error("<CardList>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get categoria() {
    		throw new Error("<CardList>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set categoria(value) {
    		throw new Error("<CardList>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get id() {
    		throw new Error("<CardList>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set id(value) {
    		throw new Error("<CardList>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get imgURL() {
    		throw new Error("<CardList>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set imgURL(value) {
    		throw new Error("<CardList>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\components\List.svelte generated by Svelte v3.23.2 */

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[1] = list[i];
    	return child_ctx;
    }

    // (24:0) {#each productos as producto}
    function create_each_block$1(ctx) {
    	let cardlist;
    	let current;
    	const cardlist_spread_levels = [/*producto*/ ctx[1]];
    	let cardlist_props = {};

    	for (let i = 0; i < cardlist_spread_levels.length; i += 1) {
    		cardlist_props = assign(cardlist_props, cardlist_spread_levels[i]);
    	}

    	cardlist = new CardList({ props: cardlist_props, $$inline: true });
    	cardlist.$on("productoDelete", /*productoDelete*/ ctx[2]);
    	cardlist.$on("productoUpdate", /*productoUpdate*/ ctx[3]);

    	const block = {
    		c: function create() {
    			create_component(cardlist.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(cardlist, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const cardlist_changes = (dirty & /*productos*/ 1)
    			? get_spread_update(cardlist_spread_levels, [get_spread_object(/*producto*/ ctx[1])])
    			: {};

    			cardlist.$set(cardlist_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(cardlist.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(cardlist.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(cardlist, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$1.name,
    		type: "each",
    		source: "(24:0) {#each productos as producto}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$2(ctx) {
    	let each_1_anchor;
    	let current;
    	let each_value = /*productos*/ ctx[0];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	const block = {
    		c: function create() {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, each_1_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*productos, productoDelete, productoUpdate*/ 13) {
    				each_value = /*productos*/ ctx[0];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$1(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block$1(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				group_outros();

    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(each_1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let { productos = [] } = $$props;
    	let { producto } = $$props;

    	const productoDelete = e => {
    		let id = e.detail.id;

    		notyDanger("Eliminado el producto ?", () => {
    			$$invalidate(0, productos = productos.filter(p => p.id != id));
    		});
    	};

    	const productoUpdate = e => {
    		$$invalidate(1, producto = e.detail.producto);
    	};

    	const writable_props = ["productos", "producto"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<List> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("List", $$slots, []);

    	$$self.$set = $$props => {
    		if ("productos" in $$props) $$invalidate(0, productos = $$props.productos);
    		if ("producto" in $$props) $$invalidate(1, producto = $$props.producto);
    	};

    	$$self.$capture_state = () => ({
    		CardList,
    		notyDanger,
    		productos,
    		producto,
    		productoDelete,
    		productoUpdate
    	});

    	$$self.$inject_state = $$props => {
    		if ("productos" in $$props) $$invalidate(0, productos = $$props.productos);
    		if ("producto" in $$props) $$invalidate(1, producto = $$props.producto);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [productos, producto, productoDelete, productoUpdate];
    }

    class List extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, { productos: 0, producto: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "List",
    			options,
    			id: create_fragment$2.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*producto*/ ctx[1] === undefined && !("producto" in props)) {
    			console.warn("<List> was created without expected prop 'producto'");
    		}
    	}

    	get productos() {
    		throw new Error("<List>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set productos(value) {
    		throw new Error("<List>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get producto() {
    		throw new Error("<List>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set producto(value) {
    		throw new Error("<List>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    var data = [
        {
          id: v4(),
          nombre: "HP Pavilion Notebook",
          descripcion: "HP Laptop",
          categoria: 0,
          imgURL: "https://co-media.hptiendaenlinea.com/catalog/product/cache/b3b166914d87ce343d4dc5ec5117b502/4/P/4PE56LA-3_T1562703405.png"
        },
        {
          id: v4(),
          nombre: "Mouse razer",
          descripcion: "game mouse",
          categoria: 1,
          imgURL: "https://windigitalpc.com/wp-content/uploads/2020/02/LD0004039202_2.jpg"
        },
        {
          id: v4(),
          nombre: "Mesa gamer",
          descripcion: "Mesa Plataform",
          categoria: 2,
          imgURL: "https://i.pinimg.com/originals/f6/55/87/f655875bfd2dd91d1157cb3d510d3890.png"
        }
    ];

    /* src\App.svelte generated by Svelte v3.23.2 */
    const file$2 = "src\\App.svelte";

    function create_fragment$3(ctx) {
    	let main;
    	let div9;
    	let div8;
    	let div3;
    	let div2;
    	let div0;
    	let h20;
    	let t1;
    	let div1;
    	let list;
    	let updating_productos;
    	let updating_producto;
    	let t2;
    	let div7;
    	let div6;
    	let div4;
    	let h21;
    	let t4;
    	let div5;
    	let form;
    	let updating_producto_1;
    	let current;

    	function list_productos_binding(value) {
    		/*list_productos_binding*/ ctx[5].call(null, value);
    	}

    	function list_producto_binding(value) {
    		/*list_producto_binding*/ ctx[6].call(null, value);
    	}

    	let list_props = {};

    	if (/*productos*/ ctx[1] !== void 0) {
    		list_props.productos = /*productos*/ ctx[1];
    	}

    	if (/*producto*/ ctx[2] !== void 0) {
    		list_props.producto = /*producto*/ ctx[2];
    	}

    	list = new List({ props: list_props, $$inline: true });
    	binding_callbacks.push(() => bind(list, "productos", list_productos_binding));
    	binding_callbacks.push(() => bind(list, "producto", list_producto_binding));

    	function form_producto_binding(value) {
    		/*form_producto_binding*/ ctx[7].call(null, value);
    	}

    	let form_props = { nameApp: /*name*/ ctx[0] };

    	if (/*producto*/ ctx[2] !== void 0) {
    		form_props.producto = /*producto*/ ctx[2];
    	}

    	form = new Form({ props: form_props, $$inline: true });
    	binding_callbacks.push(() => bind(form, "producto", form_producto_binding));
    	form.$on("productosAdd", /*productosAdd*/ ctx[3]);
    	form.$on("productosUpdate", /*productosUpdate*/ ctx[4]);

    	const block = {
    		c: function create() {
    			main = element("main");
    			div9 = element("div");
    			div8 = element("div");
    			div3 = element("div");
    			div2 = element("div");
    			div0 = element("div");
    			h20 = element("h2");
    			h20.textContent = "LSITA DE PRODUCTOS";
    			t1 = space();
    			div1 = element("div");
    			create_component(list.$$.fragment);
    			t2 = space();
    			div7 = element("div");
    			div6 = element("div");
    			div4 = element("div");
    			h21 = element("h2");
    			h21.textContent = "FORMULARIO DE PRODUCTOS";
    			t4 = space();
    			div5 = element("div");
    			create_component(form.$$.fragment);
    			add_location(h20, file$2, 48, 12, 1035);
    			attr_dev(div0, "class", "card-header");
    			add_location(div0, file$2, 47, 10, 996);
    			attr_dev(div1, "class", "card-body bg-light");
    			add_location(div1, file$2, 50, 10, 1092);
    			attr_dev(div2, "class", "card");
    			add_location(div2, file$2, 46, 8, 966);
    			attr_dev(div3, "class", "col-md-6 mt-5");
    			add_location(div3, file$2, 44, 6, 927);
    			add_location(h21, file$2, 60, 12, 1341);
    			attr_dev(div4, "class", "card-header");
    			add_location(div4, file$2, 59, 10, 1302);
    			attr_dev(div5, "class", "card-body");
    			add_location(div5, file$2, 62, 10, 1403);
    			attr_dev(div6, "class", "card");
    			add_location(div6, file$2, 58, 8, 1272);
    			attr_dev(div7, "class", "col-md-6 mt-5");
    			add_location(div7, file$2, 56, 6, 1233);
    			attr_dev(div8, "class", "row");
    			add_location(div8, file$2, 43, 4, 902);
    			attr_dev(div9, "class", "container p-4");
    			add_location(div9, file$2, 42, 2, 869);
    			add_location(main, file$2, 41, 0, 859);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, div9);
    			append_dev(div9, div8);
    			append_dev(div8, div3);
    			append_dev(div3, div2);
    			append_dev(div2, div0);
    			append_dev(div0, h20);
    			append_dev(div2, t1);
    			append_dev(div2, div1);
    			mount_component(list, div1, null);
    			append_dev(div8, t2);
    			append_dev(div8, div7);
    			append_dev(div7, div6);
    			append_dev(div6, div4);
    			append_dev(div4, h21);
    			append_dev(div6, t4);
    			append_dev(div6, div5);
    			mount_component(form, div5, null);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const list_changes = {};

    			if (!updating_productos && dirty & /*productos*/ 2) {
    				updating_productos = true;
    				list_changes.productos = /*productos*/ ctx[1];
    				add_flush_callback(() => updating_productos = false);
    			}

    			if (!updating_producto && dirty & /*producto*/ 4) {
    				updating_producto = true;
    				list_changes.producto = /*producto*/ ctx[2];
    				add_flush_callback(() => updating_producto = false);
    			}

    			list.$set(list_changes);
    			const form_changes = {};
    			if (dirty & /*name*/ 1) form_changes.nameApp = /*name*/ ctx[0];

    			if (!updating_producto_1 && dirty & /*producto*/ 4) {
    				updating_producto_1 = true;
    				form_changes.producto = /*producto*/ ctx[2];
    				add_flush_callback(() => updating_producto_1 = false);
    			}

    			form.$set(form_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(list.$$.fragment, local);
    			transition_in(form.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(list.$$.fragment, local);
    			transition_out(form.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			destroy_component(list);
    			destroy_component(form);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let { name } = $$props;

    	const productosAdd = event => {
    		const auxNewProducto = { ...producto, id: v4() };

    		//productos = productos.concat(auxNewProducto);
    		$$invalidate(1, productos = [...productos, auxNewProducto]);

    		notySuccess("Producto Ingresado !!");
    	};

    	const productosUpdate = event => {
    		$$invalidate(1, productos = productos.map(e => e.id == producto.id ? producto : e));
    		notySuccess("Producto Actualizado !!");
    	};

    	const writable_props = ["name"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("App", $$slots, []);

    	function list_productos_binding(value) {
    		productos = value;
    		$$invalidate(1, productos);
    	}

    	function list_producto_binding(value) {
    		producto = value;
    		$$invalidate(2, producto);
    	}

    	function form_producto_binding(value) {
    		producto = value;
    		$$invalidate(2, producto);
    	}

    	$$self.$set = $$props => {
    		if ("name" in $$props) $$invalidate(0, name = $$props.name);
    	};

    	$$self.$capture_state = () => ({
    		uuidv4: v4,
    		Form,
    		List,
    		notySuccess,
    		data,
    		name,
    		productosAdd,
    		productosUpdate,
    		productos,
    		producto
    	});

    	$$self.$inject_state = $$props => {
    		if ("name" in $$props) $$invalidate(0, name = $$props.name);
    		if ("productos" in $$props) $$invalidate(1, productos = $$props.productos);
    		if ("producto" in $$props) $$invalidate(2, producto = $$props.producto);
    	};

    	let productos;
    	let producto;

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	 $$invalidate(1, productos = data);

    	 $$invalidate(2, producto = {
    		id: "",
    		nombre: "",
    		descripcion: "",
    		categoria: 0,
    		imgURL: ""
    	});

    	return [
    		name,
    		productos,
    		producto,
    		productosAdd,
    		productosUpdate,
    		list_productos_binding,
    		list_producto_binding,
    		form_producto_binding
    	];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, { name: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment$3.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*name*/ ctx[0] === undefined && !("name" in props)) {
    			console.warn("<App> was created without expected prop 'name'");
    		}
    	}

    	get name() {
    		throw new Error("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set name(value) {
    		throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    const app = new App({
    	target: document.body,
    	props: {
    		name: 'dev.martin CRUD Svelte v1.0'		
    	}
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
