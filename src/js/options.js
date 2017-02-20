// Requires:
//      utils/logger

(function( app ) { 'use strict';

    // Controller for the text options side-slider
    // Constructor arguments:
    //      options: {
    //          root:   - slideout element ID
    //          text:   - full text selector
    //      }
    //      values: {
    //      }
    //      utils: {
    //      }
    function Options( options, values, utils ) {
        Options.instance = this;

        _root = document.querySelector( options.root );

        _values = values || {};
        _utils = utils || {};

        _cssRules = [  // global css rules
            /*{
                name:        rule CSS name
                type:        the type of control to represent the rule
                selector:    rule selector
                id:          control ID
                prefix:      the rule value prefix not to be shown in the control
                suffix:      the rule value suffix not to be shown in the control
                value:     [auto-filled] rule value
                initial:   [auto-filled] initial rule value
                editor:    [auto-filled] rule control
            }*/
            /* example:
                { name: 'color', type: 'color', selector: options.text, id: 'text', prefix: '#', suffix: '' },
                { name: 'font-size', type: 'string', selector: options.text, id: 'fontSize', prefix: '', suffix: '' },
            */
        ];

        this._style = document.createElement( 'style' );
        document.body.appendChild( this._style );

        const save = _root.querySelector( '.save' );
        save.addEventListener( 'click', e => {
            getRulesFromEditors( this._style, _cssRules );
            _root.classList.add( 'invisible' );

            saveSettings( _cssRules );
            update();
        });

        const apply = _root.querySelector( '.apply' );
        apply.addEventListener( 'click', e => {
            getRulesFromEditors( this._style, _cssRules );
            update();
        });

        const reset = _root.querySelector( '.reset' );
        reset.addEventListener( 'click', e => {
            localStorage.removeItem( _id );
            location.reload();
        });

        window.addEventListener( 'load', e => {
            loadSettings( _cssRules );

            this._style.innerHTML = _cssRules.reduce( (css, rule) => {
                return css + rule.selector + ' { ' + rule.name + ': ' + rule.initial + rule.suffix + ' !important; } ';
            }, '');

            obtainInitialRules( _cssRules );

            bindSettingsToEditors();
            bindRulesToEditors( _cssRules );
        });
    }

    Options.instance = null;

    Options.prototype.show = function( activeVisID ) {
        show( null, activeVisID );
    }

    // private

    let _values;
    let _utils;
    let _cssRules;
    let _root;

    let _id = 'readvis2_options';

    // load-save

    function loadSettings( cssRules ) {
        const options = JSON.parse( localStorage.getItem( _id ) );
        if (!options) {
            return;
        }

        const pop = (storage, values) => {
            for (let name in storage) {
                if (name === 'css') {
                    continue;
                }
                // else if (Array.isArray( storage[ name ] )) {
                //     values[ name ]( storage[ name ] );
                // }
                const value = values[ name ];
                const saved = storage[ name ];
                if (!value) {
                    continue;
                }

                if (typeof saved === 'object') {
                    pop( saved, value );
                }
                else if (typeof value.ref === 'function') {
                    value.ref( saved );
                }
            }
        };

        pop( options, _values );

        if (options.css) {
            let parts;
            let savedRule;

            const ruleInitilization = rule => {
                if (rule.selector === parts[0] && rule.name === parts[1]) {
                    rule.initial = options.css[ savedRule ];
                }
            };
            for (savedRule in options.css) {
                parts = savedRule.split( '____' );
                cssRules.forEach( ruleInitilization );
            }
        }
    }

    function saveSettings( cssRules ) {
        const options = {};

        const push = (storage, values) => {
            for (let name in values) {
                const value = values[ name ];
                if (typeof value.ref === 'function') {
                    storage[ name ] = value.ref();
                }
                else if (typeof value === 'object') {
                    storage[ name ] = { };
                    push( storage[ name ], value );
                }
            }
        };

        push( options, _values );

        options.css = {};
        cssRules.forEach( rule => {
            options.css[ rule.selector + '____' + rule.name ] = rule.value;
        });

        localStorage.setItem( _id, JSON.stringify( options) );
    }

    function update() {
        for (let valueID in _values) {
            const val = _values[ valueID ];
            if (typeof val.update === 'function') {
                val.update();
            }
        }
    }

    function show( e, activeVisID ) {
        const groups = _root.querySelectorAll( '.group' );
        groups.forEach( group => {
            const id = group.id;
            if (id[0] === '_' || !activeVisID || id.indexOf( activeVisID ) === 0) {
                group.classList.remove( 'hidden' );
            }
            else {
                group.classList.add( 'hidden' );
            }
        });

        _root.classList.remove( 'invisible' );

        setRulesToEditors( _cssRules );
    };

    // color

    function componentToHex( c ) {
        const hex = c.toString(16);
        return hex.length == 1 ? "0" + hex : hex;
    }

    function rgbToHex( r, g, b ) {
        return '#' + componentToHex( r ) + componentToHex( g ) + componentToHex( b );
    }

    function cssColorToHex( cssColor ) {
        const colorRegex = /^\D+(\d+)\D+(\d+)\D+(\d+)\D+$/gim;
        const colorComps = colorRegex.exec( cssColor );

        return rgbToHex(
            parseInt( colorComps[ 1 ] ),
            parseInt( colorComps[ 2 ] ),
            parseInt( colorComps[ 3 ] ) );
    }

    function rgbaToHex( r, g, b, a ) {
        return {
            hex: '#' + componentToHex( r ) + componentToHex( g ) + componentToHex( b ),
            a: a === undefined ? 1 : a,
        };
    }

    function hexToRgba( rgb, a ) {
        const r = Number.parseInt( rgb.substr( 1, 2), 16 );
        const g = Number.parseInt( rgb.substr( 3, 2), 16 );
        const b = Number.parseInt( rgb.substr( 5, 2), 16 );
        return `rgba(${r},${g},${b},${a})`;
    }

    function cssColorToHex2( cssColor ) {
        const colorRegex = /^\D+(\d+)\D+(\d+)\D+(\d+)\D*(\d|.+)\D+$/gim;
        const colorComps = colorRegex.exec( cssColor );

        return rgbaToHex(
            parseInt( colorComps[ 1 ] ),
            parseInt( colorComps[ 2 ] ),
            parseInt( colorComps[ 3 ] ),
            colorComps[ 4 ] ? parseFloat( colorComps[ 4 ] ) : undefined );
    }

    function validateColor( color ) {
        if (color[0] !== '#') {
            return '#000000';
        }
        if (color.length === 7) {
            return color;
        }
        if (color.length === 4) {
            const r = color[1];
            const g = color[2];
            const b = color[3];
            return `#${r}${r}${g}${g}${b}${b}`;
        }
        return '#000000';
    }

    // css

    function cssToJS( cssName ) {
        let dashIndex = cssName.indexOf( '-' );
        while (dashIndex >= 0) {
            const char = cssName.charAt( dashIndex + 1);
            cssName = cssName.replace( '-' + char,  char.toUpperCase() );
            dashIndex = cssName.indexOf( '-' );
        }
        return cssName;
    }

    function obtainInitialRules( rules ) {
        for (let s = 0; s < document.styleSheets.length; s++) {
            const sheet = document.styleSheets[ s ];
            let cssRules;
            try {
                cssRules = sheet.cssRules;
            }
            catch (e) {
                continue;
            }

            for (let r = 0; r < cssRules.length; r++) {
                const rule = cssRules[ r ];
                if (!rule) {
                    continue;
                }

                for (let c = 0; c < rules.length; c++) {
                    const customRule = rules[ c ];
                    if (rule.selectorText === customRule.selector) {
                        if (customRule.initial === undefined) {
                            if (customRule.type === 'color') {
                                customRule.initial = cssColorToHex( rule.style.color );
                            }
                            else if (customRule.type === 'string') {
                                customRule.initial = rule.style[ cssToJS( customRule.name ) ];
                            }
                        }
                        customRule.value = customRule.initial;
                    }
                }
            }
        }
    }

    function bindRulesToEditors( rules ) {
        for (let i = 0; i < rules.length; i++) {
            const rule = rules[ i ];
            rule.editor = _root.querySelector( '#' + rule.id );

            if (rule.type === 'color') {
                rule.editor.value = rule.initial;  //color.fromString( rule.initial );
            }
            else if (rule.type === 'string') {
                rule.editor.value = rule.initial;
            }
        }
    }

    function getRulesFromEditors( style, rules ) {
        let styleText = '';
        for (let i = 0; i < rules.length; i++) {
            const rule = rules[ i ];
            if (rule.type === 'color') {
                rule.value = rule.editor.value; //'#' + rule.editor.color;
            }
            else if (rule.type === 'string') {
                rule.value = rule.editor.value;
            }
            styleText += rule.selector + ' { ' + rule.name + ': ' + rule.value + rule.suffix + ' !important; } ';
        }
        style.innerHTML = styleText;
    }

    function setRulesToEditors( rules ) {
        for (let i = 0; i < rules.length; i++) {
            const rule = rules[ i ];
            if (rule.type === 'color') {
                rule.editor.value = rule.value;//color.fromString( rules.value );
            }
            else if (rule.type === 'string') {
                rule.editor.value = rule.value;
            }
        }
    }

    // binders

    // function bindRadios( els, ref ) {
        //const els = Array.from( _container.querySelectorAll( `input[name=${name}]` ) );
    //     els.forEach( (radio, index) => {
    //         radio.checked = ref() === index;
    //         radio.addEventListener( 'change', e => {
    //             ref( e.target.value );
    //         });
    //     });
    // }

    function bindSettingsToEditors() {
        const container = _root.querySelector( '.options' );

        for (let visID in _values) {
            const vis = _values[ visID ];

            const group = document.createElement( 'div' );
            group.classList.add( 'group' );
            group.id = vis.id + '_group';

            const name = document.createElement( 'div' );
            name.classList.add( 'name' );
            name.textContent = vis.title;
            group.appendChild( name );

            for (let optionID in vis.options) {
                const option = vis.options[ optionID ];

                const row = document.createElement( 'div' );
                row.classList.add( 'row' );

                const label = document.createElement( 'div' );
                label.classList.add( 'label' );
                label.textContent = option.label;
                row.appendChild( label );

                const id =  vis.id + '_' + optionID;

                if (option.type instanceof Array) {
                    const select = document.createElement( 'select' );
                    select.classList.add( 'value' );
                    select.classList.add( id );

                    option.type.forEach( itemName => {
                        const item = document.createElement( 'option' );
                        item.value = itemName;
                        item.textContent = itemName;
                        select.appendChild( item );
                    });

                    select.selectedIndex = option.ref();
                    select.addEventListener( 'change', e => {
                        option.ref( option.type[ e.target.selectedIndex ] );
                    });

                    row.appendChild( select );
                }
                else if (option.type instanceof Boolean) {
                    const container = document.createElement( 'span' );

                    const checkbox = document.createElement( 'input' );
                    checkbox.type = 'checkbox';
                    checkbox.classList.add( id );

                    checkbox.checked = option.ref();
                    checkbox.addEventListener( 'click', e => {
                        option.ref( e.target.checked );
                    });

                    const label = document.createElement( 'label' );
                    const div = document.createElement( 'div' );
                    div.textContent = '\u2714';

                    label.appendChild( div );
                    container.appendChild( checkbox );
                    container.appendChild( label );
                    row.appendChild( container );
                }
                else if (option.type instanceof String) {
                    const isColor = option.type[0] === '#';

                    const input = document.createElement( 'input' );
                    input.type = isColor ? 'color' : 'text';
                    input.classList.add( 'value' );
                    input.classList.add( id );

                    const val = option.ref();
                    if (isColor) {
                        if (val[0] === '#') {
                            input.value = validateColor( val );
                            input.addEventListener( 'change', e => {
                                option.ref( e.target.value );
                            });
                        }
                        else {
                            const color = cssColorToHex2( val );
                            input.value = color.hex;
                            input.alpha = color.a;
                            input.addEventListener( 'change', e => {
                                option.ref( hexToRgba( e.target.value, e.target.alpha ) );
                            });
                        }
                    }
                    else {
                        input.value = val;
                        input.addEventListener( 'click', e => {
                            option.ref( e.target.value );
                        });
                    }

                    row.appendChild( input );
                }
                else if (option.type instanceof Number) {
                    const number = document.createElement( 'input' );
                    number.type = 'number';
                    number.step = +option.type;
                    number.classList.add( 'value' );
                    number.classList.add( id );

                    number.value = option.ref();
                    number.addEventListener( 'click', e => {
                        option.ref( e.target.value );
                    });

                    row.appendChild( number );
                }

                group.appendChild( row );
            }

            container.appendChild( group );
        }
    }

    app.Options = Options;

})( window.ReadVis2 || module.this.exports );
