// Base for visualizations
//
// Requires:
//      sgwm
//      app,Colors
//      app.Metric
//      app.Syllabifier
//      app.firebase
//
// Interface to implement/overload by its descendants:
//        _load( onloaded, id, data, title )
//        _fillCategories( htmlList, users ) || _fillItems( htmlList, users ) - returns a prompt title

(function( app ) { 'use strict';

    // Visualization constructor
    // Arguments:
    //      options: {
    //          wordColor           - word color
    //          wordHighlightColor  - mapped word rectangle color
    //          wordRectColor       - word rectangle border color
    //          syllabification: {
    //              background
    //              color
    //          }
    //          indexColors: {
    //              line
    //              word
    //          }
    //          colorMetric         - word background coloring metric
    //      }
    function Visualization( options ) {
        Visualization._instaces.push( this );

        this.wordColor = options.wordColor || '#666';
        this.wordHighlightColor = options.wordHighlightColor || '#606';
        this.wordRectColor = options.wordRectColor || '#888';
        this.syllabification = Object.assign({
            background: '#fcc',
            color: '#060'
        }, options.syllabification );
        this.indexColors = Object.assign({
            line: '#080',
            word: '#008'
        }, options.indexColors );

        this.colorMetric = options.colorMetric !== undefined ? options.colorMetric : app.Metric.Type.DURATION;

        this._gradeTexts = {
            '2nd grade': [
                'Krokotiili hiihtää kevääseen',
                'Heinähattu, Vilttitossu ja iso Elsa',
                'Muumilaaksossa',
                'Olympialaiset'
            ],
            '3rd grade': [
                'Suomi on tasavalta',
                'Suomi ja suomalaisuus',
                'Helsinki on Suomen pääkaupunki',
                'Suomen kaupunkeja'
            ]
        };

        this._sessions = {};
        this._texts = {};

        this._SGWM = {};
        this._initializeSGWMSettings();

        this._pageIndex = -1;

        _closeCallback = () => {
            this._onClosed();
        };
    }

    // Initialization routine, to be called prior constructing any visualization object
    //  Arguments:
    //      root              - selector for the element that contains visualizations
    Visualization.init = function( root ) {
        _view = document.querySelector( root );
        _wait = _view.querySelector( '.wait' );
        _title = _view.querySelector( '.vis-title' );
        _canvas = _view.querySelector( 'canvas');

        _prompt = _view.querySelector( '.prompt' );
        _categoriesList = _prompt.querySelector( '.categories' );
        _itemsList = _prompt.querySelector( '.items' );
        _selectButton = _prompt.querySelector( '.select' );

        _sessionProps = _view.querySelector( '.props' );

        _navigationBar = _view.querySelector( '.menu .navigation' );
        _prev = _navigationBar.querySelector( '.prev' );
        _next = _navigationBar.querySelector( '.next' );
        _page = _navigationBar.querySelector( '.page' );

        _prompt.classList.add( 'invisible' );

        Visualization.root = _view;

        _view.querySelector( '.settings' ).addEventListener( 'click', clickSettings );
        _view.querySelector( '.close' ).addEventListener( 'click', clickClose );

        _categoriesList.addEventListener( 'change', categoryChanged );
        _selectButton.addEventListener( 'click', clickSelect );

        _prev.addEventListener( 'click', prevPage );
        _next.addEventListener( 'click', nextPage );
    };

    Visualization.formatDate = function( dateString ) {
        const date = new Date( dateString );
        return `${date.getDate()}.${date.getMonth()+1}.${date.getFullYear()}, ${date.getHours()}:${date.getMinutes()} `;
    };

    Visualization.createOptions = function( options, receivers ) {
        if (!(receivers instanceof Array)) {
            receivers = [ receivers ];
        }

        if (options instanceof Array) {
            return options.map( item => {
                return {
                    title: item.title,
                    options: Visualization.createOptions( item.options, receivers )
                };
            });
        }

        for (let id in options) {
            options[ id ].ref = value => {
                const ids = id.split( '.' );
                if (value === undefined) {
                    let v = receivers[0];
                    ids.forEach( _ => {
                        v = v[ _ ];
                    });
                    return v;
                }
                else {
                    receivers.forEach( receiver => {
                        let v = receiver;
                        for (let i = 0; i < ids.length - 1; i++) {
                            v = v[ ids[i] ];
                        }
                        v[ ids[ ids.length - 1 ] ] = value;
                    });
                }
            };
        }

        return options;
    };

    Visualization.createCommonOptions = function() {
        return {
            id: '_common',
            title: 'Common',
            options: Visualization.createOptions({
                wordColor: { type: '#', label: 'Text color' },
                wordHighlightColor: { type: '#', label: 'Highlighting color' },
                wordRectColor: { type: '#', label: 'Word frame color' },
                'syllabification.background' : { type: '#', label: 'Syllabification background' },
                'syllabification.color' : { type: '#', label: 'Syllabification word color' },
            }, Visualization._instaces )
        };
    };

    Visualization.createSGWMOptions = function() {
        return {
            id: '_sgwm',
            title: 'Data mapping',
            options: Visualization.createOptions([
                {
                    title: 'Fixation processing',
                    options: Visualization.createOptions({
                        '_SGWM.FixationProcessorSettings.location.enabled': { type: Boolean, label: 'By location' },
                        '_SGWM.FixationProcessorSettings.location.marginX': { type: Number, step: 10, label: '\tmargin X, px' },
                        '_SGWM.FixationProcessorSettings.location.marginY': { type: Number, label: '\tmargin Y, px' },
                        '_SGWM.FixationProcessorSettings.duration.enabled': { type: Boolean, label: 'By duration' },
                        '_SGWM.FixationProcessorSettings.duration.mergingDurationThreshold': { type: Number, label: '\tmerging threshold, ms' },
                        '_SGWM.FixationProcessorSettings.duration.mergingDistanceThreshold': { type: Number, label: '\tmerging distance, px' },
                        '_SGWM.FixationProcessorSettings.duration.removingDurationThreshold': { type: Number, label: '\tmin duration, ms' },
                    })
                },
                {
                    title: 'Splitter',
                    options: Visualization.createOptions({
                    '_SGWM.SplitToProgressionsSettings.left': { type: Number, step: 0.1, label: 'Left margin, chars' },
                    '_SGWM.SplitToProgressionsSettings.right': { type: Number, step: 0.1, label: 'Right margin, chars' },
                    '_SGWM.SplitToProgressionsSettings.verticalLine': { type: Number, step: 0.1, label: 'Vertical margin, lines' },
                    '_SGWM.SplitToProgressionsSettings.angle': { type: Number, step: 0.1, label: 'Max incline, rad' },
                    })
                },
                {
                    title: 'Merger',
                    options: Visualization.createOptions({
                    '_SGWM.ProgressionMergerSettings.minLongSetLength': { type: Number, label: 'Shortest progression, fixations' },
                    '_SGWM.ProgressionMergerSettings.fitThreshold': { type: Number, step: 0.01, label: 'Line separation threshold, lines' },
                    '_SGWM.ProgressionMergerSettings.maxLinearGradient': { type: Number, step: 0.01, label: 'Max line incline, rad' },
                    '_SGWM.ProgressionMergerSettings.removeSingleFixationLines': { type: Boolean, label: 'Remove unmerged single fixations' },
                    '_SGWM.ProgressionMergerSettings.correctForEmptyLines': { type: Boolean, label: 'Account for empty lines' },
                    '_SGWM.ProgressionMergerSettings.currentLineSupportInCorrection': { type: Number, step: 0.05, label: '\tsupport current line by' },
                    //'_SGWM.ProgressionMergerSettings.emptyLineDetectorFactor': { type: Number, step: 0.05, label: '\tempty line factor, lines' },
                    '_SGWM.ProgressionMergerSettings.intelligentFirstLineMapping': { type: Boolean, label: 'Intelligent first reading line search' },
                    })
                },
                {
                    title: 'Word mapper',
                    options: Visualization.createOptions({
                    '_SGWM.WordMapperSettings.wordCharSkipStart': { type: Number, label: 'Skip from start, chars' },
                    '_SGWM.WordMapperSettings.wordCharSkipEnd': { type: Number, label: 'Skip from end, chars' },
                    '_SGWM.WordMapperSettings.scalingDiffLimit': { type: Number, step: 0.1, label: 'Scaling diff limit' },
                    '_SGWM.WordMapperSettings.rescaleFixationX': { type: Boolean, label: 'Rescale fixations horizontally' },
                    '_SGWM.WordMapperSettings.partialLengthMaxWordLength': { type: Number, label: '\tshort word, chars' },
                    '_SGWM.WordMapperSettings.effectiveLengthFactor': { type: Number, step: 0.1, label: '\tlimit to' },
                    '_SGWM.WordMapperSettings.ignoreTransitions': { type: Boolean, label: 'Ignore transitions' },
                    })
                },
            ], Visualization._instaces )
        };
    };

    Visualization._instaces = [];
    Visualization.SGWM = {};

    // public

    Visualization.prototype.queryData = function( multiple ) {
        if (_waiting) {
            return;
        }

        Visualization.active = this;

        _view.classList.remove( 'invisible' );
        _wait.classList.remove( 'invisible' );
        _page.textContent = '';
        _title.textContent = '';
        this._enableNavigationButtons( false, false );

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

    Visualization.prototype.update = function() {
    };

    // data retrival

    Visualization.prototype._showDataSelectionDialog = function( multiple, users ) {
        _wait.classList.add( 'invisible' );

        _categoriesList.innerHTML = '';

        _itemsList.innerHTML = '';
        _itemsList.multiple = !!multiple;

        let titleString;
        if (this._fillCategories) {
            titleString = this._fillCategories( _categoriesList, users );

            const event = new window.Event( 'change' );
            _categoriesList.dispatchEvent( event );
            _categoriesList.classList.remove( 'invisible' );
        }
        else if (this._fillItems) {
            titleString = this._fillSessions( _itemsList, users );
            _categoriesList.classList.add( 'invisible' );
        }

        const title = _prompt.querySelector( '.title' );
        title.textContent = titleString || 'Select students';

        _promtCallback = this._load.bind( this );
        _prompt.classList.remove( 'invisible' );
    };

    Visualization.prototype._addOption = function( list, value, text, data ) {
        return addOption( list, value, text, data );
    };

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
    };

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
    };

    // data restructuring

    // returns map of textID = { title, session = [...] }
    Visualization.prototype._getTexts = function( users ) {
        const texts = new Map();
        users.forEach( user => {
            const sessions = user.val().sessions;
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
            }
        });

        return texts;
    };

    Visualization.prototype._classifyUsersByGrade = function( userData ) {
        const gradeUsers = {};
        for (let grade in this._gradeTexts) {
            gradeUsers[ grade ] = [];
        }

        userData.forEach( user => {
            for (let sessionID in user.sessions) {
                const textTitle = user.sessions[ sessionID ].textTitle;
                for (let grade in this._gradeTexts) {
                    if (gradeUsers[ grade ].indexOf( user ) >= 0) {
                        continue;
                    }
                    const gradeTexts = this._gradeTexts[ grade ];
                    gradeTexts.forEach( gradeText => {
                        if (textTitle === gradeText) {
                            user.grade = grade[0];
                            gradeUsers[ grade ].push( user );
                        }
                    });
                }
            }
        });

        return gradeUsers;
    };

    Visualization.prototype._setSessionProps = function( props ) {
        if (props) {
            _sessionProps.classList.remove( 'invisible' );
        }
        else {
            _sessionProps.classList.add( 'invisible' );
            return;
        }

        for (let propID in props) {
            const el = _sessionProps.querySelector( '.' + propID );
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
    };

    Visualization.prototype._recreateWordIDsInEvents = function( session, text ) {
        if (session.length !== text.length) {
            console.error( 'session and text page do not match' );
            return;
        }

        for (let i = 0; i < session.length; i++) {
            const records = session[i].records;
            if (!records) {
                continue;
            }

            const lines = new Map();
            const page = text[i];
            page.forEach( word => {
                let wordLine = lines.get( Math.round( word.y ) );
                if (!wordLine) {
                    wordLine = [];
                    lines.set( Math.round( word.y ), wordLine );
                }
                wordLine.push( { id: word.id, x: word.x, y: word.y, text: app.Syllabifier.clean( word.text ) } );
            });

            records.forEach( record => {
                const line = lines.get( Math.round( record.rect.y ) );
                if (!line) {
                    return;
                }

                const text = app.Syllabifier.clean( record.text );
                let candidates = line.filter( lineWord => {
                    return lineWord.text === text;
                });

                if (candidates.length === 1) {
                    record.id = candidates[0].id;
                }
                else if (candidates.length > 1) {
                    const sameWordOnLinePrev = records.filter( r => {
                        return r.rect.y === record.rect.y &&
                                r.rect.x < record.rect.x &&
                                app.Syllabifier.clean( r.text ) === text;
                    });
                    record.id = candidates[ sameWordOnLinePrev.length ].id;
                }
                else {
                    console.log( 'no candidate for', text );
                }
            });
        }
    };

    // Drawing

    Visualization.prototype._getCanvas2D = function() {
        if (!_width || !_height) {
            _width = parseInt( window.getComputedStyle( _canvas ).width );
            _height = parseInt( window.getComputedStyle( _canvas ).height );
            _canvas.setAttribute( 'width',  _width );
            _canvas.setAttribute( 'height', _height );
        }

        const ctx = _canvas.getContext('2d');

        ctx.clearRect( 0, 0, _width, _height );

        return ctx;
    };

    Visualization.prototype._setCanvasFont = function( ctx, font ) {
        ctx.font = `${font.style} ${font.weight} ${font.size} ${font.family}`;
    };

    Visualization.prototype._setTitle = function( title ) {
        _title.textContent = title;
    };

    Visualization.prototype._drawSyllabifications = function( ctx, events, hyphen ) {
        ctx.textAlign = 'start';
        ctx.textBaseline = 'alphabetic';
        events.forEach( event => {
            this._drawSyllabification( ctx, event, hyphen );
        });
    };

    Visualization.prototype._drawSyllabification = function( ctx, event, hyphen ) {
        ctx.textAlign = 'start';
        ctx.textBaseline = 'alphabetic';

        const rect = event.rect;
        const word = app.Syllabifier.syllabify( event.text, hyphen );

        ctx.fillStyle = this.syllabification.background;
        ctx.fillRect( rect.x, rect.y, rect.width, rect.height);
        ctx.fillStyle = this.syllabification.color;
        ctx.fillText( word, rect.x, rect.y + 0.8 * rect.height);
    };

    Visualization.prototype._drawWords = function( ctx, words, settings ) {
        const indexComputer = createIndexComputer();

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
                ctx.fillStyle = this.indexColors.line;
                ctx.textAlign = 'end';
                ctx.fillText( '' + settings.indexes.line, word.x - 20, word.y + 0.8 * word.height );
            }

            ctx.fillStyle = this.indexColors.word;
            ctx.textAlign = 'center';
            ctx.fillText( '' + settings.indexes.word, word.x + word.width / 2, word.y );
        }

        if (!settings.hideBoundingBox) {
            ctx.strokeStyle = this.wordRectColor;
            ctx.lineWidth = 1;
            ctx.strokeRect( word.x, word.y, word.width, word.height);
        }
    };

    // Paging

    Visualization.prototype._setPrevPageCallback = function( cb ) {
        _prevPageCallback = cb;
    };

    Visualization.prototype._setNextPageCallback = function( cb ) {
        _nextPageCallback = cb;
    };

    Visualization.prototype._setPageIndex = function( value ) {
        this._pageIndex = value;
        _page.textContent = !value ? '' : `${value}/${this._data.text.length - 1}`;
        this._enableNavigationButtons( this._pageIndex > 0, this._pageIndex < this._data.text.length - 1 );
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

    // Data processing

    Visualization.prototype._initializeSGWMSettings = function() {
        const SGWM = window.SGWM;
        let settings;

        settings = new SGWM.FixationProcessorSettings();
        this._SGWM.FixationProcessorSettings = settings;
        if (!settings.isInitialized) {
            settings.location.enabled = true;
            settings.location.marginX = 290;
            settings.location.marginY = 290;
            settings.duration.enabled = false;
            settings.save();
        }

        settings = new SGWM.SplitToProgressionsSettings();
        this._SGWM.SplitToProgressionsSettings = settings;
        if (!settings.isInitialized) {
            settings.bounds = { // in size of char height
                left: -0.5,
                right: 8,
                verticalChar: 2,
                verticalLine: 0.6
            };
            settings.angle = Math.sin( 15 * Math.PI / 180 );
            settings.save();
        }

        settings = new SGWM.ProgressionMergerSettings();
        this._SGWM.ProgressionMergerSettings = settings;
        if (!settings.isInitialized) {
            settings.minLongSetLength = 3;
            settings.fitThreshold = 0.14;       // fraction of the interline distance
            settings.maxLinearGradient = 0.15;
            settings.removeSingleFixationLines = false;
            settings.correctForEmptyLines = true;
            settings.currentLineSupportInCorrection = 0.15;
            settings.emptyLineDetectorFactor = 1.6;
            settings.intelligentFirstLineMapping = true;
            settings.save();
        }

        settings = new SGWM.WordMapperSettings();
        this._SGWM.WordMapperSettings = settings;
        if (!settings.isInitialized) {
            settings.wordCharSkipStart = 3;
            settings.wordCharSkipEnd = 6;
            settings.scalingDiffLimit = 0.9;
            settings.rescaleFixationX = false;
            settings.partialLengthMaxWordLength = 2;
            settings.effectiveLengthFactor = 0.7;
            settings.ignoreTransitions = false;
            settings.save();
        }
    };

    Visualization.prototype._map = function( session ) {
        Object.values( this._SGWM ).forEach( settings => {
            settings.save();
        });

        const sgwm = new window.SGWM();
        const result = sgwm.map( session );

        return result;
    };

    // other

    Visualization.prototype._setCloseCallback = function( cb ) {
        _closeCallback = () => {
            this._onClosed();
            if (cb) {
                cb();
            }
        };
    };

    Visualization.prototype._onClosed = function() {
        this._pageIndex = -1;
        Visualization.active = null;
    };

    // internal

    let _height;
    let _width;

    let _view;
    let _wait;
    let _title;
    let _canvas;

    let _prompt;
    let _categoriesList;
    let _itemsList;
    let _selectButton;

    let _sessionProps;

    let _navigationBar;
    let _prev;
    let _next;
    let _page;

    let _promtCallback;
    let _prevPageCallback;
    let _nextPageCallback;
    let _closeCallback;

    let _waiting = false;

    const createIndexComputer = function() {
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

    function clickSettings( e ) {
        if (Visualization.active) {
            app.Options.instance.show( Visualization.active.options.id );
        }
    }

    function clickClose( e ) {
        _view.classList.add( 'invisible' );
        _sessionProps.classList.add( 'invisible' );

        const ctx = _canvas.getContext('2d');
        ctx.clearRect( 0, 0, _width, _height );

        if (_closeCallback) {
            _closeCallback();
        }
    }

    function clickSelect( e ) {
        _prompt.classList.add( 'invisible' );

        if (_itemsList.multiple) {
            if (_itemsList.selectedOptions.length) {
                const data = new Map();
                for (let i = 0; i < _itemsList.selectedOptions.length; i++) {
                    const item = _itemsList.selectedOptions[i];
                    data.set( item.value, item.data );
                }
                const id = _categoriesList.selectedIndex < 0 ? null :
                    _categoriesList.options[ _categoriesList.selectedIndex ].value;
                const title = _categoriesList.selectedIndex < 0 ? null :
                    _categoriesList.options[ _categoriesList.selectedIndex ].textContent;
                _promtCallback( removeWaitImage, id, data, title );
            }
            else {
                clickClose();
            }
        }
        else {
            const category = _categoriesList.options[ _categoriesList.selectedIndex ];
            const item = _itemsList.options[ _itemsList.selectedIndex ];
            _promtCallback( removeWaitImage, item.value, item.textContent, item.data, category.value );
        }

        _wait.classList.remove( 'invisible' );
    }

    function categoryChanged( e ) {
        const category = e.target.options[ e.target.selectedIndex ];

        if (category && category.data) {
            _itemsList.innerHTML = '';

            const dataItems = category.data;
            dataItems.forEach( (item, id ) => {
                // category.data : sessions
                if (item.date) {
                    const session = item;
                    let textToDisplay = Visualization.formatDate( session.date );
                    if (session.user) {
                        textToDisplay += new Array( Math.max( 0, 17 - textToDisplay.length ) ).join( String.fromCharCode( 0x2012 ) );
                        textToDisplay += ' ' + session.user;
                    }

                    addOption( _itemsList, id, textToDisplay, session );
                }
                // category.data : users
                else if (item.sessions) {
                    const user = item;
                    addOption( _itemsList, user.name, user.name, user );
                }
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

    app.Visualization = Visualization;

})( window.ReadVis2 );
