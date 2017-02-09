// Requires:
//      utils/logger

(function (app) { 'use strict';

    // Controller for the text options side-slider
    // Constructor arguments:
    //      options: {
    //          root:   - root element ID
    //      }
    //      values: [   - array of id-proxy-type
    //          [   id,         element id to bind to
    //              proxy,      another array for objects, or getters/setters: value => value === undefined ? get() : set(value)
    //              type ]      input | select | checkbox | radio | object
    //      ]
    //      utils: {
    //      }
    function Options (options, values, utils) {

        const root = options.root || '#options';

        this._container = document.querySelector( root );

        const logError = app.Logger.moduleErrorPrinter( 'Options' );

        _values = values;
        _utils = utils;

        this._cssRules = [
            /*{
                name:        string, rule CSS name
                type:        [color, string], the type of control to represent the rule
                selector:    string, rule selector
                id:          string, control ID
                prefix:      string, the rule value prefix not to be shown in the control
                suffix:      string, the rule value suffix not to be shown in the control
                value:     [auto-filled] rule value
                initial:   [auto-filled] initial rule value
                editor:    [auto-filled] rule control
            }
            example:
                { name: 'color', type: 'color', selector: "#myElement", id: 'text', prefix: '#', suffix: '' },
            */
        ];

        this._style = document.createElement( 'style' );
        document.body.appendChild( this._style );

        const save = this._container.querySelector( '.save' );
        save.addEventListener( 'click', () => {
            getRulesFromEditors( this._style, this._cssRules );
            this._container.classList.remove( 'expanded' );

            saveSettings( this._cssRules );
        });

        const close = this._container.querySelector( '.close' );
        close.addEventListener( 'click', () => {
            getRulesFromEditors( this._style, this._cssRules );
            this._container.classList.remove( 'expanded' );
        });

        const reset = this._container.querySelector( '.reset' );
        reset.addEventListener( 'click', () => {
            localStorage.removeItem( 'options' );
            location.reload();
        });

        const slideoutTitle = this._container.querySelector( '.title');
        slideoutTitle.addEventListener( 'click', () => {
            this._container.classList.toggle( 'expanded' );
            setRulesToEditors( this._cssRules );
        });

        window.addEventListener( 'load', () => {
            loadSettings( this._cssRules );
            this._style.innerHTML = this._cssRules.reduce( function (css, rule) {
                return css + rule.selector + ' { ' + rule.name + ': ' + rule.initial + rule.suffix + ' !important; } ';
            }, '');

            obtainInitialRules( this._cssRules );

            bindSettingsToEditors( this._container );
            bindRulesToEditors( this._cssRules, this._container );
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

    function saveSettings (cssRules) {
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
            for (var r = 0; r < sheet.cssRules.length; r++) {
                var rule = sheet.cssRules[ r ];
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

        bindValue( 'userName', _values.userName );
        bindSelect( 'textID', _values.textID );
        bindCheckbox( 'hiddenText', _values.hideText );
        bindRadios( 'textAlign', _values.textAlign );
        bindRadios( 'lineSpacing', _values.textSpacing );

        bindCheckbox( 'showPointer', _values.showPointer );
        bindCheckbox( 'syllabificationEnabled', _values.syllabificationEnabled );
        bindValue( 'syllabificationThreshold', _values.syllabificationThreshold );
        bindCheckbox( 'syllabificationSmartThreshold', _values.syllabificationSmartThreshold );
        bindValue( 'syllabificationSmartThresholdMin', _values.syllabificationSmartThresholdMin );
        bindValue( 'syllabificationSmartThresholdMax', _values.syllabificationSmartThresholdMax );
        bindValue( 'syllabificationSmartThresholdFactor', _values.syllabificationSmartThresholdFactor );
        bindCheckbox( 'speechEnabled', _values.speechEnabled );
        bindValue( 'speechThreshold', _values.speechThreshold );
        bindCheckbox( 'highlightWord', _values.highlightWord );

        /*
        bindSelect( 'path_mapping', _values.path.mapping );

        bindSelect( 'path_colorMetric', _values.path.colorMetric );
        bindCheckbox( 'path_showIDs', _values.path.showIDs );
        bindCheckbox( 'path_showConnections', _values.path.showConnections );
        bindCheckbox( 'path_showSaccades', _values.path.showSaccades );
        bindCheckbox( 'path_showFixations', _values.path.showFixations );
        bindCheckbox( 'path_showOriginalFixLocation', _values.path.showOriginalFixLocation );

        bindSelect( 'wordGazing_colorMetric', _values.wordGazing.colorMetric );
        bindCheckbox( 'wordGazing_showFixations', _values.wordGazing.showFixations );
        bindCheckbox( 'wordGazing_uniteSpacings', _values.wordGazing.uniteSpacings );
        bindCheckbox( 'wordGazing_showRegressions', _values.wordGazing.showRegressions );
        */
    }

    app.Options = Options;

})( this.Reading || module.this.exports );
