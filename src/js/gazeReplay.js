// Requires:
//      app,Colors
//      app.firebase
//      utils.metric
//      utils.remapExporter

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
        this.nameFontSize = options.nameFontFamily || 14;
        this.nameFont = options.nameFontFamily || `bold ${this.nameFontSize}px ${this.nameFontFamily}`;

        Track.basePointerSize = options.basePointerSize || Track.basePointerSize;

        this.words = null;

        options.wordColor = options.wordColor || '#222';
        options.colorMetric = app.Metric.Type.NONE;

        app.Visualization.call( this, options );
    }

    app.loaded( () => { // we have to defer the prototype definition until the Visualization mudule is loaded

    GazeReplay.prototype = Object.create( app.Visualization.prototype );
    GazeReplay.prototype.base = app.Visualization.prototype;
    GazeReplay.prototype.constructor = GazeReplay;

    GazeReplay.prototype._stopAll = function () {
        if (this._tracks) {
            this._tracks.forEach( track => track.stop() );
        }
    }

    GazeReplay.prototype._fillDataQueryList = function (list) {

        var conditions = this._getConditions( false );
        var result = new Map();

        for (var key of conditions.keys()) {
            result.set( `Text #${key}`, conditions.get( key ) );
        }

        return result;
    };

    GazeReplay.prototype._load = function (names) {
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

        Track.colorIndex = 0;
        var tracks = [];
        names.forEach( (name, index) => {
            var session = this._snapshot.child( name );
            if (session && session.exists()) {
                var sessionVal = session.val();
                if (sessionVal && sessionVal.fixations) {
                    tracks.push( new Track( app.Visualization.root, name, sessionVal ) );
                    this.words = sessionVal.words;
                }
            }
        });

        if (!tracks.length) {
            return;
        }

        var ctx = this._getCanvas2D();

        // var words = tracks[0].words;
        this._drawWords( ctx, this.words, null, false, true );
        this._drawNames( ctx, tracks );

        this._run( ctx, tracks );
        this._tracks = tracks;
    };

    GazeReplay.prototype._drawNames = function (ctx, tracks) {
        tracks.forEach( (track, ti) => {
            ctx.textAlign = 'left';
            ctx.textBaseline = 'bottom';
            ctx.fillStyle = track.color;
            ctx.font = this.nameFont;

            ctx.fillText(
                track.name,
                8,
                64 + 25 * ti
            );
        });
    };

    GazeReplay.prototype._run = function (ctx, tracks) {
        tracks.forEach( (track, ti) => {
            track.start(
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
                        'v',
                        5,
                        20 + 25 * ti
                    );
                }
            );
        })
    };

    }); // end of delayed call

    function Track (root, name, session) {
        this.root = root;
        this.name = name;
        this.color = Track.colors[ Track.colorIndex++ % Track.colors.length ];

        this.pointerSize = 8;
        this.fixationTimer = null;
        this.nextTimer = null;

        this.fixations = session.fixations;

        this.delay = Math.round( 3000 * Math.random() );
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

    Track.prototype.start = function (onFixation, onCompleted) {
        this.onFixation = onFixation;
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
