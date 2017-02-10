// Base for visualizations
//
// Requires:
//
// Interface to implement by its descendants:
//        _load
//        _fillCategories

(function (app) { 'use strict';

    // Visualization constructor
    // Arguments:
    //      options: {
    //          wordColor           - word color
    //          wordFont      c     - word font
    //          wordHighlightColor  - mapped word rectangle color
    //          wordStrokeColor     - word rectable border color
    //          infoColor           - info text color
    //          infoFont            - info text font
    //          colorMetric         - word background coloring metric
    //          mapping             - mapping type
    //      }
    function Visualization (options) {
        this.wordColor = options.wordColor || '#080'//'#CCC';
        this.wordFont = options.wordFont || '22pt Calibri, Arial, sans-serif';
        this.wordHighlightColor = options.wordHighlightColor || '#606';
        this.wordStrokeColor = options.wordStrokeColor || '#888';
        this.infoColor = options.infoColor || '#444';
        this.infoFont = options.infoFont || '18px Arial';

        this.colorMetric = options.colorMetric !== undefined ? options.colorMetric : app.Metric.Type.DURATION;
        this.mapping = options.mapping !== undefined ? options.mapping : Visualization.Mapping.STATIC;

        this._sessions = {};
        this._texts = {};
        this._pageIndex = 0;
    }

    // Initialization routine, to be called prior constructing any visualization object
    //  Arguments:
    //      root              - selector for the element that contains visualizations
    Visualization.init = function (root) {
        _view = document.querySelector( root );
        _wait = _view.querySelector( '.wait' );
        _canvas = _view.querySelector( 'canvas');
        _sessionPrompt = _view.querySelector( '#session' );
        _navigationBar = _view.querySelector( '.navigation' );
        _prev = _navigationBar.querySelector( '.prev' );
        _next = _navigationBar.querySelector( '.next' );

        _sessionPrompt.classList.add( 'invisible' );

        Visualization.root = _view;

        _view.querySelector( '.close' ).addEventListener( 'click', clickClose );
        _view.querySelector( '.select' ).addEventListener( 'click', clickSelect );
        _view.querySelector( '#categories' ).addEventListener( 'change', categoryChanged );

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

        }, function (err) {
            _waiting = false;
            window.alert( err );
        });
    };

    Visualization.prototype._addOption = function ( list, value, text, data ) {
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

    /*
    Visualization.prototype._getConditionNameFromSessionName = function (sessionName ) {
        var result;
        var nameParts = sessionName.split( '_' );
        if (nameParts.length === 3) {
            result = nameParts[1];
        }
        return result;
    }*/

    Visualization.prototype._showDataSelectionDialog = function( multiple, users ) {
        _wait.classList.add( 'invisible' );

        const categoriesList = _sessionPrompt.querySelector( '#categories' );
        categoriesList.innerHTML = '';

        this._fillCategories( categoriesList, users );

        const sessionsList = _sessionPrompt.querySelector( '#sessions' );
        sessionsList.multiple = !!multiple;

        var event = new Event( 'change' );
        categoriesList.dispatchEvent( event );

        /*
        if (categories) {
            catList.innerHTML = '';
            catList.classList.remove( 'hidden' );
            for (var key of categories.keys()) {
                addOption( catList, key, key, categories.get( key ) );
            }
            var event = new Event('change');
            catList.dispatchEvent( event );
        }
        else {
            catList.classList.add( 'hidden' );
        }
        */

        _sessionPromtCallback = this._load.bind( this );
        _sessionPrompt.classList.remove( 'invisible' );
    };

    // returns map of textID = { title, session = [...] }
    Visualization.prototype._getTexts = function (users) {
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

    // Drawing

    Visualization.prototype._getCanvas2D = function () {
        if (!_width || !_height) {
            _width = parseInt( window.getComputedStyle( _canvas ).width );
            _height = parseInt( window.getComputedStyle( _canvas ).height );
            _canvas.setAttribute( 'width',  _width );
            _canvas.setAttribute( 'height', _height );
        }

        var ctx = _canvas.getContext('2d');

        ctx.font = this.wordFont;
        ctx.clearRect(0, 0, _width, _height);

        return ctx;
    };

    Visualization.prototype._drawTitle = function (ctx, title) {
        ctx.fillStyle = this.infoColor;
        ctx.font = this.infoFont;

        var textWidth = ctx.measureText( title ).width;
        ctx.fillText( title, (_canvas.width - textWidth) / 2, 32);
    };

    Visualization.prototype._drawWords = function (ctx, words, metricRange, showIDs, hideBoundingBox) {
        ctx.strokeStyle = this.wordStrokeColor;
        ctx.lineWidth = 1;

        var indexComputer = IndexComputer();

        words.forEach( (word, index) => {
            var alpha = app.Metric.getAlpha( word, this.colorMetric, metricRange );
            this._drawWord( ctx, word, alpha,
                showIDs ? indexComputer.feed( word.x, word.y ) : null,
                hideBoundingBox);
        });
    };

    Visualization.prototype._drawWord = function (ctx, word, backgroundAlpha, indexes, hideBoundingBox) {
        if (backgroundAlpha > 0) {
            //backgroundAlpha = Math.sin( backgroundAlpha * Math.PI / 2);
            // ctx.fillStyle = app.Colors.rgb2rgba( this.wordHighlightColor, backgroundAlpha);
            // ctx.fillRect( Math.round( word.x ), Math.round( word.y ), Math.round( word.width ), Math.round( word.height ) );
        }

        ctx.font = this.wordFont;
        ctx.textAlign = 'start';
        ctx.textBaseline = 'alphabetic';
        ctx.fillStyle = this.wordColor;
        ctx.fillText( word.text, word.x, word.y + 0.8 * word.height);

        if (backgroundAlpha > 0) {
            ctx.fillStyle = app.Colors.rgb2rgba( this.wordHighlightColor, backgroundAlpha);
            ctx.fillText( word.text, word.x, word.y + 0.8 * word.height);
        }

        if (indexes) {
            if (indexes.word === 0) {
                ctx.fillStyle = '#080';
                ctx.textAlign = 'end';
                ctx.fillText( '' + indexes.line, word.x - 20, word.y + 0.8 * word.height );
            }

            ctx.fillStyle = '#008';
            ctx.textAlign = 'center';
            ctx.fillText( '' + indexes.word, word.x + word.width / 2, word.y );
        }

        if (!hideBoundingBox) {
            if (word.participants) {
                ctx.font = '12px Arial';
                word.participants.forEach( (participant, index) => {
                    if (index > 2) {
                        return;
                    }
                    let id = +participant.name.substr(1);
                    ctx.fillStyle = '#004' //`rgb(${10*id},0,0)`;
                    ctx.fillText( participant.name, word.x, word.y + index * 15 - 20);
                });
                ctx.font = this.wordFont;
            }
            else {
                ctx.strokeRect( word.x, word.y, word.width, word.height);
            }
        }
    };

    var _height;
    var _width;
    var _view;
    var _wait;
    var _canvas;
    var _sessionPrompt;
    var _navigationBar;
    var _prev;
    var _next;

    var _sessionPromtCallback;
    var _prevPageCallback;
    var _nextPageCallback;

    var _waiting = false;

    var IndexComputer = function () {
        var lastX = -1;
        var lastY = -1;
        var currentWordIndex = -1;
        var currentLineIndex = -1;

        return {
            feed: function (x, y) {
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
        _navigationBar.classList.add( 'invisible' );

        const ctx = _canvas.getContext('2d');
        ctx.clearRect( 0, 0, _width, _height );
    }

    function clickSelect() {
        _sessionPrompt.classList.add( 'invisible' );

        const categoriesList = _sessionPrompt.querySelector( '#categories' );
        const sessionsList = _sessionPrompt.querySelector( '#sessions' );

        if (sessionsList.multiple) {
            const sessions = new Map();
            for (let i = 0; i < sessionsList.selectedOptions.length; i++) {
                const item = sessionsList.selectedOptions[i];
                sessions.set( item.value, item.data );
            }
            const textID = categoriesList.options[ categoriesList.selectedIndex ].value;
            _sessionPromtCallback( textID, sessions );
        }
        else {
            const selectedUser = categoriesList.options[ categoriesList.selectedIndex ];
            const selectedSession = sessionsList.options[ sessionsList.selectedIndex ];
            _sessionPromtCallback( selectedSession.value, selectedSession.textContent, selectedSession.data, selectedUser.value );
        }

        _navigationBar.classList.remove( 'invisible' );
    }

    function categoryChanged( e ) {
        const category = e.target.options[ e.target.selectedIndex ];

        if (category && category.data) {
            const sessionsList = _sessionPrompt.querySelector( '#sessions' );
            sessionsList.innerHTML = '';

            const sessions = category.data;
            sessions.forEach( (session, id ) => {
                const date = new Date( session.date );
                let textToDisplay = `${date.getDate()}.${date.getMonth()}.${date.getYear()}, ${date.getHours()}:${date.getMinutes()} `;
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

    Visualization.Mapping = {
        STATIC: 0,
        DYNAMIC: 1
    };

    app.Visualization = Visualization;

})( this.Reading || module.exports );
