// Requires:
//      utils/logger

(function( app ) { 'use strict';

    // Controller for the text options side-slider
    // Constructor arguments:
    //      options: {
    //          root:   - slideout element ID
    //          text:   - full text selector
    //      }
    //      values: {             - get/set values
    //          gazePlot {
    //              colorMetric (index)
    //              showIDs (bool)
    //              showConnections (bool)
    //              showSaccades (bool)
    //              showFixations (bool)
    //              showOriginalFixLocation (bool)
    //          }
    //          textSummary {
    //              colorMetric (index)
    //              showFixations (bool)
    //              showRegressions (bool)
    //          }
    //      }
    //      utils: {
    //      }
    function Options( options, values, utils ) {

        const root = options.root || '#options';

        this._slideout = document.querySelector( root );

        _values = values || {};

        // const logError = app.Logger.moduleErrorPrinter( 'Options' );

        // _values.gazePlot = _values.gazePlot || {};
        // _values.gazePlot.colorMetric = _values.gazePlot.colorMetric || logError( 'gazePlot.colorMetric"' );
        // _values.gazePlot.showConnections = _values.gazePlot.showConnections || logError( 'gazePlot.showConnections' );
        // _values.gazePlot.showSaccades = _values.gazePlot.showSaccades || logError( 'gazePlot.showSaccades' );
        // _values.gazePlot.showFixations = _values.gazePlot.showFixations || logError( 'gazePlot.showFixations' );
        // _values.gazePlot.showOriginalFixLocation = _values.gazePlot.showOriginalFixLocation || logError( 'gazePlot.showOriginalFixLocation' );

        // _values.textSummary = _values.textSummary || {};
        // _values.textSummary.colorMetric = _values.textSummary.colorMetric || logError( 'textSummary.colorMetric' );
        // _values.textSummary.showFixations = _values.textSummary.showFixations || logError( 'textSummary.showFixations' );
        // _values.textSummary.showRegressions = _values.textSummary.showRegressions || logError( 'textSummary.showRegressions' );

        _utils = utils;

        const cssRules = [
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

        const save = this._slideout.querySelector( '.save' );
        save.addEventListener( 'click', e => {
            getRulesFromEditors( this._style, cssRules );
            this._slideout.classList.remove( 'expanded' );

            saveSettings( cssRules );
        });

        const close = this._slideout.querySelector( '.close' );
        close.addEventListener( 'click', e => {
            getRulesFromEditors( this._style, cssRules );
            this._slideout.classList.remove( 'expanded' );
        });

        const reset = this._slideout.querySelector( '.reset' );
        reset.addEventListener( 'click', e => {
            localStorage.removeItem( 'options' );
            location.reload();
        });

        const slideoutTitle = this._slideout.querySelector( '.title');
        slideoutTitle.addEventListener( 'click', e => {
            this._slideout.classList.toggle( 'expanded' );
            setRulesToEditors( cssRules );
        });

        window.addEventListener( 'load', e => {
            loadSettings( cssRules );
            this._style.innerHTML = cssRules.reduce( (css, rule) => {
                return css + rule.selector + ' { ' + rule.name + ': ' + rule.initial + rule.suffix + ' !important; } ';
            }, '');

            obtainInitialRules( cssRules );

            bindSettingsToEditors( this._slideout );
            bindRulesToEditors( cssRules, this._slideout );
        });
    }

    // private

    let _values;
    let _utils;

    function loadSettings( cssRules ) {
        const options = JSON.parse( localStorage.getItem( 'readvis2_options' ) );
        if (!options) {
            return;
        }

        const pop = (storage, values) => {
            for (let name in storage) {
                if (name === 'css') {
                    continue;
                }
                else if (Array.isArray( storage[ name ] )) {
                    values[ name ]( storage[ name ] );
                }
                else if (typeof storage[ name ] === 'object') {
                    pop( storage[ name ], values[ name ] );
                }
                else if (values[ name ]) {
                    values[ name ]( storage[ name ] );
                }
            }
        };

        pop( options, _values );

        if (options.css) {
            let parts;
            const ruleInitilization = rule => {
                if (rule.selector === parts[0] && rule.name === parts[1]) {
                    rule.initial = options.css[ savedRule ];
                }
            };
            for (let savedRule in options.css) {
                parts = savedRule.split( '____' );
                cssRules.forEach( ruleInitilization );
            }
        }
    }

    function saveSettings( cssRules ) {
        const options = {};

        const push = (storage, values) => {
            for (let name in values) {
                if (typeof values[ name ] === 'function') {
                    storage[ name ] = values[ name ]();
                }
                else if (typeof values[ name ] === 'object') {
                    storage[ name ] = { };
                    push( storage[ name ], values[ name ] );
                }
            }
        };

        push( options, _values );

        options.css = {};
        cssRules.forEach( rule => {
            options.css[ rule.selector + '____' + rule.name ] = rule.value;
        });

        localStorage.setItem( 'readvis2_options', JSON.stringify( options) );
    }

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

    function bindRulesToEditors( rules, root ) {
        for (let i = 0; i < rules.length; i++) {
            const rule = rules[ i ];
            rule.editor = root.querySelector( '#' + rule.id );

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

    function bindCheckbox( el, ref ) {
        el.checked = ref();
        el.addEventListener( 'click', e => {
            ref( e.target.checked );
        });
    }

    function bindSelect( el, ref ) {
        el.selectedIndex = ref();
        el.addEventListener( 'change', e => {
            ref( e.target.selectedIndex );
        });
    }

    function bindValue( el, ref ) {
        el.value = ref();
        el.addEventListener( 'change', e => {
            ref( e.target.value );
        });
    }

    function bindRadios( els, ref ) {
        //const els = Array.from( _container.querySelectorAll( `input[name=${name}]` ) );
        els.forEach( (radio, index) => {
            radio.checked = ref() === index;
            radio.addEventListener( 'change', e => {
                ref( e.target.value );
            });
        });
    }

    function bindSettingsToEditors( root ) {
        const container = root.querySelector( '.options' );

        for (let visID in _values) {
            const vis = _values[ visID ];

            const group = document.createElement( 'div' );
            group.classList.add( 'group' );

            const name = document.createElement( 'div' );
            name.classList.add( 'name' );
            name.textContent = vis.name;
            group.appendChild( name );

            vis.options.forEach( option => {
                const row = document.createElement( 'div' );
                row.classList.add( 'row' );

                const label = document.createElement( 'div' );
                label.classList.add( 'label' );
                label.textContent = option.label;
                row.appendChild( label );

                const id =  vis.name + '_' + option.name;

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
                        option.ref( e.target.selectedIndex );
                    });

                    row.appendChild( select );
                }
                else if (option.type instanceof Boolean) {
                    const checkbox = document.createElement( 'input' );
                    checkbox.type = 'checkbox';
                    checkbox.classList.add( 'value' );
                    checkbox.classList.add( id );

                    checkbox.checked = option.ref();
                    checkbox.addEventListener( 'click', e => {
                        option.ref( e.target.checked );
                    });

                    row.appendChild( checkbox );
                }

                group.appendChild( row );
            });

            container.appendChild( group );
        }

        // bindSelect( 'gaze-plot_color-metric', _values.gazePlot.colorMetric );
        // bindCheckbox( 'gaze-plot_show-ids', _values.gazePlot.showIDs );
        // bindCheckbox( 'gaze-plot_show-connections', _values.gazePlot.showConnections );
        // bindCheckbox( 'gaze-plot_show-saccades', _values.gazePlot.showSaccades );
        // bindCheckbox( 'gaze-plot_show-fixations', _values.gazePlot.showFixations );
        // bindCheckbox( 'gaze-plot_show-original-fix-location', _values.gazePlot.showOriginalFixLocation );

        // bindSelect( 'gaze-plots_color-metric', _values.textSummary.colorMetric );
        // bindCheckbox( 'gaze-plots_show-fixations', _values.textSummary.showFixations );
        // bindCheckbox( 'gaze-plots_show-regressions', _values.textSummary.showRegressions );
    }

    app.Options = Options;

})( this.ReadVis2 || module.this.exports );
