
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

    function noop() { }
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
    let src_url_equal_anchor;
    function src_url_equal(element_src, url) {
        if (!src_url_equal_anchor) {
            src_url_equal_anchor = document.createElement('a');
        }
        src_url_equal_anchor.href = url;
        return element_src === src_url_equal_anchor.href;
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function validate_store(store, name) {
        if (store != null && typeof store.subscribe !== 'function') {
            throw new Error(`'${name}' is not a store with a 'subscribe' method`);
        }
    }
    function subscribe(store, ...callbacks) {
        if (store == null) {
            return noop;
        }
        const unsub = store.subscribe(...callbacks);
        return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);
    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        if (node.parentNode) {
            node.parentNode.removeChild(node);
        }
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
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
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
    function select_option(select, value, mounting) {
        for (let i = 0; i < select.options.length; i += 1) {
            const option = select.options[i];
            if (option.__value === value) {
                option.selected = true;
                return;
            }
        }
        if (!mounting || value !== undefined) {
            select.selectedIndex = -1; // no option should be selected
        }
    }
    function select_value(select) {
        const selected_option = select.querySelector(':checked');
        return selected_option && selected_option.__value;
    }
    function custom_event(type, detail, { bubbles = false, cancelable = false } = {}) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, cancelable, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }

    const dirty_components = [];
    const binding_callbacks = [];
    let render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = /* @__PURE__ */ Promise.resolve();
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
    // flush() calls callbacks in this order:
    // 1. All beforeUpdate callbacks, in order: parents before children
    // 2. All bind:this callbacks, in reverse order: children before parents.
    // 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
    //    for afterUpdates called during the initial onMount, which are called in
    //    reverse order: children before parents.
    // Since callbacks might update component values, which could trigger another
    // call to flush(), the following steps guard against this:
    // 1. During beforeUpdate, any updated components will be added to the
    //    dirty_components array and will cause a reentrant call to flush(). Because
    //    the flush index is kept outside the function, the reentrant call will pick
    //    up where the earlier call left off and go through all dirty components. The
    //    current_component value is saved and restored so that the reentrant call will
    //    not interfere with the "parent" flush() call.
    // 2. bind:this callbacks cannot trigger new flush() calls.
    // 3. During afterUpdate, any updated components will NOT have their afterUpdate
    //    callback called a second time; the seen_callbacks set, outside the flush()
    //    function, guarantees this behavior.
    const seen_callbacks = new Set();
    let flushidx = 0; // Do *not* move this inside the flush() function
    function flush() {
        // Do not reenter flush while dirty components are updated, as this can
        // result in an infinite loop. Instead, let the inner flush handle it.
        // Reentrancy is ok afterwards for bindings etc.
        if (flushidx !== 0) {
            return;
        }
        const saved_component = current_component;
        do {
            // first, call beforeUpdate functions
            // and update components
            try {
                while (flushidx < dirty_components.length) {
                    const component = dirty_components[flushidx];
                    flushidx++;
                    set_current_component(component);
                    update(component.$$);
                }
            }
            catch (e) {
                // reset dirty state to not end up in a deadlocked state and then rethrow
                dirty_components.length = 0;
                flushidx = 0;
                throw e;
            }
            set_current_component(null);
            dirty_components.length = 0;
            flushidx = 0;
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
        seen_callbacks.clear();
        set_current_component(saved_component);
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
    /**
     * Useful for example to execute remaining `afterUpdate` callbacks before executing `destroy`.
     */
    function flush_render_callbacks(fns) {
        const filtered = [];
        const targets = [];
        render_callbacks.forEach((c) => fns.indexOf(c) === -1 ? filtered.push(c) : targets.push(c));
        targets.forEach((c) => c());
        render_callbacks = filtered;
    }
    const outroing = new Set();
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = component.$$.on_mount.map(run).filter(is_function);
                // if the component was destroyed immediately
                // it will update the `$$.on_destroy` reference to `null`.
                // the destructured on_destroy may still reference to the old array
                if (component.$$.on_destroy) {
                    component.$$.on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            flush_render_callbacks($$.after_update);
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
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: [],
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
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
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            if (!is_function(callback)) {
                return noop;
            }
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.59.2' }, detail), { bubbles: true }));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation, has_stop_immediate_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        if (has_stop_immediate_propagation)
            modifiers.push('stopImmediatePropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.data === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
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
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* src/App.svelte generated by Svelte v3.59.2 */

    const { console: console_1 } = globals;
    const file = "src/App.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[20] = list[i];
    	return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[23] = list[i];
    	return child_ctx;
    }

    // (120:6) {:else}
    function create_else_block(ctx) {
    	let div4;
    	let h2;
    	let t1;
    	let div0;
    	let t3;
    	let input0;
    	let t4;
    	let div1;
    	let t6;
    	let input1;
    	let t7;
    	let div2;
    	let t9;
    	let input2;
    	let t10;
    	let div3;
    	let t12;
    	let select;
    	let option0;
    	let option1;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div4 = element("div");
    			h2 = element("h2");
    			h2.textContent = "Settings";
    			t1 = space();
    			div0 = element("div");
    			div0.textContent = "Name";
    			t3 = space();
    			input0 = element("input");
    			t4 = space();
    			div1 = element("div");
    			div1.textContent = "Location";
    			t6 = space();
    			input1 = element("input");
    			t7 = space();
    			div2 = element("div");
    			div2.textContent = "Openweathermap API key";
    			t9 = space();
    			input2 = element("input");
    			t10 = space();
    			div3 = element("div");
    			div3.textContent = "Units";
    			t12 = space();
    			select = element("select");
    			option0 = element("option");
    			option0.textContent = "metric";
    			option1 = element("option");
    			option1.textContent = "imperial";
    			attr_dev(h2, "id", "settings-header");
    			attr_dev(h2, "class", "svelte-1ym9pwo");
    			add_location(h2, file, 121, 10, 3299);
    			attr_dev(div0, "class", "label svelte-1ym9pwo");
    			add_location(div0, file, 122, 10, 3348);
    			attr_dev(input0, "type", "text");
    			attr_dev(input0, "class", "svelte-1ym9pwo");
    			add_location(input0, file, 123, 10, 3388);
    			attr_dev(div1, "class", "label svelte-1ym9pwo");
    			add_location(div1, file, 124, 10, 3446);
    			attr_dev(input1, "type", "text");
    			attr_dev(input1, "class", "svelte-1ym9pwo");
    			add_location(input1, file, 125, 10, 3490);
    			attr_dev(div2, "class", "label svelte-1ym9pwo");
    			add_location(div2, file, 126, 10, 3552);
    			attr_dev(input2, "type", "text");
    			attr_dev(input2, "class", "svelte-1ym9pwo");
    			add_location(input2, file, 127, 10, 3610);
    			attr_dev(div3, "class", "label svelte-1ym9pwo");
    			add_location(div3, file, 128, 10, 3670);
    			option0.__value = "metric";
    			option0.value = option0.__value;
    			add_location(option0, file, 130, 12, 3759);
    			option1.__value = "imperial";
    			option1.value = option1.__value;
    			add_location(option1, file, 131, 12, 3810);
    			attr_dev(select, "class", "svelte-1ym9pwo");
    			if (/*$config*/ ctx[9].units === void 0) add_render_callback(() => /*select_change_handler*/ ctx[16].call(select));
    			add_location(select, file, 129, 10, 3711);
    			attr_dev(div4, "id", "settings");
    			attr_dev(div4, "class", "svelte-1ym9pwo");
    			add_location(div4, file, 120, 8, 3269);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div4, anchor);
    			append_dev(div4, h2);
    			append_dev(div4, t1);
    			append_dev(div4, div0);
    			append_dev(div4, t3);
    			append_dev(div4, input0);
    			set_input_value(input0, /*$config*/ ctx[9].name);
    			append_dev(div4, t4);
    			append_dev(div4, div1);
    			append_dev(div4, t6);
    			append_dev(div4, input1);
    			set_input_value(input1, /*$config*/ ctx[9].location);
    			append_dev(div4, t7);
    			append_dev(div4, div2);
    			append_dev(div4, t9);
    			append_dev(div4, input2);
    			set_input_value(input2, /*$config*/ ctx[9].apiKey);
    			append_dev(div4, t10);
    			append_dev(div4, div3);
    			append_dev(div4, t12);
    			append_dev(div4, select);
    			append_dev(select, option0);
    			append_dev(select, option1);
    			select_option(select, /*$config*/ ctx[9].units, true);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input0, "input", /*input0_input_handler*/ ctx[13]),
    					listen_dev(input1, "input", /*input1_input_handler*/ ctx[14]),
    					listen_dev(input2, "input", /*input2_input_handler*/ ctx[15]),
    					listen_dev(select, "change", /*select_change_handler*/ ctx[16])
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*$config*/ 512 && input0.value !== /*$config*/ ctx[9].name) {
    				set_input_value(input0, /*$config*/ ctx[9].name);
    			}

    			if (dirty & /*$config*/ 512 && input1.value !== /*$config*/ ctx[9].location) {
    				set_input_value(input1, /*$config*/ ctx[9].location);
    			}

    			if (dirty & /*$config*/ 512 && input2.value !== /*$config*/ ctx[9].apiKey) {
    				set_input_value(input2, /*$config*/ ctx[9].apiKey);
    			}

    			if (dirty & /*$config*/ 512) {
    				select_option(select, /*$config*/ ctx[9].units);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div4);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(120:6) {:else}",
    		ctx
    	});

    	return block;
    }

    // (89:6) {#if !settings}
    function create_if_block(ctx) {
    	let div2;
    	let div0;
    	let h1;
    	let t0;
    	let t1;

    	let t2_value = (/*$config*/ ctx[9].name
    	? ", " + /*$config*/ ctx[9].name
    	: "") + "";

    	let t2;
    	let t3;
    	let t4;
    	let h2;
    	let t5;
    	let t6;
    	let t7;
    	let t8;
    	let div1;
    	let t9;
    	let div3;
    	let mounted;
    	let dispose;
    	let if_block = /*weather*/ ctx[2] && create_if_block_1(ctx);
    	let each_value = /*$config*/ ctx[9].links;
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			div0 = element("div");
    			h1 = element("h1");
    			t0 = text("Good ");
    			t1 = text(/*greeting*/ ctx[5]);
    			t2 = text(t2_value);
    			t3 = text(".");
    			t4 = space();
    			h2 = element("h2");
    			t5 = text("Today is ");
    			t6 = text(/*date*/ ctx[6]);
    			t7 = text(".");
    			t8 = space();
    			div1 = element("div");
    			if (if_block) if_block.c();
    			t9 = space();
    			div3 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(h1, "id", "greeting");
    			attr_dev(h1, "class", "svelte-1ym9pwo");
    			add_location(h1, file, 91, 12, 2240);
    			attr_dev(h2, "id", "date");
    			attr_dev(h2, "class", "svelte-1ym9pwo");
    			add_location(h2, file, 94, 12, 2361);
    			attr_dev(div0, "id", "heading");
    			attr_dev(div0, "class", "svelte-1ym9pwo");
    			add_location(div0, file, 90, 10, 2209);
    			attr_dev(div1, "id", "weather-container");
    			attr_dev(div1, "class", "svelte-1ym9pwo");
    			add_location(div1, file, 98, 10, 2560);
    			attr_dev(div2, "id", "heading-container");
    			attr_dev(div2, "class", "svelte-1ym9pwo");
    			add_location(div2, file, 89, 8, 2170);
    			attr_dev(div3, "id", "links");
    			attr_dev(div3, "class", "svelte-1ym9pwo");
    			add_location(div3, file, 106, 8, 2862);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div0);
    			append_dev(div0, h1);
    			append_dev(h1, t0);
    			append_dev(h1, t1);
    			append_dev(h1, t2);
    			append_dev(h1, t3);
    			append_dev(div0, t4);
    			append_dev(div0, h2);
    			append_dev(h2, t5);
    			append_dev(h2, t6);
    			append_dev(h2, t7);
    			append_dev(div2, t8);
    			append_dev(div2, div1);
    			if (if_block) if_block.m(div1, null);
    			insert_dev(target, t9, anchor);
    			insert_dev(target, div3, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				if (each_blocks[i]) {
    					each_blocks[i].m(div3, null);
    				}
    			}

    			if (!mounted) {
    				dispose = listen_dev(div1, "click", /*updateWeather*/ ctx[11], false, false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*greeting*/ 32) set_data_dev(t1, /*greeting*/ ctx[5]);

    			if (dirty & /*$config*/ 512 && t2_value !== (t2_value = (/*$config*/ ctx[9].name
    			? ", " + /*$config*/ ctx[9].name
    			: "") + "")) set_data_dev(t2, t2_value);

    			if (dirty & /*date*/ 64) set_data_dev(t6, /*date*/ ctx[6]);

    			if (/*weather*/ ctx[2]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block_1(ctx);
    					if_block.c();
    					if_block.m(div1, null);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}

    			if (dirty & /*$config*/ 512) {
    				each_value = /*$config*/ ctx[9].links;
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div3, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    			if (if_block) if_block.d();
    			if (detaching) detach_dev(t9);
    			if (detaching) detach_dev(div3);
    			destroy_each(each_blocks, detaching);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(89:6) {#if !settings}",
    		ctx
    	});

    	return block;
    }

    // (100:12) {#if weather}
    function create_if_block_1(ctx) {
    	let div0;
    	let t0;
    	let t1;
    	let t2;
    	let div1;
    	let t5;
    	let div2;
    	let div2_class_value;

    	const block = {
    		c: function create() {
    			div0 = element("div");
    			t0 = text(/*temperature*/ ctx[4]);
    			t1 = text("°");
    			t2 = space();
    			div1 = element("div");
    			div1.textContent = `in ${/*town*/ ctx[10]}`;
    			t5 = space();
    			div2 = element("div");
    			attr_dev(div0, "id", "temperature");
    			attr_dev(div0, "class", "svelte-1ym9pwo");
    			add_location(div0, file, 100, 14, 2654);
    			attr_dev(div1, "id", "location");
    			attr_dev(div1, "class", "svelte-1ym9pwo");
    			add_location(div1, file, 101, 14, 2711);
    			attr_dev(div2, "class", div2_class_value = "weather-icon " + /*weatherClass*/ ctx[3] + " svelte-1ym9pwo");
    			add_location(div2, file, 102, 14, 2760);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div0, anchor);
    			append_dev(div0, t0);
    			append_dev(div0, t1);
    			insert_dev(target, t2, anchor);
    			insert_dev(target, div1, anchor);
    			insert_dev(target, t5, anchor);
    			insert_dev(target, div2, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*temperature*/ 16) set_data_dev(t0, /*temperature*/ ctx[4]);

    			if (dirty & /*weatherClass*/ 8 && div2_class_value !== (div2_class_value = "weather-icon " + /*weatherClass*/ ctx[3] + " svelte-1ym9pwo")) {
    				attr_dev(div2, "class", div2_class_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div0);
    			if (detaching) detach_dev(t2);
    			if (detaching) detach_dev(div1);
    			if (detaching) detach_dev(t5);
    			if (detaching) detach_dev(div2);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(100:12) {#if weather}",
    		ctx
    	});

    	return block;
    }

    // (110:14) {#each column as link}
    function create_each_block_1(ctx) {
    	let a;
    	let span0;
    	let t0;
    	let span1;
    	let t1_value = /*link*/ ctx[23].name + "";
    	let t1;
    	let a_href_value;
    	let t2;
    	let br;

    	const block = {
    		c: function create() {
    			a = element("a");
    			span0 = element("span");
    			t0 = space();
    			span1 = element("span");
    			t1 = text(t1_value);
    			t2 = space();
    			br = element("br");
    			attr_dev(span0, "class", "arrow svelte-1ym9pwo");
    			add_location(span0, file, 111, 18, 3050);
    			attr_dev(span1, "class", "text svelte-1ym9pwo");
    			add_location(span1, file, 112, 18, 3091);
    			attr_dev(a, "href", a_href_value = /*link*/ ctx[23].url);
    			attr_dev(a, "class", "svelte-1ym9pwo");
    			add_location(a, file, 110, 16, 3012);
    			add_location(br, file, 114, 16, 3166);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, a, anchor);
    			append_dev(a, span0);
    			append_dev(a, t0);
    			append_dev(a, span1);
    			append_dev(span1, t1);
    			insert_dev(target, t2, anchor);
    			insert_dev(target, br, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*$config*/ 512 && t1_value !== (t1_value = /*link*/ ctx[23].name + "")) set_data_dev(t1, t1_value);

    			if (dirty & /*$config*/ 512 && a_href_value !== (a_href_value = /*link*/ ctx[23].url)) {
    				attr_dev(a, "href", a_href_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(a);
    			if (detaching) detach_dev(t2);
    			if (detaching) detach_dev(br);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1.name,
    		type: "each",
    		source: "(110:14) {#each column as link}",
    		ctx
    	});

    	return block;
    }

    // (108:10) {#each $config.links as column}
    function create_each_block(ctx) {
    	let div;
    	let t;
    	let each_value_1 = /*column*/ ctx[20];
    	validate_each_argument(each_value_1);
    	let each_blocks = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
    	}

    	const block = {
    		c: function create() {
    			div = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t = space();
    			attr_dev(div, "class", "link-column svelte-1ym9pwo");
    			add_location(div, file, 108, 12, 2933);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				if (each_blocks[i]) {
    					each_blocks[i].m(div, null);
    				}
    			}

    			append_dev(div, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*$config*/ 512) {
    				each_value_1 = /*column*/ ctx[20];
    				validate_each_argument(each_value_1);
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1(ctx, each_value_1, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div, t);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value_1.length;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(108:10) {#each $config.links as column}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let main;
    	let div3;
    	let div1;
    	let img;
    	let img_src_value;
    	let t0;
    	let div0;
    	let t1;
    	let t2;
    	let t3;
    	let t4;
    	let div2;
    	let t5;
    	let div4;
    	let button;
    	let t7;
    	let a;
    	let mounted;
    	let dispose;

    	function select_block_type(ctx, dirty) {
    		if (!/*settings*/ ctx[1]) return create_if_block;
    		return create_else_block;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			main = element("main");
    			div3 = element("div");
    			div1 = element("div");
    			img = element("img");
    			t0 = space();
    			div0 = element("div");
    			t1 = text(/*hours*/ ctx[8]);
    			t2 = text(":");
    			t3 = text(/*minutes*/ ctx[7]);
    			t4 = space();
    			div2 = element("div");
    			if_block.c();
    			t5 = space();
    			div4 = element("div");
    			button = element("button");
    			button.textContent = "settings";
    			t7 = space();
    			a = element("a");
    			a.textContent = "v1.2.2";
    			attr_dev(img, "id", "image");
    			if (!src_url_equal(img.src, img_src_value = "build/1.gif")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "");
    			attr_dev(img, "class", "svelte-1ym9pwo");
    			add_location(img, file, 84, 6, 2021);
    			attr_dev(div0, "id", "time");
    			attr_dev(div0, "class", "svelte-1ym9pwo");
    			add_location(div0, file, 85, 6, 2071);
    			attr_dev(div1, "id", "image-container");
    			attr_dev(div1, "class", "svelte-1ym9pwo");
    			add_location(div1, file, 83, 4, 1988);
    			attr_dev(div2, "id", "box");
    			attr_dev(div2, "class", "svelte-1ym9pwo");
    			add_location(div2, file, 87, 4, 2125);
    			attr_dev(div3, "id", "content");
    			attr_dev(div3, "class", "svelte-1ym9pwo");
    			add_location(div3, file, 82, 2, 1965);
    			attr_dev(button, "id", "settings-button");
    			attr_dev(button, "class", "svelte-1ym9pwo");
    			add_location(button, file, 138, 4, 3944);
    			attr_dev(a, "href", "/");
    			attr_dev(a, "id", "version");
    			attr_dev(a, "class", "svelte-1ym9pwo");
    			add_location(a, file, 141, 4, 4047);
    			attr_dev(div4, "id", "corner");
    			attr_dev(div4, "class", "svelte-1ym9pwo");
    			add_location(div4, file, 137, 2, 3922);
    			attr_dev(main, "class", "svelte-1ym9pwo");
    			add_location(main, file, 81, 0, 1956);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, div3);
    			append_dev(div3, div1);
    			append_dev(div1, img);
    			append_dev(div1, t0);
    			append_dev(div1, div0);
    			append_dev(div0, t1);
    			append_dev(div0, t2);
    			append_dev(div0, t3);
    			append_dev(div3, t4);
    			append_dev(div3, div2);
    			if_block.m(div2, null);
    			append_dev(main, t5);
    			append_dev(main, div4);
    			append_dev(div4, button);
    			append_dev(div4, t7);
    			append_dev(div4, a);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*click_handler*/ ctx[17], false, false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*hours*/ 256) set_data_dev(t1, /*hours*/ ctx[8]);
    			if (dirty & /*minutes*/ 128) set_data_dev(t3, /*minutes*/ ctx[7]);

    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(div2, null);
    				}
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			if_block.d();
    			mounted = false;
    			dispose();
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

    function twoDigits(n) {
    	return n < 10 ? "0" + n : n;
    }

    function instance($$self, $$props, $$invalidate) {
    	let hours;
    	let minutes;
    	let date;
    	let greeting;

    	let $config,
    		$$unsubscribe_config = noop,
    		$$subscribe_config = () => ($$unsubscribe_config(), $$unsubscribe_config = subscribe(config, $$value => $$invalidate(9, $config = $$value)), config);

    	$$self.$$.on_destroy.push(() => $$unsubscribe_config());
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);
    	let { config } = $$props;
    	validate_store(config, 'config');
    	$$subscribe_config();
    	let settings = false;
    	let d = new Date();
    	let weather;
    	let weatherClass = "none";
    	let temperature = 0;
    	let town = $config.location;

    	const timeInterval = setInterval(
    		() => {
    			$$invalidate(12, d = new Date());
    		},
    		1000
    	);

    	const weatherInterval = setInterval(
    		() => {
    			updateWeather();
    		},
    		300000
    	);

    	config.subscribe(value => {
    		updateWeather();
    	});

    	async function updateWeather() {
    		const res = await fetch(`http://api.openweathermap.org/data/2.5/weather?q=${$config.location}&units=${$config.units}&appid=${$config.apiKey}`);

    		if (!res.ok) {
    			// console.log(res);
    			console.warn("Your Openweathermap API key is probably missing or invalid.");

    			return;
    		}

    		$$invalidate(2, weather = await res.json());

    		// console.log(weather);
    		$$invalidate(4, temperature = Math.round(weather.main.temp));

    		if (weather.weather[0].main === "Clear") {
    			let time = Math.floor(d / 1000);

    			if (time < weather.sys.sunrise || time > weather.sys.sunset) {
    				$$invalidate(3, weatherClass = "moon");
    			} else {
    				$$invalidate(3, weatherClass = "sun");
    			}
    		} else if (weather.weather[0].main === "Rain" || weather.weather[0].main === "Drizzle" || weather.weather[0].main === "Thunderstorm") {
    			$$invalidate(3, weatherClass = "rain");
    		} else if (weather.weather[0].main === "Snow") {
    			$$invalidate(3, weatherClass = "snow");
    		} else {
    			$$invalidate(3, weatherClass = "cloud");
    		}
    	}

    	$$self.$$.on_mount.push(function () {
    		if (config === undefined && !('config' in $$props || $$self.$$.bound[$$self.$$.props['config']])) {
    			console_1.warn("<App> was created without expected prop 'config'");
    		}
    	});

    	const writable_props = ['config'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	function input0_input_handler() {
    		$config.name = this.value;
    		config.set($config);
    	}

    	function input1_input_handler() {
    		$config.location = this.value;
    		config.set($config);
    	}

    	function input2_input_handler() {
    		$config.apiKey = this.value;
    		config.set($config);
    	}

    	function select_change_handler() {
    		$config.units = select_value(this);
    		config.set($config);
    	}

    	const click_handler = () => $$invalidate(1, settings = !settings);

    	$$self.$$set = $$props => {
    		if ('config' in $$props) $$subscribe_config($$invalidate(0, config = $$props.config));
    	};

    	$$self.$capture_state = () => ({
    		config,
    		settings,
    		d,
    		weather,
    		weatherClass,
    		temperature,
    		town,
    		timeInterval,
    		weatherInterval,
    		updateWeather,
    		twoDigits,
    		greeting,
    		date,
    		minutes,
    		hours,
    		$config
    	});

    	$$self.$inject_state = $$props => {
    		if ('config' in $$props) $$subscribe_config($$invalidate(0, config = $$props.config));
    		if ('settings' in $$props) $$invalidate(1, settings = $$props.settings);
    		if ('d' in $$props) $$invalidate(12, d = $$props.d);
    		if ('weather' in $$props) $$invalidate(2, weather = $$props.weather);
    		if ('weatherClass' in $$props) $$invalidate(3, weatherClass = $$props.weatherClass);
    		if ('temperature' in $$props) $$invalidate(4, temperature = $$props.temperature);
    		if ('town' in $$props) $$invalidate(10, town = $$props.town);
    		if ('greeting' in $$props) $$invalidate(5, greeting = $$props.greeting);
    		if ('date' in $$props) $$invalidate(6, date = $$props.date);
    		if ('minutes' in $$props) $$invalidate(7, minutes = $$props.minutes);
    		if ('hours' in $$props) $$invalidate(8, hours = $$props.hours);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*d*/ 4096) {
    			$$invalidate(8, hours = twoDigits(d.getHours() % 12 === 0 ? 12 : d.getHours() % 12));
    		}

    		if ($$self.$$.dirty & /*d*/ 4096) {
    			$$invalidate(7, minutes = twoDigits(d.getMinutes()));
    		}

    		if ($$self.$$.dirty & /*d*/ 4096) {
    			$$invalidate(6, date = d.toLocaleDateString("en", {
    				weekday: "long",
    				year: "numeric",
    				month: "long",
    				day: "numeric"
    			}));
    		}

    		if ($$self.$$.dirty & /*d*/ 4096) {
    			$$invalidate(5, greeting = d.getHours() < 2
    			? "night"
    			: d.getHours() < 12
    				? "morning"
    				: d.getHours() < 18
    					? "afternoon"
    					: d.getHours() < 22 ? "evening" : "night");
    		}
    	};

    	return [
    		config,
    		settings,
    		weather,
    		weatherClass,
    		temperature,
    		greeting,
    		date,
    		minutes,
    		hours,
    		$config,
    		town,
    		updateWeather,
    		d,
    		input0_input_handler,
    		input1_input_handler,
    		input2_input_handler,
    		select_change_handler,
    		click_handler
    	];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, { config: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}

    	get config() {
    		throw new Error("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set config(value) {
    		throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    const subscriber_queue = [];
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=} start
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = new Set();
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (const subscriber of subscribers) {
                        subscriber[1]();
                        subscriber_queue.push(subscriber, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue.length; i += 2) {
                            subscriber_queue[i][0](subscriber_queue[i + 1]);
                        }
                        subscriber_queue.length = 0;
                    }
                }
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop) {
            const subscriber = [run, invalidate];
            subscribers.add(subscriber);
            if (subscribers.size === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                subscribers.delete(subscriber);
                if (subscribers.size === 0 && stop) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }

    const defaultConfig = {
      name: "USER",
      location: "London",
      units: "imperial",
      apiKey: "",
      links: [
        [
          { name: "gmail", url: "https://mail.google.com" },
          { name: "calendar", url: "https://calendar.google.com" },
          { name: "drive", url: "https://drive.google.com" },
          { name: "docs", url: "https://docs.google.com" },
        ],
        [
          { name: "github", url: "https://github.com" },
          { name: "translate", url: "https://translate.google.com" },
          { name: "finance", url: "https://finance.yahoo.com" },
          { name: "type", url: "https://monkeytype.com" },
        ],
        [
          { name: "youtube", url: "https://youtube.com" },
          { name: "twitch", url: "https://twitch.tv" },
          { name: "reddit", url: "https://reddit.com" },
          { name: "insta", url: "http://instagram.com" },
        ],
      ],
    };
    const storedConfig =
      JSON.parse(localStorage.getItem("config")) ?? defaultConfig;
    const config = writable(storedConfig);
    console.log(config);
    config.subscribe((value) => {
      localStorage.setItem("config", JSON.stringify(value));
    });

    const app = new App({
      target: document.body,
      props: {
        config: config,
      },
    });

    return app;

})();
//# sourceMappingURL=bundle.js.map
