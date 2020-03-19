
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':3000/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.head.appendChild(r) })(window.document);
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
    function create_slot(definition, ctx, $$scope, fn) {
        if (definition) {
            const slot_ctx = get_slot_context(definition, ctx, $$scope, fn);
            return definition[0](slot_ctx);
        }
    }
    function get_slot_context(definition, ctx, $$scope, fn) {
        return definition[1] && fn
            ? assign($$scope.ctx.slice(), definition[1](fn(ctx)))
            : $$scope.ctx;
    }
    function get_slot_changes(definition, $$scope, dirty, fn) {
        if (definition[2] && fn) {
            const lets = definition[2](fn(dirty));
            if ($$scope.dirty === undefined) {
                return lets;
            }
            if (typeof lets === 'object') {
                const merged = [];
                const len = Math.max($$scope.dirty.length, lets.length);
                for (let i = 0; i < len; i += 1) {
                    merged[i] = $$scope.dirty[i] | lets[i];
                }
                return merged;
            }
            return $$scope.dirty | lets;
        }
        return $$scope.dirty;
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
        if (value != null || input.value) {
            input.value = value;
        }
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
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }
    function afterUpdate(fn) {
        get_current_component().$$.after_update.push(fn);
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
    function tick() {
        schedule_update();
        return resolved_promise;
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
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

    const globals = (typeof window !== 'undefined' ? window : global);
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
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.20.1' }, detail)));
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
    function prop_dev(node, property, value) {
        node[property] = value;
        dispatch_dev("SvelteDOMSetProperty", { node, property, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.data === data)
            return;
        dispatch_dev("SvelteDOMSetData", { node: text, data });
        text.data = data;
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

    /* src\components\FormItem.svelte generated by Svelte v3.20.1 */

    const file = "src\\components\\FormItem.svelte";

    // (9:8) {#if icon}
    function create_if_block(ctx) {
    	let span;
    	let i;
    	let i_class_value;

    	const block = {
    		c: function create() {
    			span = element("span");
    			i = element("i");
    			attr_dev(i, "class", i_class_value = "fas fa-" + /*icon*/ ctx[1]);
    			add_location(i, file, 10, 16, 303);
    			attr_dev(span, "class", "icon is-small is-left");
    			add_location(span, file, 9, 12, 249);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    			append_dev(span, i);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*icon*/ 2 && i_class_value !== (i_class_value = "fas fa-" + /*icon*/ ctx[1])) {
    				attr_dev(i, "class", i_class_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(9:8) {#if icon}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let div1;
    	let label_1;
    	let t0;
    	let t1;
    	let div0;
    	let t2;
    	let current;
    	const default_slot_template = /*$$slots*/ ctx[3].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[2], null);
    	let if_block = /*icon*/ ctx[1] && create_if_block(ctx);

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			label_1 = element("label");
    			t0 = text(/*label*/ ctx[0]);
    			t1 = space();
    			div0 = element("div");
    			if (default_slot) default_slot.c();
    			t2 = space();
    			if (if_block) if_block.c();
    			attr_dev(label_1, "class", "label");
    			add_location(label_1, file, 5, 4, 98);
    			attr_dev(div0, "class", "control has-icons-left has-icons-right");
    			add_location(div0, file, 6, 4, 140);
    			attr_dev(div1, "class", "field");
    			add_location(div1, file, 4, 0, 73);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, label_1);
    			append_dev(label_1, t0);
    			append_dev(div1, t1);
    			append_dev(div1, div0);

    			if (default_slot) {
    				default_slot.m(div0, null);
    			}

    			append_dev(div0, t2);
    			if (if_block) if_block.m(div0, null);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (!current || dirty & /*label*/ 1) set_data_dev(t0, /*label*/ ctx[0]);

    			if (default_slot) {
    				if (default_slot.p && dirty & /*$$scope*/ 4) {
    					default_slot.p(get_slot_context(default_slot_template, ctx, /*$$scope*/ ctx[2], null), get_slot_changes(default_slot_template, /*$$scope*/ ctx[2], dirty, null));
    				}
    			}

    			if (/*icon*/ ctx[1]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block(ctx);
    					if_block.c();
    					if_block.m(div0, null);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    			if (default_slot) default_slot.d(detaching);
    			if (if_block) if_block.d();
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
    	let { label } = $$props;
    	let { icon = null } = $$props;
    	const writable_props = ["label", "icon"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<FormItem> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("FormItem", $$slots, ['default']);

    	$$self.$set = $$props => {
    		if ("label" in $$props) $$invalidate(0, label = $$props.label);
    		if ("icon" in $$props) $$invalidate(1, icon = $$props.icon);
    		if ("$$scope" in $$props) $$invalidate(2, $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => ({ label, icon });

    	$$self.$inject_state = $$props => {
    		if ("label" in $$props) $$invalidate(0, label = $$props.label);
    		if ("icon" in $$props) $$invalidate(1, icon = $$props.icon);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [label, icon, $$scope, $$slots];
    }

    class FormItem extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, { label: 0, icon: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "FormItem",
    			options,
    			id: create_fragment.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*label*/ ctx[0] === undefined && !("label" in props)) {
    			console.warn("<FormItem> was created without expected prop 'label'");
    		}
    	}

    	get label() {
    		throw new Error("<FormItem>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set label(value) {
    		throw new Error("<FormItem>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get icon() {
    		throw new Error("<FormItem>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set icon(value) {
    		throw new Error("<FormItem>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\show\Show.svelte generated by Svelte v3.20.1 */

    const { Object: Object_1, console: console_1 } = globals;
    const file$1 = "src\\show\\Show.svelte";

    // (114:2) <FormItem label={"Text"} >
    function create_default_slot(ctx) {
    	let div;
    	let input;
    	let dispose;

    	const block = {
    		c: function create() {
    			div = element("div");
    			input = element("input");
    			attr_dev(input, "id", "text");
    			input.required = true;
    			attr_dev(input, "class", "input svelte-18fubbk");
    			attr_dev(input, "type", "text");
    			attr_dev(input, "placeholder", "text");
    			add_location(input, file$1, 114, 24, 2727);
    			attr_dev(div, "class", "control svelte-18fubbk");
    			add_location(div, file$1, 114, 3, 2706);
    		},
    		m: function mount(target, anchor, remount) {
    			insert_dev(target, div, anchor);
    			append_dev(div, input);
    			set_input_value(input, /*options*/ ctx[0].text);
    			if (remount) dispose();
    			dispose = listen_dev(input, "input", /*input_input_handler*/ ctx[7]);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*options*/ 1 && input.value !== /*options*/ ctx[0].text) {
    				set_input_value(input, /*options*/ ctx[0].text);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot.name,
    		type: "slot",
    		source: "(114:2) <FormItem label={\\\"Text\\\"} >",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let div2;
    	let div0;
    	let t0;
    	let button0;
    	let t1;
    	let button0_disabled_value;
    	let t2;
    	let button1;
    	let t3;
    	let button1_disabled_value;
    	let t4;
    	let button2;
    	let t5;
    	let button2_disabled_value;
    	let t6;
    	let button3;
    	let t8;
    	let button4;
    	let t9;
    	let button4_disabled_value;
    	let t10;
    	let button5;
    	let t12;
    	let button6;
    	let t14;
    	let div1;
    	let img;
    	let img_src_value;
    	let current;
    	let dispose;

    	const formitem = new FormItem({
    			props: {
    				label: "Text",
    				$$slots: { default: [create_default_slot] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			div0 = element("div");
    			create_component(formitem.$$.fragment);
    			t0 = space();
    			button0 = element("button");
    			t1 = text("UPC-A");
    			t2 = space();
    			button1 = element("button");
    			t3 = text("EAN-13");
    			t4 = space();
    			button2 = element("button");
    			t5 = text("EAN-8");
    			t6 = space();
    			button3 = element("button");
    			button3.textContent = "QR Code";
    			t8 = space();
    			button4 = element("button");
    			t9 = text("Code 39");
    			t10 = space();
    			button5 = element("button");
    			button5.textContent = "Code 49";
    			t12 = space();
    			button6 = element("button");
    			button6.textContent = "Code 128";
    			t14 = space();
    			div1 = element("div");
    			img = element("img");
    			attr_dev(button0, "bcid", "upca");
    			button0.disabled = button0_disabled_value = /*upca*/ ctx[3] != true;
    			attr_dev(button0, "class", "button is-link svelte-18fubbk");
    			add_location(button0, file$1, 117, 2, 2851);
    			attr_dev(button1, "bcid", "ean13");
    			button1.disabled = button1_disabled_value = /*ean13*/ ctx[2] != true;
    			attr_dev(button1, "class", "button is-link svelte-18fubbk");
    			add_location(button1, file$1, 118, 2, 2959);
    			attr_dev(button2, "bcid", "ean8");
    			button2.disabled = button2_disabled_value = /*ean8*/ ctx[1] != true;
    			attr_dev(button2, "class", "button is-link svelte-18fubbk");
    			add_location(button2, file$1, 119, 2, 3070);
    			attr_dev(button3, "bcid", "qrcode");
    			attr_dev(button3, "class", "button is-link svelte-18fubbk");
    			add_location(button3, file$1, 121, 2, 3180);
    			attr_dev(button4, "bcid", "code39");
    			button4.disabled = button4_disabled_value = /*code39*/ ctx[4] != true;
    			attr_dev(button4, "class", "button is-link svelte-18fubbk");
    			add_location(button4, file$1, 122, 2, 3270);
    			attr_dev(button5, "bcid", "code49");
    			attr_dev(button5, "class", "button is-link svelte-18fubbk");
    			add_location(button5, file$1, 123, 2, 3384);
    			attr_dev(button6, "bcid", "code128");
    			attr_dev(button6, "class", "button is-link svelte-18fubbk");
    			add_location(button6, file$1, 124, 2, 3474);
    			attr_dev(div0, "class", "column is-two-thirds svelte-18fubbk");
    			add_location(div0, file$1, 112, 3, 2637);
    			attr_dev(img, "id", "image");
    			if (img.src !== (img_src_value = /*imageUrl*/ ctx[5])) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "not valid");
    			attr_dev(img, "class", "svelte-18fubbk");
    			add_location(img, file$1, 128, 2, 3600);
    			attr_dev(div1, "class", "column svelte-18fubbk");
    			add_location(div1, file$1, 127, 1, 3576);
    			attr_dev(div2, "class", "columns svelte-18fubbk");
    			add_location(div2, file$1, 111, 0, 2611);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor, remount) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div0);
    			mount_component(formitem, div0, null);
    			append_dev(div0, t0);
    			append_dev(div0, button0);
    			append_dev(button0, t1);
    			append_dev(div0, t2);
    			append_dev(div0, button1);
    			append_dev(button1, t3);
    			append_dev(div0, t4);
    			append_dev(div0, button2);
    			append_dev(button2, t5);
    			append_dev(div0, t6);
    			append_dev(div0, button3);
    			append_dev(div0, t8);
    			append_dev(div0, button4);
    			append_dev(button4, t9);
    			append_dev(div0, t10);
    			append_dev(div0, button5);
    			append_dev(div0, t12);
    			append_dev(div0, button6);
    			append_dev(div2, t14);
    			append_dev(div2, div1);
    			append_dev(div1, img);
    			current = true;
    			if (remount) run_all(dispose);

    			dispose = [
    				listen_dev(button0, "click", /*updateBarcode*/ ctx[6], false, false, false),
    				listen_dev(button1, "click", /*updateBarcode*/ ctx[6], false, false, false),
    				listen_dev(button2, "click", /*updateBarcode*/ ctx[6], false, false, false),
    				listen_dev(button3, "click", /*updateBarcode*/ ctx[6], false, false, false),
    				listen_dev(button4, "click", /*updateBarcode*/ ctx[6], false, false, false),
    				listen_dev(button5, "click", /*updateBarcode*/ ctx[6], false, false, false),
    				listen_dev(button6, "click", /*updateBarcode*/ ctx[6], false, false, false)
    			];
    		},
    		p: function update(ctx, [dirty]) {
    			const formitem_changes = {};

    			if (dirty & /*$$scope, options*/ 257) {
    				formitem_changes.$$scope = { dirty, ctx };
    			}

    			formitem.$set(formitem_changes);

    			if (!current || dirty & /*upca*/ 8 && button0_disabled_value !== (button0_disabled_value = /*upca*/ ctx[3] != true)) {
    				prop_dev(button0, "disabled", button0_disabled_value);
    			}

    			if (!current || dirty & /*ean13*/ 4 && button1_disabled_value !== (button1_disabled_value = /*ean13*/ ctx[2] != true)) {
    				prop_dev(button1, "disabled", button1_disabled_value);
    			}

    			if (!current || dirty & /*ean8*/ 2 && button2_disabled_value !== (button2_disabled_value = /*ean8*/ ctx[1] != true)) {
    				prop_dev(button2, "disabled", button2_disabled_value);
    			}

    			if (!current || dirty & /*code39*/ 16 && button4_disabled_value !== (button4_disabled_value = /*code39*/ ctx[4] != true)) {
    				prop_dev(button4, "disabled", button4_disabled_value);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(formitem.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(formitem.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    			destroy_component(formitem);
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

    function checksum_1(str) {
    	let checksum = 0;
    	let l = str.length;

    	for (var i = 0; i < l; i += 1) {
    		let ic = str.charCodeAt(i) - ("0").charCodeAt(0);

    		if (i % 2 != 0) {
    			checksum = checksum + ic;
    		} else {
    			checksum = checksum + ic * 3;
    		}
    	}

    	checksum = (10 - checksum % 10) % 10;
    	checksum = checksum + ("0").charCodeAt(0);
    	checksum = String.fromCharCode(checksum);
    	return checksum;
    }

    function checksum_2(str) {
    	let checksum = 0;
    	let l = str.length;

    	for (var i = 0; i < l; i += 1) {
    		let ic = str.charCodeAt(i) - ("0").charCodeAt(0);

    		if (i % 2 == 0) {
    			checksum = checksum + ic;
    		} else {
    			checksum = checksum + ic * 3;
    		}
    	}

    	checksum = (10 - checksum % 10) % 10;
    	checksum = checksum + ("0").charCodeAt(0);
    	checksum = String.fromCharCode(checksum);
    	return checksum;
    }

    function isValidUpca(text) {
    	if (text.match(/^\d+$/)) {
    		if (text.length == 11) return true; else if (text.length == 12) {
    			return checksum_1(text.slice(0, -1)) == text.slice(-1);
    		}
    	}

    	return false;
    }

    function isValidEan8(text) {
    	if (text.match(/^\d+$/)) {
    		if (text.length == 7) return true; else if (text.length == 8) {
    			return checksum_1(text.slice(0, -1)) == text.slice(-1);
    		}
    	}

    	return false;
    }

    function isValidEan13(text) {
    	if (text.match(/^\d+$/)) {
    		if (text.length == 12) return true; else if (text.length == 13) {
    			return checksum_2(text.slice(0, -1)) == text.slice(-1);
    		}
    	}

    	return false;
    }

    function isValidCode39(text) {
    	if (text.match(/^[0-9A-Z\+\-\*\/\%\.\$\s]*$/)) return true;
    	return false;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	onMount(async () => {
    		console.log("on mount");
    	});

    	let options = {
    		text: "sample",
    		bcid: "code128",
    		scaleX: 2,
    		scaleY: 2,
    		includetext: true,
    		includecheck: true
    	};

    	let ean8 = false;
    	let ean13 = false;
    	let upca = false;
    	let code39 = false;
    	let imageUrl = "/logo.png";

    	function updateBarcode(e) {
    		$$invalidate(0, options.bcid = e.currentTarget.getAttribute("bcid"), options);
    		let url = `http://localhost:3333/code/${options.text}.png?`;

    		for (let [k, v] of Object.entries(options)) {
    			if (k != "text") url = url + `${k}=${v}&`;
    		}

    		let img = document.getElementById("image");
    		img.src = url;
    		console.log(url);
    	}

    	const writable_props = [];

    	Object_1.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1.warn(`<Show> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Show", $$slots, []);

    	function input_input_handler() {
    		options.text = this.value;
    		$$invalidate(0, options);
    	}

    	$$self.$capture_state = () => ({
    		onMount,
    		afterUpdate,
    		tick,
    		FormItem,
    		options,
    		ean8,
    		ean13,
    		upca,
    		code39,
    		imageUrl,
    		checksum_1,
    		checksum_2,
    		isValidUpca,
    		isValidEan8,
    		isValidEan13,
    		isValidCode39,
    		updateBarcode
    	});

    	$$self.$inject_state = $$props => {
    		if ("options" in $$props) $$invalidate(0, options = $$props.options);
    		if ("ean8" in $$props) $$invalidate(1, ean8 = $$props.ean8);
    		if ("ean13" in $$props) $$invalidate(2, ean13 = $$props.ean13);
    		if ("upca" in $$props) $$invalidate(3, upca = $$props.upca);
    		if ("code39" in $$props) $$invalidate(4, code39 = $$props.code39);
    		if ("imageUrl" in $$props) $$invalidate(5, imageUrl = $$props.imageUrl);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*options*/ 1) {
    			 {
    				$$invalidate(1, ean8 = isValidEan8(options.text));
    				$$invalidate(2, ean13 = isValidEan13(options.text));
    				$$invalidate(3, upca = isValidUpca(options.text));
    				$$invalidate(4, code39 = isValidCode39(options.text));
    			}
    		}
    	};

    	return [
    		options,
    		ean8,
    		ean13,
    		upca,
    		code39,
    		imageUrl,
    		updateBarcode,
    		input_input_handler
    	];
    }

    class Show extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Show",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    const app = new Show({
    	target: document.getElementById("app"),
    });

    return app;

}());
//# sourceMappingURL=show.js.map
