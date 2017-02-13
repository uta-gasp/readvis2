// Requires:
//      app.Metric

(function (app) { 'use strict';

    // Real-time visualization constructor
    // Arguments:
    //      options: {
    //          // name font options
    //          nameFontFamily
    //          nameFontSize
    //          nameFont,
    //          basePointerSize (Number) - minimum pointer size
    //      }
    function GazeReplay (options) {

        this.nameFontFamily = options.nameFontFamily || 'Calibri, Arial, sans-serif';
        this.nameFontSize = options.nameFontSize || 20;
        this.nameFont = options.nameFontFamily || `bold ${this.nameFontSize}px ${this.nameFontFamily}`;

        Track.basePointerSize = options.basePointerSize || Track.basePointerSize;

        options.wordColor = options.wordColor || '#222';
        options.colorMetric = app.Metric.Type.NONE;

        app.Visualization.call( this, options );

        this._data = null;
        this._tracks = null;
        this._tracksLegendLocation = {x: this.nameFontSize + 2, y: 80};
    }

    app.loaded( () => { // we have to defer the prototype definition until the Visualization mudule is loaded

    GazeReplay.prototype = Object.create( app.Visualization.prototype );
    GazeReplay.prototype.base = app.Visualization.prototype;
    GazeReplay.prototype.constructor = GazeReplay;

    GazeReplay.prototype._fillCategories = function (list, users) {
        const texts = this._getTexts( users );
        texts.forEach( (text, id) => {
            const option = this._addOption( list, id, text.title, text.sessions );
            if (this._data && this._data.textID === id) {
                option.selected = true;
            }
        });
    };

    GazeReplay.prototype._load = function (cbLoaded, textID, sessions, textTitle) {

        const textPromise = this._loadText( textID, textTitle );
        const promises = [ textPromise ];

        sessions.forEach( (session, id) => {
            app.WordList.instance.hyphen = session.interaction.syllabification.hyphen;
            promises.push( this._loadSession( id, session ) );
        });

        Promise.all( promises ).then( ([text, ...sessionDatas]) => {
            this._data = {
                textID: textID,
                textTitle: textTitle,
                text: text,
                sessions: sessionDatas
            };

            Track.colorIndex = 0;
            this._tracks = [];

            sessionDatas.forEach( sessionData => {
                this._tracks.push( new Track( app.Visualization.root, sessionData ) );
            });

            this._pageIndex = 0;
            this._enableNavigationButtons( this._pageIndex > 0, this._pageIndex < this._data.text.length - 1 );
            this._start();

            this._setPrevPageCallback( () => { this._prevPage(); });
            this._setNextPageCallback( () => { this._nextPage(); });
            this._setCloseCallback( () => { this._stopAll(); });

            if (cbLoaded) {
                cbLoaded();
            }

        }).catch( reason => {
            window.alert( reason );
        });
    };

    GazeReplay.prototype._start = function () {
        if (!this._tracks.length) {
            return;
        }

        const ctx = this._getCanvas2D();

        const words = this._data.text[ this._pageIndex ];

        // var words = tracks[0].words;
        this._drawWords( ctx, words, null, false, true );
        this._drawNames( ctx );

        this._run( ctx );
    };

    GazeReplay.prototype._stopAll = function () {
        if (this._tracks) {
            this._tracks.forEach( track => track.stop() );
        }
    }

    GazeReplay.prototype._run = function( ctx ) {
        this._tracks.forEach( (track, ti) => {
            track.start(
                this._pageIndex,
                // fixation
                (fixation, pointer) => {
                },
                 // done
                () => {
                    ctx.textAlign = 'left';
                    ctx.textBaseline = 'bottom';
                    ctx.strokeStyle = '#000';
                    ctx.fillStyle = track.color;
                    ctx.font = this.nameFont;
                    ctx.fillText(
                        String.fromCharCode( 0x2713 ),
                        this._tracksLegendLocation.x - this.nameFontSize,
                        this._tracksLegendLocation.y + (1.8 * this.nameFontSize) * ti
                    );
                }
            );
        })
    };

    GazeReplay.prototype._prevPage = function () {
        this._stopAll();
        if (this._data && this._pageIndex > 0) {
            this._pageIndex--;
            this._enableNavigationButtons( this._pageIndex > 0, this._pageIndex < this._data.text.length - 1 );
            this._start();
        }
    };

    GazeReplay.prototype._nextPage = function () {
        this._stopAll();
        if (this._data && this._pageIndex < this._data.text.length - 1) {
            this._pageIndex++;
            this._enableNavigationButtons( this._pageIndex > 0, this._pageIndex < this._data.text.length - 1 );
            this._start();
        }
    };

    GazeReplay.prototype._drawNames = function( ctx ) {
        this._tracks.forEach( (track, ti) => {
            ctx.textAlign = 'left';
            ctx.textBaseline = 'bottom';
            ctx.fillStyle = track.color;
            ctx.font = this.nameFont;

            ctx.fillText(
                track.name,
                this._tracksLegendLocation.x,
                this._tracksLegendLocation.y + (1.8 * this.nameFontSize) * ti
            );
        });
    };

    }); // end of delayed call

    function Track (root, session) {
        this.root = root;
        this.name = session.meta.user;
        this.session = session;
        this.color = Track.colors[ Track.colorIndex++ % Track.colors.length ];

        this.pointerSize = 8;
        this.fixationTimer = null;
        this.nextTimer = null;

        this.fixations = null;

        this.fixationIndex = -1;

        this.__next = this._next.bind( this );
    }

    Track.basePointerSize = 6;

    Track.colorIndex = 0;

    Track.colors = [
        '#4D4D4D',
        '#5DA5DA',
        '#FAA43A',
        '#60BD68',
        '#F17CB0',
        '#B2912F',
        '#B276B2',
        '#DECF3F',
        '#F15854',

        // '#FF0000',
        // '#00FF00',
        // '#0000FF',
        // '#FFFF00',
        // '#FF00FF',
        // '#00FFFF',
        // '#800000',
        // '#008000',
        // '#000080',
        // '#808000',
        // '#800080',
        // '#008080',
        // '#C0C0C0',
        // '#808080',
        // '#9999FF',
        // '#993366',
        // '#FFFFCC',
        // '#CCFFFF',
        // '#660066',
        // '#FF8080',
        // '#0066CC',
        // '#CCCCFF',
        // '#000080',
        // '#FF00FF',
        // '#FFFF00',
        // '#00FFFF',
        // '#800080',
        // '#800000',
        // '#008080',
        // '#0000FF',
        // '#00CCFF',
        // '#CCFFFF',
        // '#CCFFCC',
        // '#FFFF99',
        // '#99CCFF',
        // '#FF99CC',
        // '#CC99FF',
        // '#FFCC99',
        // '#3366FF',
        // '#33CCCC',
        // '#99CC00',
        // '#FFCC00',
        // '#FF9900',
        // '#FF6600',
        // '#666699',
        // '#969696',
        // '#003366',
        // '#339966',
        // '#003300',
        // '#333300',
        // '#993300',
        // '#993366',
        // '#333399',
        // '#333333',
    ];

    Track.prototype.start = function (pageIndex, onFixation, onCompleted) {
        this.onFixation = onFixation;
        this.onCompleted = onCompleted;

        this.fixations = this.session[ pageIndex ].fixations;
        this.fixationIndex = 0;

        this.pointer = document.createElement( 'div' );
        this.pointer.classList.add( 'track_pointer' );
        this.pointer.classList.add( 'invisible' );
        this.root.appendChild( this.pointer );

        this.nextTimer = setTimeout( this.__next, 1500);
    }

    Track.prototype.stop = function () {
        if (this.nextTimer) {
            clearTimeout( this.nextTimer );
            this.nextTimer = null;
        }

        if (this.fixationTimer) {
            clearTimeout( this.fixationTimer );
            this.fixationTimer = null;
        }

        if (this.pointer) {
            this.root.removeChild( this.pointer );
            this.pointer = null;
        }
    }

    Track.prototype._next = function () {
        let fixation = this.fixations[ this.fixationIndex ];

        this._moveFixation( fixation );

        this.fixationIndex++;
        if (this.fixationIndex < this.fixations.length) {
            let pause = this.fixations[ this.fixationIndex ].ts - fixation.ts;
            this.nextTimer = setTimeout( this.__next, pause );
        }
        else {
            this.onCompleted();
            this.root.removeChild( this.pointer );
            this.pointer = null;
            this.nextTimer = null;
        }
    }

    Track.prototype._moveFixation = function (fixation) {
        if (this.fixationTimer) {
            clearTimeout( this.fixationTimer );
            this.fixationTimer = null;
        }

        if (fixation) {
            this.onFixation( fixation, this.pointer );

            if (fixation.x > 0 && fixation.y > 0) {
                const size = Track.basePointerSize + Math.sqrt( fixation.duration / 30 );
                this.pointer.style = `left: ${fixation.x - size / 2}px;
                                      top: ${fixation.y - size / 2}px;
                                      width: ${size}px;
                                      height: ${size}px;
                                      border-radius: ${size / 2}px;
                                      background-color: ${this.color};`;
                this.pointer.classList.remove( 'invisible' );
            }

            this.fixationTimer = setTimeout( () => {
                this.fixationTimer = null;
                if (this.pointer) {
                    this.pointer.classList.add( 'invisible' );
                }
            }, fixation.duration);
        }
        else {
            this.pointer.classList.add( 'invisible' );
        }
    }

    app.GazeReplay = GazeReplay;

})( this.Reading || module.exports );
