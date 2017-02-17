// Requires:
//      app.Metric

(function( app ) { 'use strict';

    // Real-time visualization constructor
    // Arguments:
    //      options: {
    //          // name font options
    //          nameFontFamily
    //          nameFontSize
    //          basePointerSize (Number) - minimum pointer size
    //      }
    function GazeReplay( options ) {

        this.nameFontFamily = options.nameFontFamily || 'Calibri, Arial, sans-serif';
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
                nameFontFamily: { type: new String(), label: 'Font name' },
                nameFontSize: { type: new Number(), label: 'Font size' },
                nameSpacing: { type: new Number(0.1), label: 'Spacing' },
            }, this )
        };

        this._data = null;
        this._tracks = null;
        this._tracksLegendLocation = {x: this.nameFontSize + 2, y: 8};
    }

    app.loaded( () => { // we have to defer the prototype definition until the Visualization mudule is loaded

    GazeReplay.prototype = Object.create( app.Visualization.prototype );
    GazeReplay.prototype.base = app.Visualization.prototype;
    GazeReplay.prototype.constructor = GazeReplay;

    GazeReplay.prototype.update = function() {
    };

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
                sessions: sessionDatas
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

        const ctx = this._getCanvas2D();
        this._drawTitle( ctx, `"${this._data.text.title}" for ${this._data.sessions.length} sessions` );

        const meta = this._data.sessions[0].meta;
        const words = this._data.text[ this._pageIndex ];

        this._setCanvasFont( ctx, meta.font );
        this._drawWords( ctx, words, {
            metricRange: null,
            showIDs: false,
            hideBoundingBox: true,
            hyphen: meta.interaction.syllabification.hyphen
        });

        this._drawNames( ctx );

        this._run( ctx );
    };

    GazeReplay.prototype._stopAll = function() {
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
                    ctx.textBaseline = 'top';
                    ctx.strokeStyle = '#000';
                    ctx.fillStyle = track.color;
                    ctx.font = `bold ${this.nameFontSize}px ${this.nameFontFamily}`;
                    ctx.fillText(
                        String.fromCharCode( 0x2713 ),
                        this._tracksLegendLocation.x - this.nameFontSize,
                        this._tracksLegendLocation.y + (this.nameSpacing * this.nameFontSize) * ti
                    );
                }
            );
        })
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
            ctx.font = `bold ${this.nameFontSize}px ${this.nameFontFamily}`;

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

        this.fixations = null;
        this.currentFixation = null;
        this.currentDuration = 0;
        this.fixationIndex = -1;

        this.__next = this._next.bind( this );
    }

    Track.basePointerSize = 6;
    Track.fixationGrowInterval = 100;
    Track.colorIndex = 0;

    Track.prototype.start = function( pageIndex, onFixation, onCompleted ) {
        this.onFixation = onFixation;
        this.onCompleted = onCompleted;

        this.fixations = this.session[ pageIndex ].fixations;
        if (!this.fixations) {
            onCompleted();
            return;
        }

        this.fixationIndex = 0;

        this.pointer = document.createElement( 'div' );
        this.pointer.classList.add( 'track-pointer' );
        this.pointer.classList.add( 'invisible' );
        this.root.appendChild( this.pointer );

        this.nextTimer = setTimeout( this.__next, 1500);
    }

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
    };

    Track.prototype._next = function() {
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

    Track.prototype._moveFixation = function( fixation ) {
        this._stopFixationTimers();

        if (fixation) {
            this.onFixation( fixation, this.pointer );

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
    }

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

    app.GazeReplay = GazeReplay;

})( this.ReadVis2 || module.exports );
