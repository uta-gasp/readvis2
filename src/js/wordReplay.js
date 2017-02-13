// Requires:

(function (app) { 'use strict';

    // Real-time visualization constructor
    // Arguments:
    //      options: {
    //          focusColor           - focus color
    //      }
    function WordReplay (options) {

        this.focusColor = options.focusColor || '#F80';

        this.longFixationThreshold = 1000;

        this.wordListWidth = 100;
        this.wordHeight = 20;
        this.wordPaddingX = 4;
        this.wordPaddingY = 4;

        this.fontFamily = 'Calibri, Arial, sans-serif';
        this.captionFontSize = 16;
        this.captionFont = `${this.captionFontSize}px ${this.fontFamily}`;

        options.wordColor = options.wordColor || '#222';
        options.wordFont = options.wordFont || `${this.wordHeight - this.wordPaddingY}px ${this.fontFamily}`;

        app.Visualization.call( this, options );

        this._data = null;
        this._tracks = null;
        this._tracksLegendLocation = {x: 8, y: 8};
    }

    app.loaded( () => { // we have to defer the prototype definition until the Visualization mudule is loaded

    WordReplay.prototype = Object.create( app.Visualization.prototype );
    WordReplay.prototype.base = app.Visualization.prototype;
    WordReplay.prototype.constructor = WordReplay;

    WordReplay.prototype._fillCategories = function (list, users) {
        const texts = this._getTexts( users );
        texts.forEach( (text, id) => {
            const option = this._addOption( list, id, text.title, text.sessions );
            if (this._data && this._data.textID === id) {
                option.selected = true;
            }
        });
    };

    WordReplay.prototype._load = function (cbLoaded, textID, sessions, textTitle) {

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
                sessions: sessionDatas,
                hyphen: sessionDatas[0].meta.interaction.syllabification.hyphen
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

    WordReplay.prototype._start = function () {
        if (!this._tracks.length) {
            return;
        }

        var ctx = this._getCanvas2D();

        const words = this._data.text[ this._pageIndex ];

        this._computeFontSize( words );
        this._drawWords( ctx, words );
        this._drawTracks( ctx );

        this._run( ctx );
    };

    WordReplay.prototype._stopAll = function () {
        if (this._tracks) {
            this._tracks.forEach( track => track.stop() );
        }
    }

    WordReplay.prototype._run = function( ctx ) {
        this._tracks.forEach( (track, ti) => {
            track.start(
                this._pageIndex,
                this._data.text[ this._pageIndex ],
                (word, duration, pointer) => {
                    const rawWord = track.words[ word.id ];
                    rawWord.totalDuration = rawWord.totalDuration + duration;

                    const tone = 255 - 24 * Math.min( 10, 1 + Math.floor( rawWord.totalDuration / this.longFixationThreshold ) );
                    ctx.fillStyle = `rgb(${tone},${tone},${tone})`;  //'rgba(0,0,0,0.40)';

                    const y = track.y + word.id * track.height;
                    ctx.fillRect( track.x, y, track.width - 1, track.height );
                    // pointer.style = `left: ${track.x + Math.round((track.width - pointer.offsetWidth) / 2)}px;
                    //                  top: ${y + Math.round((track.height - pointer.offsetHeight) / 2)}px`;
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

    WordReplay.prototype._prevPage = function () {
        this._stopAll();
        if (this._data && this._pageIndex > 0) {
            this._pageIndex--;
            this._enableNavigationButtons( this._pageIndex > 0, this._pageIndex < this._data.text.length - 1 );
            this._start();
        }
    };

    WordReplay.prototype._nextPage = function () {
        this._stopAll();
        if (this._data && this._pageIndex < this._data.text.length - 1) {
            this._pageIndex++;
            this._enableNavigationButtons( this._pageIndex > 0, this._pageIndex < this._data.text.length - 1 );
            this._start();
        }
    };

    WordReplay.prototype._computeFontSize = function (words) {
        const viewportHeight = document.querySelector( '#visualization' ).offsetHeight;
        const trackHeight = viewportHeight - this._tracksLegendLocation.y - 2 * (this.captionFontSize + 2 * this.wordPaddingY);
        this.wordHeight = Math.min( 24, Math.max( 8, Math.floor( trackHeight / words.length ) ) );
        this.wordFont = `${this.wordHeight - this.wordPaddingY}px ${this.fontFamily}`;
    };

    WordReplay.prototype._drawWords = function (ctx, words) {
        ctx.textAlign = 'end';
        ctx.textBaseline = 'top';
        ctx.fillStyle = this.wordColor;
        ctx.font = this.wordFont;

        const hyphenRegExp = new RegExp( `${this._data.hyphen}`, 'g' );
        const maxWordWidth = words.reduce( (max, word) => {
            return Math.max( max, ctx.measureText( word.text.replace( hyphenRegExp, '') ).width );
        }, 0 );
        this.wordListWidth = maxWordWidth + 2 * this.wordPaddingX;

        const x = this._tracksLegendLocation.x + this.wordPaddingX + maxWordWidth;
        const y = this._tracksLegendLocation.y + this.captionFontSize + 2 * this.wordPaddingY;

        words.forEach( (word, index) => {
            ctx.fillText( word.text.replace( hyphenRegExp, ''), x, y + this.wordHeight * index + this.wordPaddingY );
        });
    };

    WordReplay.prototype._drawTracks = function( ctx ) {
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillStyle = this.wordColor;
        ctx.font = this.captionFont;
        ctx.strokeStyle = '#000';

        const x = this._tracksLegendLocation.x + this.wordListWidth;
        const y = this._tracksLegendLocation.y + this.captionFontSize + 2 * this.wordPaddingY;

        let trackOffsetX = 0;
        this._tracks.forEach( track => {
            track.setRect(
                x + trackOffsetX, y,
                ctx.measureText( track.name ).width + 2 * this.wordPaddingX,
                this.wordHeight
            );

            ctx.fillText(
                track.name,
                track.x + track.width * 0.5,
                track.y - this.wordPaddingY
            );
            this._data.text[ this._pageIndex ].forEach( (word, wi) => {
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

    }); // end of delayed call

    function Track (root, session) {
        this.root = root;
        this.name = session.meta.user;

        this.x = 0;
        this.y = 0;
        this.width = 0;
        this.heigth = 0;
        this.pointerSize = 8;
        this.fixationTimer = null;
        this.nextTimer = null;

        this.session = session;
        this.fixations = null;
        this.words = null;

        this.fixationIndex = -1;

        this.__next = this._next.bind( this );
    }

    Track.prototype.setRect = function (x, y, width, height) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
    };

    Track.prototype.start = function (pageIndex, words, onWordFixated, onCompleted) {
        this.onWordFixated = onWordFixated;
        this.onCompleted = onCompleted;

        const data = {
            fixations: this.session[ pageIndex ].fixations,
            words: words,
        };

        const mappingResult = this._remapStatic( data );

        this.fixations = mappingResult.fixations;
        this.words = mappingResult.text.words;

        this.words.forEach( word => {
            word.totalDuration = 0;
        });

        this.fixationIndex = 0;

        this.pointer = document.createElement( 'div' );
        this.pointer.classList.add( 'track_pointer' );
        this.pointer.classList.add( 'invisible' );
        this.root.appendChild( this.pointer );

        this.nextTimer = setTimeout( this.__next, 1500);
    };

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
    };

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
    };

    Track.prototype._moveFixation = function (word, duration) {
        if (this.fixationTimer) {
            clearTimeout( this.fixationTimer );
            this.fixationTimer = null;
        }

        if (word) {
            this.onWordFixated( word, duration, this.pointer );

            const y = this.y + word.id * this.height;
            this.pointer.style = `left: ${this.x + (this.width - this.pointerSize) / 2}px;
                                  top: ${y + (this.height - this.pointerSize) / 2}px`;
            this.pointer.classList.remove( 'invisible' );

            this.fixationTimer = setTimeout( () => {
                this.fixationTimer = null;
                if (this.pointer) {
                    this.pointer.classList.add( 'invisible' );
                }
            }, duration);
        }
        else {
            this.pointer.classList.add( 'invisible' );
        }
    };

    Track.prototype._remapStatic = function (session) {
        let settings;

        settings = new SGWM.FixationProcessorSettings();
        settings.location.enabled = false;
        settings.duration.enabled = false;
        settings.save();

        settings = new SGWM.SplitToProgressionsSettings();
        settings.bounds = { // in size of char height
            left: -0.5,
            right: 8,
            verticalChar: 2,
            verticalLine: 0.6
        };
        settings.angle = Math.sin( 15 * Math.PI / 180 );
        settings.save();

        settings = new SGWM.ProgressionMergerSettings();
        settings.minLongSetLength = 2;
        settings.fitThreshold = 0.28;       // fraction of the interline distance
        settings.maxLinearGradient = 0.15;
        settings.removeSingleFixationLines = false;
        settings.correctForEmptyLines = true;
        settings.emptyLineDetectorFactor = 1.6;
        settings.save();

        settings = new SGWM.WordMapperSettings();
        settings.wordCharSkipStart = 3;
        settings.wordCharSkipEnd = 6;
        settings.scalingDiffLimit = 0.9;
        settings.rescaleFixationX = false;
        settings.partialLengthMaxWordLength = 2;
        settings.effectiveLengthFactor = 0.7;
        settings.ignoreTransitions = false;
        settings.save();

        const sgwm = new SGWM();
        const result = sgwm.map( session );

        return result;
    };

    app.WordReplay = WordReplay;

})( this.Reading || module.exports );
