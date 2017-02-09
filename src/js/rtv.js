// Requires:
//      app,Colors
//      app.firebase
//      utils.metric
//      utils.remapExporter

(function (app) { 'use strict';

    // Real-time visualization constructor
    // Arguments:
    //      options: {
    //          focusColor           - focus color
    //          wordReadingColor     - color of a word read normally
    //          wordLongReadingColor - color of a word read long
    //      }
    function RTV (options) {

        this.focusColor = options.focusColor || '#F80';

        this.longFixationThreshold = 1000;

        this.wordWidth = 100;
        this.wordHeight = 20;
        this.wordPaddingX = 4;
        this.wordPaddingY = 4;

        this.fontFamily = 'Calibri, Arial, sans-serif';
        this.captionFontSize = 16;
        this.captionFont = `${this.captionFontSize}px ${this.fontFamily}`;

        options.wordColor = options.wordColor || '#222';
        options.wordFont = options.wordFont || `${this.wordHeight - this.wordPaddingY}px ${this.fontFamily}`;

        app.Visualization.call( this, options );
    }

    app.loaded( () => { // we have to defer the prototype definition until the Visualization mudule is loaded

    RTV.prototype = Object.create( app.Visualization.prototype );
    RTV.prototype.base = app.Visualization.prototype;
    RTV.prototype.constructor = RTV;

    RTV.prototype._stopAll = function () {
        if (this._tracks) {
            this._tracks.forEach( track => track.stop() );
        }
    }

    RTV.prototype._fillDataQueryList = function (list) {

        var conditions = this._getConditions( true );
        var result = new Map();

        for (var key of conditions.keys()) {
            result.set( `Text #${+key + 1}`, conditions.get( key ) );
        }

        return result;
    };

    RTV.prototype._load = function (names) {
        if (!this._snapshot) {
            return;
        }

        if (!this._tracks) {    // first time, since we do not nullify this._tracks
            let onHidden = this._callbacks().hidden;
            this._callbacks().hidden = () => {
                this._stopAll();
                if (onHidden) {
                    onHidden();
                }
            }
        }

        var tracks = [];
        names.forEach( (name, index) => {
            var session = this._snapshot.child( name );
            if (session && session.exists()) {
                var sessionVal = session.val();
                if (sessionVal && sessionVal.fixations) {
                    tracks.push( new Track( app.Visualization.root, name, sessionVal ) );
                }
            }
        });

        if (!tracks.length) {
            return;
        }

        var ctx = this._getCanvas2D();

        var words = tracks[0].words;
        this._computeFontSize( words );
        this._drawWords( ctx, tracks[0].words );
        this._drawTracks( ctx, tracks );

        this._run( ctx, tracks );
        this._tracks = tracks;
    };

    RTV.prototype._computeFontSize = function (words) {
        var height = document.querySelector( '#visualization' ).offsetHeight;
        var trackHeight = height - 2 * (this.captionFontSize + 2 * this.wordPaddingY);
        this.wordHeight = Math.min( 24, Math.max( 8, Math.floor( trackHeight / words.length ) ) );
        this.wordFont = `${this.wordHeight - this.wordPaddingY}px ${this.fontFamily}`;
    };

    RTV.prototype._drawWords = function (ctx, words) {
        ctx.textAlign = 'end';
        ctx.textBaseline = 'top';
        ctx.fillStyle = this.wordColor;
        ctx.font = this.wordFont;

        var width = words.reduce( (max, word) => {
            return Math.max( max, ctx.measureText( word.text ).width );
        }, 0 );
        this.wordWidth = width + 2 * this.wordPaddingX;

        words.forEach( (word, index) => {
            ctx.fillText(
                word.text,
                width + this.wordPaddingX,
                this.captionFontSize + 2 * this.wordPaddingY + this.wordHeight * index + this.wordPaddingY
            );
        });
    };

    RTV.prototype._drawTracks = function (ctx, tracks) {
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillStyle = this.wordColor;
        ctx.font = this.captionFont;
        ctx.strokeStyle = '#000';

        var trackOffsetX = 0;
        tracks.forEach( track => {
            track.setRect(
                this.wordWidth + trackOffsetX,
                this.captionFontSize + 2 * this.wordPaddingY,
                ctx.measureText( track.name ).width + 2 * this.wordPaddingX,
                this.wordHeight
            );

            ctx.fillText(
                track.name,
                track.x + track.width * 0.5,
                track.y - this.wordPaddingY
            );
            track.words.forEach( (word, wi) => {
                ctx.strokeRect(
                    track.x,
                    track.y + this.wordHeight * wi,
                    track.width,
                    this.wordHeight
                );
            });

            trackOffsetX += track.width;
        });
    };

    RTV.prototype._run = function (ctx, tracks) {
        tracks.forEach( (track, ti) => {
            track.start(
                (word, duration, pointer) => {
                    let rawWord = track.words[ word.id ];
                    rawWord.totalDuration = rawWord.totalDuration + duration;

                    let tone = 255 - 24 * Math.min( 10, 1 + Math.floor( rawWord.totalDuration / this.longFixationThreshold ) );
                    ctx.fillStyle = `rgb(${tone},${tone},${tone})`;  //'rgba(0,0,0,0.40)';

                    let y = track.y + word.id * track.height;
                    ctx.fillRect( track.x, y, track.width - 1, track.height );
                    pointer.style = `left: ${track.x + Math.round((track.width - pointer.offsetWidth) / 2)}px;
                                     top: ${y + Math.round((track.height - pointer.offsetHeight) / 2)}px`;
                },
                () => {
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'top';
                    ctx.fillStyle = this.wordColor;
                    ctx.fillText(
                        'done',
                        track.x + track.width * 0.5,
                        track.y + this.wordHeight * track.words.length + this.wordPaddingY
                    );
                }
            );
        })
    };

    }); // end of delayed call

    function Track (root, name, session) {
        this.root = root;
        this.name = name;

        this.x = 0;
        this.y = 0;
        this.width = 0;
        this.heigth = 0;
        this.pointerSize = 8;
        this.fixationTimer = null;
        this.nextTimer = null;

        session.words.forEach( word => {
            word.totalDuration = 0;
        })

        app.StaticFit.map( session );

        this.fixations = session.fixations;
        this.words = session.words;

        this.delay = Math.round( 3000 * Math.random() );
        this.fixationIndex = -1;

        this.__next = this._next.bind( this );
    }

    Track.prototype.setRect = function (x, y, width, height) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
    }

    Track.prototype.start = function (onWordFixated, onCompleted) {
        this.onWordFixated = onWordFixated;
        this.onCompleted = onCompleted;

        this.fixationIndex = 0;

        this.pointer = document.createElement( 'div' );
        this.pointer.classList.add( 'track_pointer' );
        this.pointer.classList.add( 'invisible' );
        this.root.appendChild( this.pointer );

        this.nextTimer = setTimeout( this.__next, this.delay);
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

        this._moveFixation( fixation.word, fixation.duration );

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

    Track.prototype._moveFixation = function (word, duration) {
        if (this.fixationTimer) {
            clearTimeout( this.fixationTimer );
            this.fixationTimer = null;
        }

        if (word) {
            this.onWordFixated( word, duration, this.pointer );

            let y = this.y + word.id * this.height;
            this.pointer.style = `left: ${this.x + (this.width - this.pointerSize) / 2}px;
                                  top: ${y + (this.height - this.pointerSize) / 2}px`;
            this.pointer.classList.remove( 'invisible' );

            this.fixationTimer = setTimeout( () => {
                this.fixationTimer = null;
                this.pointer.classList.add( 'invisible' );
            }, duration);
        }
        else {
            this.pointer.classList.add( 'invisible' );
        }
    }

    app.RTV = RTV;

})( this.Reading || module.exports );
