// Requires:
//      utils/logger

(function (app) { 'use strict';

    // Controller for the text options side-slider
    // Constructor arguments:
    //      options: {
    //          root:   - slideout element ID
    //          text:   - full text selector
    //      }
    //      values: {             - get/set values
    //          gazePlot {
    //              colorMetric (index)
    //              mapping (index)
    //              showIDs (bool)
    //              showConnections (bool)
    //              showSaccades (bool)
    //              showFixations (bool)
    //              showOriginalFixLocation (bool)
    //          }
    //          gazePlots {
    //              colorMetric (index)
    //              showFixations (bool)
    //              uniteSpacings (bool)
    //              showRegressions (bool)
    //          }
    //      }
    //      utils: {
    //      }
    function Options (options, values, utils) {

        const root = options.root || '#options';

        this._slideout = document.querySelector( root );

        const logError = app.Logger.moduleErrorPrinter( 'Options' );

        _values = values;

        _values.gazePlot = _values.gazePlot || {};
        _values.gazePlot.colorMetric = _values.gazePlot.colorMetric || logError( 'gazePlot.colorMetric"' );
        _values.gazePlot.mapping = _values.gazePlot.mapping || logError( 'gazePlot.mapping"' );
        _values.gazePlot.showConnections = _values.gazePlot.showConnections || logError( 'gazePlot.showConnections' );
        _values.gazePlot.showSaccades = _values.gazePlot.showSaccades || logError( 'gazePlot.showSaccades' );
        _values.gazePlot.showFixations = _values.gazePlot.showFixations || logError( 'gazePlot.showFixations' );
        _values.gazePlot.showOriginalFixLocation = _values.gazePlot.showOriginalFixLocation || logError( 'gazePlot.showOriginalFixLocation' );

        _values.gazePlots = _values.gazePlots || {};
        _values.gazePlots.colorMetric = _values.gazePlots.colorMetric || logError( 'gazePlots.colorMetric' );
        _values.gazePlots.showFixations = _values.gazePlots.showFixations || logError( 'gazePlots.showFixations' );
        _values.gazePlots.uniteSpacings = _values.gazePlots.uniteSpacings || logError( 'gazePlots.uniteSpacings' );
        _values.gazePlots.showRegressions = _values.gazePlots.showRegressions || logError( 'gazePlots.showRegressions' );

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
        save.addEventListener( 'click', () => {
            getRulesFromEditors( this._style, cssRules );
            this._slideout.classList.remove( 'expanded' );

            saveSettings( cssRules );
        });

        const close = this._slideout.querySelector( '.close' );
        close.addEventListener( 'click', () => {
            getRulesFromEditors( this._style, cssRules );
            this._slideout.classList.remove( 'expanded' );
        });

        const reset = this._slideout.querySelector( '.reset' );
        reset.addEventListener( 'click', () => {
            localStorage.removeItem( 'options' );
            location.reload();
        });

        const slideoutTitle = this._slideout.querySelector( '.title');
        slideoutTitle.addEventListener( 'click', () => {
            this._slideout.classList.toggle( 'expanded' );
            setRulesToEditors( cssRules );
        });

        window.addEventListener( 'load', () => {
            loadSettings( cssRules );
            this._style.innerHTML = cssRules.reduce( function (css, rule) {
                return css + rule.selector + ' { ' + rule.name + ': ' + rule.initial + rule.suffix + ' !important; } ';
            }, '');

            obtainInitialRules( cssRules );

            bindSettingsToEditors( this._slideout );
            bindRulesToEditors( cssRules, this._slideout );
        });
    }

    // private

    var _values;
    var _utils;

    function loadSettings (cssRules) {
        var options = JSON.parse( localStorage.getItem('options') );
        if (!options) {
            return;
        }

        var values = _values;

        var pop = function (storage, srv) {
            for (var name in storage) {
                if (name === 'css') {
                    continue;
                }
                else if (Array.isArray( storage[ name ] )) {
                    srv[ name ]( storage[ name ] );
                }
                else if (typeof storage[ name ] === 'object') {
                    pop( storage[ name ], srv[ name ] );
                }
                else if (srv[ name ]) {
                    srv[ name ]( storage[ name ] );
                }
            }
        };

        pop( options, values );

        // for (var name in options) {
        //     if (_values[ name ]) {
        //         _values[ name ]( options[name] );
        //     }
        // }

        if (options.css) {
            var ruleInitilization = (rule) => {
                if (rule.selector === parts[0] && rule.name === parts[1]) {
                    rule.initial = options.css[ savedRule ];
                }
            };
            for (var savedRule in options.css) {
                var parts = savedRule.split( '____' );
                cssRules.forEach( ruleInitilization );
            }
        }
    }

    function saveSettings(cssRules) {
        var options = {};
        var values = _values;

        var push = function (storage, srv) {
            for (var name in srv) {
                if (typeof srv[ name ] === 'function') {
                    storage[ name ] = srv[ name ]();
                }
                else if (typeof srv[ name ] === 'object') {
                    storage[ name ] = { };
                    push( storage[ name ], srv[ name ] );
                }
            }
        };

        push( options, values );

        options.css = {};
        cssRules.forEach( function (rule) {
            options.css[ rule.selector + '____' + rule.name ] = rule.value;
        });

        localStorage.setItem( 'options', JSON.stringify( options) );
    }

    function componentToHex( c ) {
        var hex = c.toString(16);
        return hex.length == 1 ? "0" + hex : hex;
    }

    function rgbToHex( r, g, b ) {
        return '#' + componentToHex( r ) + componentToHex( g ) + componentToHex( b );
    }

    function cssColorToHex( cssColor ) {

        var colorRegex = /^\D+(\d+)\D+(\d+)\D+(\d+)\D+$/gim;
        var colorComps = colorRegex.exec( cssColor );

        return rgbToHex(
            parseInt( colorComps[ 1 ] ),
            parseInt( colorComps[ 2 ] ),
            parseInt( colorComps[ 3 ] ) );
    }

    function cssToJS( cssName ) {

        var dashIndex = cssName.indexOf( '-' );
        while (dashIndex >= 0) {
            var char = cssName.charAt( dashIndex + 1);
            cssName = cssName.replace( '-' + char,  char.toUpperCase() );
            dashIndex = cssName.indexOf( '-' );
        }
        return cssName;
    }

    function obtainInitialRules( rules ) {

        for (var s = 0; s < document.styleSheets.length; s++) {
            var sheet = document.styleSheets[ s ];
            let cssRules;
            try {
                cssRules = sheet.cssRules;
            }
            catch (e) {
                continue;
            }

            for (var r = 0; r < cssRules.length; r++) {
                var rule = cssRules[ r ];
                for (var c = 0; c < rules.length; c++) {
                    var customRule = rules[ c ];
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

        for (var i = 0; i < rules.length; i++) {
            var rule = rules[ i ];
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

        var styleText = '';
        for (var i = 0; i < rules.length; i++) {
            var rule = rules[ i ];
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

        for (var i = 0; i < rules.length; i++) {
            var rule = rules[ i ];
            if (rule.type === 'color') {
                rule.editor.value = rule.value;//color.fromString( rules.value );
            }
            else if (rule.type === 'string') {
                rule.editor.value = rule.value;
            }
        }
    }

    function bindSettingsToEditors( root ) {
        var bindCheckbox = (id, service) => {
            var flag = root.querySelector( '#' + id );
            flag.checked = service();
            flag.addEventListener( 'click', function () {
                service( this.checked );
            });
        };

        var bindSelect = (id, service) => {
            var select = root.querySelector( '#' + id );
            select.selectedIndex = service();
            select.addEventListener( 'change', function () {
                service( this.selectedIndex );
            });
        };

        var bindValue = (id, service) => {
            var text = root.querySelector( '#' + id );
            text.value = service();
            text.addEventListener( 'change', function () {
                service( this.value );
            });
        };

        var bindRadios = (name, service) => {
            var radioButtons = Array.from( root.querySelectorAll( `input[name=${name}]` ) );
            radioButtons.forEach( (radio, index) => {
                radio.checked = service() === index;
                radio.addEventListener( 'change', function () {
                    service( this.value );
                });
            });
        };

        bindSelect( 'gaze-plot_mapping', _values.gazePlot.mapping );

        bindSelect( 'gaze-plot_color-metric', _values.gazePlot.colorMetric );
        bindCheckbox( 'gaze-plot_show-ids', _values.gazePlot.showIDs );
        bindCheckbox( 'gaze-plot_show-connections', _values.gazePlot.showConnections );
        bindCheckbox( 'gaze-plot_show-saccades', _values.gazePlot.showSaccades );
        bindCheckbox( 'gaze-plot_show-fixations', _values.gazePlot.showFixations );
        bindCheckbox( 'gaze-plot_show-original-fix-location', _values.gazePlot.showOriginalFixLocation );

        bindSelect( 'gaze-plots_color-metric', _values.gazePlots.colorMetric );
        bindCheckbox( 'gaze-plots_show-fixations', _values.gazePlots.showFixations );
        bindCheckbox( 'gaze-plots_unite-spacings', _values.gazePlots.uniteSpacings );
        bindCheckbox( 'gaze-plots_show-regressions', _values.gazePlots.showRegressions );
    }

    app.Options = Options;

})( this.Reading || module.this.exports );
