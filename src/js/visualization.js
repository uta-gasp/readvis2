// Base for visualizations
//
// Requires:
//      app,Colors
//      app.Metric
//      app.Syllabifier
//      app.firebase
//
// Interface to implement by its descendants:
//        _load
//        _fillCategories || _fillSessions

(function( app ) { 'use strict';

    // Visualization constructor
    // Arguments:
    //      options: {
    //          wordColor           - word color
    //          wordHighlightColor  - mapped word rectangle color
    //          wordStrokeColor     - word rectable border color
    //          infoColor           - info text color
    //          infoFont            - info text font
    //          syllabification: {
    //              background
    //              color
    //          }
    //          colorMetric         - word background coloring metric
    //          mapping             - mapping type
    //      }
    function Visualization( options ) {
        this.wordColor = options.wordColor || '#666';
        this.wordHighlightColor = options.wordHighlightColor || '#606';
        this.wordStrokeColor = options.wordStrokeColor || '#888';
        this.infoColor = options.infoColor || '#444';
        this.infoFont = options.infoFont || '18px Arial';
        this.syllabification = Object.assign({
            background: '#fcc',
            color: '#060'
        }, options.syllabification );

        this.colorMetric = options.colorMetric !== undefined ? options.colorMetric : app.Metric.Type.DURATION;
        this.mapping = options.mapping !== undefined ? options.mapping : Visualization.Mapping.STATIC;

        this._sessions = {};
        this._texts = {};
        this._pageIndex = 0;
    }

    // Initialization routine, to be called prior constructing any visualization object
    //  Arguments:
    //      root              - selector for the element that contains visualizations
    Visualization.init = function( root ) {
        _view = document.querySelector( root );
        _wait = _view.querySelector( '.wait' );
        _canvas = _view.querySelector( 'canvas');
        _prompt = _view.querySelector( '.prompt' );
        _navigationBar = _view.querySelector( '.menu .navigation' );
        _propsBar = _view.querySelector( '.props' );
        _prev = _navigationBar.querySelector( '.prev' );
        _next = _navigationBar.querySelector( '.next' );

        _prompt.classList.add( 'invisible' );

        Visualization.root = _view;

        _view.querySelector( '.close' ).addEventListener( 'click', clickClose );
        _view.querySelector( '.select' ).addEventListener( 'click', clickSelect );
        _prompt.querySelector( '.categories' ).addEventListener( 'change', categoryChanged );

        _prev.addEventListener( 'click', prevPage );
        _next.addEventListener( 'click', nextPage );
    };

    Visualization.prototype.queryData = function( multiple ) {
        if (_waiting) {
            return;
        }

        _view.classList.remove( 'invisible' );
        _wait.classList.remove( 'invisible' );

        _waiting = true;

        const users = app.firebase.child( 'users' );
        users.once( 'value', snapshot => {
            _waiting = false;

            if (!snapshot.exists()) {
                window.alert( 'No users exist in the database' );
                return;
            }

            const users = snapshot;

            if (!_view.classList.contains('invisible')) {
                this._showDataSelectionDialog( multiple, users );
            }

        }, err => {
            _waiting = false;
            window.alert( err );
        });
    };

    // private

    Visualization.prototype._showDataSelectionDialog = function( multiple, users ) {
        _wait.classList.add( 'invisible' );

        const categoriesList = _prompt.querySelector( '.categories' );
        categoriesList.innerHTML = '';

        const sessionsList = _prompt.querySelector( '.sessions' );
        sessionsList.innerHTML = '';
        sessionsList.multiple = !!multiple;

        if (this._fillCategories) {
            this._fillCategories( categoriesList, users );

            const event = new Event( 'change' );
            categoriesList.dispatchEvent( event );
            categoriesList.classList.remove( 'invisible' );
        }
        else if (this._fillSessions) {
            categoriesList.classList.add( 'invisible' );
            this._fillSessions( sessionsList, users );
        }

        _promtCallback = this._load.bind( this );
        _prompt.classList.remove( 'invisible' );
    };

    // returns map of textID = { title, session = [...] }
    Visualization.prototype._getTexts = function( users ) {
        const texts = new Map();
        users.forEach( user => {
            const sessions = user.val()['sessions'];
            for (let sessionID of Object.keys( sessions )) {
                const session = sessions[ sessionID ];
                session.user = user.key;
                if (!texts.has( session.text )) {
                    const item = {
                        title: session.textTitle || session.text,
                        sessions: new Map()
                    };
                    item.sessions.set( sessionID, session );
                    texts.set( session.text, item );
                }
                else {
                    texts.get( session.text ).sessions.set( sessionID, session );
                }
            };
        });

        return texts;
    }

    // returns promise, or a cached text
    Visualization.prototype._loadText = function( id, title ) {
        return this._texts[ id ] || new Promise( (resolve, reject) => {
            const textRef = app.firebase.child( 'texts/' + id );
            textRef.once( 'value', snapshot => {

                if (!snapshot.exists()) {
                    reject( `Text ${id} does not exist in the database` );
                    return;
                }

                const text = snapshot.val();
                text.title = title;
                this._texts[ id ] = text;

                resolve( text );

            }, err => {
                reject( err );
            });
        });
    }

    Visualization.prototype._loadSession = function( id, meta ) {
        return this._sessions[ id ] || new Promise( (resolve, reject) => {
            const sessionRef = app.firebase.child( 'sessions/' + id );
            sessionRef.once( 'value', snapshot => {

                if (!snapshot.exists()) {
                    reject( `Session ${id} does not exist in the database` );
                    return;
                }

                const sessionData = snapshot.val();
                sessionData.meta = meta;
                this._sessions[ id ] = sessionData;

                resolve( sessionData );

            }, err => {
                reject( err );
            });
        });
    }

    Visualization.prototype._setProps = function( props ) {
        if (props) {
            _propsBar.classList.remove( 'invisible' );
        }
        else {
            _propsBar.classList.add( 'invisible' );
            return;
        }

        for (let propID in props) {
            const el = _propsBar.querySelector( '.' + propID );
            if (el) {
                const prop = props[ propID ];
                if (prop.enabled) {
                    el.classList.remove( 'off' );
                    el.textContent = prop.value;
                }
                else {
                    el.classList.add( 'off' );
                    el.textContent = '.';
                }
            }
        }
    }
    // Drawing

    Visualization.prototype._getCanvas2D = function() {
        if (!_width || !_height) {
            _width = parseInt( window.getComputedStyle( _canvas ).width );
            _height = parseInt( window.getComputedStyle( _canvas ).height );
            _canvas.setAttribute( 'width',  _width );
            _canvas.setAttribute( 'height', _height );
        }

        const ctx = _canvas.getContext('2d');

        ctx.clearRect(0, 0, _width, _height);

        return ctx;
    };

    Visualization.prototype._setCanvasFont = function( ctx, font ) {
        ctx.font = `${font.style} ${font.weight} ${font.size} ${font.family}`;
    }

    Visualization.prototype._drawTitle = function( ctx, title ) {
        ctx.textAlign = 'center';
        ctx.textBaseline = 'alphabetic';
        ctx.fillStyle = this.infoColor;
        ctx.font = this.infoFont;

        ctx.fillText( title, _width / 2, 52);
    };

    Visualization.prototype._drawSyllabifications = function( ctx, events, hyphen ) {
        events.forEach( event => {
            const rc = event.rect;
            const word = app.Syllabifier.syllabify( event.text, hyphen );
            ctx.fillStyle = this.syllabification.background;
            ctx.fillRect( rc.x, rc.y, rc.width, rc.height);
            ctx.fillStyle = this.syllabification.color;
            ctx.fillText( word, rc.x, rc.y + 0.8 * rc.height);
        });
    };

    Visualization.prototype._drawWords = function( ctx, words, settings ) {
        ctx.strokeStyle = this.wordStrokeColor;
        ctx.lineWidth = 1;

        const indexComputer = IndexComputer();

        words.forEach( (word, index) => {
            const wordSettings = Object.assign({
                alpha: app.Metric.getAlpha( word, this.colorMetric, settings.metricRange ),
                indexes: settings.showIDs ? indexComputer.feed( word.x, word.y ) : null
            }, settings );
            this._drawWord( ctx, word, wordSettings);
        });
    };

    Visualization.prototype._drawWord = function( ctx, word, settings ) {
        if (settings.alpha > 0) {
            //settings.alpha = Math.sin( settings.alpha * Math.PI / 2);
            // ctx.fillStyle = app.Colors.rgb2rgba( this.wordHighlightColor, settings.alpha);
            // ctx.fillRect( Math.round( word.x ), Math.round( word.y ), Math.round( word.width ), Math.round( word.height ) );
        }

        ctx.textAlign = 'start';
        ctx.textBaseline = 'alphabetic';
        ctx.fillStyle = this.wordColor;
        ctx.fillText( word.text, word.x, word.y + 0.8 * word.height );

        if (settings.alpha > 0) {
            ctx.fillStyle = app.Colors.rgb2rgba( this.wordHighlightColor, settings.alpha);
            ctx.fillText( word.text, word.x, word.y + 0.8 * word.height);
        }

        ctx.fillStyle = '#fff';
        let [prefix, suffix] = app.Syllabifier.getPrefixAndSuffix( word.text, settings.hyphen );
        if (prefix) {
            ctx.fillText( prefix, word.x, word.y + 0.8 * word.height );
        }
        if (suffix) {
            ctx.textAlign = 'end';
            ctx.fillText( suffix, word.x + word.width, word.y + 0.8 * word.height );
        }

        if (settings.indexes) {
            if (settings.indexes.word === 0) {
                ctx.fillStyle = '#080';
                ctx.textAlign = 'end';
                ctx.fillText( '' + settings.indexes.line, word.x - 20, word.y + 0.8 * word.height );
            }

            ctx.fillStyle = '#008';
            ctx.textAlign = 'center';
            ctx.fillText( '' + settings.indexes.word, word.x + word.width / 2, word.y );
        }

        if (!settings.hideBoundingBox) {
            ctx.strokeRect( word.x, word.y, word.width, word.height);
        }
    };

    // Paging

    Visualization.prototype._addOption = function( list, value, text, data ) {
        return addOption( list, value, text, data );
    }

    Visualization.prototype._setPrevPageCallback = function( cb ) {
        _prevPageCallback = cb;
    };

    Visualization.prototype._setNextPageCallback = function( cb ) {
        _nextPageCallback = cb;
    };

    Visualization.prototype._enableNavigationButtons = function( prev, next ) {
        if (prev) {
            _prev.classList.remove( 'disabled' );
        }
        else {
            _prev.classList.add( 'disabled' );
        }

        if (next) {
            _next.classList.remove( 'disabled' );
        }
        else {
            _next.classList.add( 'disabled' );
        }
    };

    Visualization.prototype._setCloseCallback = function( cb ) {
        _closeCallback = cb;
    };

    let _height;
    let _width;
    let _view;
    let _wait;
    let _canvas;
    let _prompt;
    let _propsBar;
    let _navigationBar;
    let _prev;
    let _next;

    let _promtCallback;
    let _prevPageCallback;
    let _nextPageCallback;
    let _closeCallback;

    let _waiting = false;

    const IndexComputer = function() {
        let lastX = -1;
        let lastY = -1;
        let currentWordIndex = -1;
        let currentLineIndex = -1;

        return {
            feed: (x, y) => {
                if (y > lastY) {
                    currentLineIndex++;
                    currentWordIndex = 0;
                }
                else if (x > lastX) {
                    currentWordIndex++;
                }

                lastX = x;
                lastY = y;

                return {
                    word: currentWordIndex,
                    line: currentLineIndex
                };
            }
        };
    };

    function clickClose() {
        _view.classList.add( 'invisible' );

        const ctx = _canvas.getContext('2d');
        ctx.clearRect( 0, 0, _width, _height );

        if (_closeCallback) {
            _closeCallback();
        }
    }

    function clickSelect() {
        _prompt.classList.add( 'invisible' );

        const categoriesList = _prompt.querySelector( '.categories' );
        const sessionsList = _prompt.querySelector( '.sessions' );

        if (sessionsList.multiple) {
            if (sessionsList.selectedOptions.length) {
                const data = new Map();
                for (let i = 0; i < sessionsList.selectedOptions.length; i++) {
                    const item = sessionsList.selectedOptions[i];
                    data.set( item.value, item.data );
                }
                const id = categoriesList.selectedIndex < 0 ? null :
                    categoriesList.options[ categoriesList.selectedIndex ].value;
                const title = categoriesList.selectedIndex < 0 ? null :
                    categoriesList.options[ categoriesList.selectedIndex ].textContent;
                _promtCallback( removeWaitImage, id, data, title );
            }
            else {
                clickClose();
            }
        }
        else {
            const category = categoriesList.options[ categoriesList.selectedIndex ];
            const session = sessionsList.options[ sessionsList.selectedIndex ];
            _promtCallback( removeWaitImage, session.value, session.textContent, session.data, category.value );
        }

        _wait.classList.remove( 'invisible' );
    }

    function categoryChanged( e ) {
        const category = e.target.options[ e.target.selectedIndex ];

        if (category && category.data) {
            const sessionsList = _prompt.querySelector( '.sessions' );
            sessionsList.innerHTML = '';

            const sessions = category.data;
            sessions.forEach( (session, id ) => {
                const date = new Date( session.date );
                let textToDisplay = `${date.getDate()}.${date.getMonth()}.${date.getFullYear()}, ${date.getHours()}:${date.getMinutes()} `;
                if (session.user) {
                    textToDisplay += new Array( Math.max( 0, 17 - textToDisplay.length ) ).join( String.fromCharCode( 0x2012 ) );
                    textToDisplay += ' ' + session.user;
                }

                addOption( sessionsList, id, textToDisplay, session );
            });
        }
    }

    function addOption( list, value, text, data ) {
        const option = document.createElement( 'option' );
        option.value = value;
        option.textContent = text || value;
        if (data) {
            option.data = data;
        }
        list.appendChild( option );

        return option;
    }

    function prevPage( e ) {
        if (_prevPageCallback) {
            _prevPageCallback( );
        }
    }

    function nextPage( e ) {
        if (_nextPageCallback) {
            _nextPageCallback( );
        }
    }

    function removeWaitImage() {
        _wait.classList.add( 'invisible' );
    }

    Visualization.Mapping = {
        STATIC: 0,
        DYNAMIC: 1
    };

    app.Visualization = Visualization;

})( this.ReadVis2 || module.exports );
