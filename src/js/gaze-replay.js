// Requires:
//      app.Metric

(function( app ) { 'use strict';

    // Real-time visualization constructor
    // Arguments:
    //      options: {
    //          // name font options
    //          nameFontSize
    //          basePointerSize (Number) - minimum pointer size
    //      }
    function GazeReplay( options ) {

        this.nameFontSize = options.nameFontSize || 20;
        this.nameSpacing = 1.5;

        Track.basePointerSize = options.basePointerSize || Track.basePointerSize;

        options.colorMetric = app.Metric.Type.NONE;

        app.Visualization.call( this, options );

        this.options = {
            id: 'gaze-replay',
            title: 'Gaze replay',
            update: this.update.bind( this ),
            options: app.Visualization.createOptions({
                nameFontSize: { type: Number, label: 'Font size' },
                nameSpacing: { type: Number, step: 0.1, label: 'Spacing' },
            }, this )
        };

        this._data = null;
        this._tracks = null;
        this._tracksLegendLocation = {x: this.nameFontSize + 2, y: 8};

        this._nameFontFamily = 'Calibri, Arial, sans-serif';
    }

    app.loaded( () => { // we have to defer the prototype definition until the Visualization mudule is loaded

    GazeReplay.prototype = Object.create( app.Visualization.prototype );
    GazeReplay.prototype.base = app.Visualization.prototype;
    GazeReplay.prototype.constructor = GazeReplay;

    GazeReplay.prototype._fillCategories = function( list, users ) {
        const texts = this._getTexts( users );
        texts.forEach( (text, id) => {
            const option = this._addOption( list, id, text.title, text.sessions );
            if (this._data && this._data.textID === id) {
                option.selected = true;
            }
        });
    };

    GazeReplay.prototype._load = function( cbLoaded, textID, sessions, textTitle ) {

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
                hyphen: sessionDatas[0].meta.interaction.syllabification.hyphen,
                font: sessionDatas[0].meta.font,
            };

            Track.colorIndex = 0;
            this._tracks = [];

            sessionDatas.forEach( sessionData => {
                this._tracks.push( new Track( app.Visualization.root, sessionData ) );
            });

            this._setPageIndex( 0 );
            this._start();

            this._setPrevPageCallback( () => { this._prevPage(); } );
            this._setNextPageCallback( () => { this._nextPage(); } );
            this._setCloseCallback( () => { this._stopAll(); } );
            this._setRestartCallback( () => {
                this._stopAll();
                this._start();
            });
            this._setPauseCallback( () => {
                let isRunning = false;
                this._tracks.forEach( track => { isRunning = track.togglePause() || isRunning; } );
                return {
                    previous: isRunning ? 'play' : 'pause',
                    current: isRunning ? 'pause' : 'play',
                };
            });

            if (cbLoaded) {
                cbLoaded();
            }

        }).catch( reason => {
            window.alert( reason );
        });
    };

    GazeReplay.prototype._start = function() {
        if (!this._tracks.length) {
            return;
        }

        this._setPlayerProps({ a: 110 });

        const ctx = this._getCanvas2D();
        this._setTitle( `"${this._data.text.title}" for ${this._data.sessions.length} sessions` );

        const words = this._data.text[ this._pageIndex ];

        this._setCanvasFont( ctx, this._data.font );
        this._drawWords( ctx, words, {
            metricRange: null,
            showIDs: false,
            hideBoundingBox: true,
            hyphen: this._data.hyphen
        });

        this._drawNames( ctx );

        this._run( ctx );
    };

    GazeReplay.prototype._stopAll = function() {
        if (this._tracks) {
            this._tracks.forEach( track => track.stop() );
        }
    };

    GazeReplay.prototype._run = function( ctx ) {
        this._tracks.forEach( (track, ti) => {
            track.start(
                this._pageIndex, {  // callbacks
                    fixation: (fixation, pointer) => {
                    },
                    completed: () => {
                        ctx.textAlign = 'left';
                        ctx.textBaseline = 'top';
                        ctx.strokeStyle = '#000';
                        ctx.fillStyle = track.color;
                        ctx.font = `bold ${this.nameFontSize}px ${this._nameFontFamily}`;
                        ctx.fillText(
                            checkMark,
                            this._tracksLegendLocation.x - this.nameFontSize,
                            this._tracksLegendLocation.y + (this.nameSpacing * this.nameFontSize) * ti
                        );
                    },
                    syllabification: syllabification => {
                        this._setCanvasFont( ctx, this._data.font );
                        this._drawSyllabification( ctx, syllabification, this._data.hyphen );
                    }
                }
            );
        });
    };

    GazeReplay.prototype._prevPage = function() {
        this._stopAll();
        if (this._data && this._pageIndex > 0) {
            this._setPageIndex( this._pageIndex - 1 );
            this._start();
        }
    };

    GazeReplay.prototype._nextPage = function() {
        this._stopAll();
        if (this._data && this._pageIndex < this._data.text.length - 1) {
            this._setPageIndex( this._pageIndex + 1 );
            this._start();
        }
    };

    GazeReplay.prototype._drawNames = function( ctx ) {
        this._tracks.forEach( (track, ti) => {
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';
            ctx.fillStyle = track.color;
            ctx.font = `bold ${this.nameFontSize}px ${this._nameFontFamily}`;

            ctx.fillText(
                track.name,
                this._tracksLegendLocation.x,
                this._tracksLegendLocation.y + (this.nameSpacing * this.nameFontSize) * ti
            );
        });
    };

    }); // end of delayed call

    function Track( root, session ) {
        this.root = root;
        this.name = session.meta.user;
        this.session = session;
        this.color = app.Colors.colors[ Track.colorIndex++ % app.Colors.colors.length ];

        this.pointerSize = 8;
        this.fixationEndTimer = null;
        this.fixationGrowTimer = null;
        this.nextTimer = null;
        this.syllabTimer = null;

        this.fixations = null;
        this.currentFixation = null;
        this.currentDuration = 0;
        this.fixationIndex = -1;

        this._lastPause = 0;

        this.__next = this._next.bind( this );
    }

    Track.basePointerSize = 6;
    Track.fixationGrowInterval = 100;
    Track.colorIndex = 0;

    Track.prototype.start = function( pageIndex, callbacks ) {
        this.callbacks = callbacks || {};
        this.callbacks.fixation = this.callbacks.fixation || (() => {});
        this.callbacks.completed = this.callbacks.completed || (() => {});
        this.callbacks.syllabification = this.callbacks.syllabification || (() => {});

        this.fixations = this.session[ pageIndex ].fixations;
        if (!this.fixations) {
            onCompleted();
            return;
        }

        this.syllabifications = this.session[ pageIndex ].syllabifications;
        this.nextSyllabificationIndex = this.syllabifications ? 0 : -1;

        this.fixationIndex = 0;

        this.pointer = document.createElement( 'div' );
        this.pointer.classList.add( 'track-pointer' );
        this.pointer.classList.add( 'invisible' );
        this.root.appendChild( this.pointer );

        this.nextTimer = setTimeout( this.__next, 1500);
    };

    Track.prototype.stop = function() {
        this._stopFixationTimers();

        if (this.nextTimer) {
            clearTimeout( this.nextTimer );
            this.nextTimer = null;
        }

        if (this.pointer) {
            this.root.removeChild( this.pointer );
            this.pointer = null;
        }
    };

    Track.prototype.togglePause = function() {
        if (!this.pointer) {
            return false;
        }

        if (this.nextTimer) {
            this._stopFixationTimers();

            clearTimeout( this.nextTimer );
            this.nextTimer = null;

            return true;
        }
        else {
            this.nextTimer = setTimeout( this.__next, this._lastPause );
            this._moveFixation( this.currentFixation );

            return false;
        }
    }

    // private

    Track.prototype._stopFixationTimers = function() {
        if (this.fixationEndTimer) {
            clearTimeout( this.fixationEndTimer );
            this.fixationEndTimer = null;
        }

        if (this.fixationGrowTimer) {
            clearInterval( this.fixationGrowTimer );
            this.fixationGrowTimer = null;
        }

        if (this.syllabTimer) {
            clearTimeout( this.syllabTimer );
            this.syllabTimer = null;
        }
    };

    Track.prototype._next = function() {
        let fixation = this.fixations[ this.fixationIndex ];

        this._moveFixation( fixation );

        this.fixationIndex++;
        if (this.fixationIndex < this.fixations.length) {
            this._lastPause = this.fixations[ this.fixationIndex ].ts - fixation.ts;
            this.nextTimer = setTimeout( this.__next, this._lastPause );
        }
        else {
            this.callbacks.completed();
            this.root.removeChild( this.pointer );
            this.pointer = null;
            this.nextTimer = null;
        }
    };

    Track.prototype._moveFixation = function( fixation ) {
        this._stopFixationTimers();

        if (fixation) {
            this._checkSyllabification( fixation );

            this.callbacks.fixation( fixation, this.pointer );

            if (fixation.x > 0 && fixation.y > 0) {
                // const size = Track.basePointerSize + Math.sqrt( fixation.duration / 30 );
                this.currentDuration = 100;
                this._updatePointer();
                this.pointer.classList.remove( 'invisible' );
            }

            this.fixationEndTimer = setTimeout( () => {
                this._stopFixationTimers();
                if (this.pointer) {
                    this.pointer.classList.add( 'invisible' );
                }
            }, fixation.duration );

            this.fixationGrowTimer = setInterval( () => {
                this._updatePointer();
            }, Track.fixationGrowInterval );
        }
        else {
            this.pointer.classList.add( 'invisible' );
        }

        this.currentFixation = fixation;
    };

    Track.prototype._updatePointer = function() {
        if (!this.currentFixation || !this.pointer) {
            return;
        }

        const size = Math.round( Math.sqrt( this.currentDuration ) );
        this.pointer.style = `left: ${this.currentFixation.x - size / 2}px;
                              top: ${this.currentFixation.y - size / 2}px;
                              width: ${size}px;
                              height: ${size}px;
                              border-radius: ${size / 2}px;
                              background-color: ${this.color};`;

        this.currentDuration += Track.fixationGrowInterval;
    };

    Track.prototype._checkSyllabification = function( fixation ) {
        if (this.nextSyllabificationIndex < 0) {
            return;
        }

        const syllabification = this.syllabifications[ this.nextSyllabificationIndex ];
        const fixationEndsAt = fixation.tsSync + fixation.duration;
        if (syllabification.ts < fixationEndsAt) {
            this.nextSyllabificationIndex++;
            if (this.nextSyllabificationIndex === this.syllabifications.length) {
                this.nextSyllabificationIndex = -1;
            }

            this.syllabTimer = setTimeout( () => {
                this.syllabTimer = null;
                this.callbacks.syllabification( syllabification );
            }, (fixationEndsAt - syllabification.ts) );
        }
    };

    const checkMark = String.fromCharCode( 0x2713 );

    app.GazeReplay = GazeReplay;

})( window.ReadVis2 );
