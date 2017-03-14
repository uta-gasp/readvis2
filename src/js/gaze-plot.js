// Requires:
//      app.WordList
//      app.Metric
//      app.Visualization

(function( app ) { 'use strict';

    // Gaze plot visualization constructor
    // Arguments:
    //      options: {
    //          saccadeColor        - saccade color
    //          connectionColor     - connection color
    //          showIDs             - if set, fixations and words are labelled by IDs. FIxations also have single color
    //          showConnections     - flat to display fixation-word connections
    //          showSaccades        - flag to display saccades
    //          showFixations       - flag to display fixations
    //          greyFixationColor   - the color of fixation used for inspection
    //          greyFixationSize    - size of grey fixations
    //          fixationNumberSize
    //          fixationNumberColor
    //      }
    function GazePlot( options ) {

        this.saccadeColor = options.saccadeColor || '#08F';
        this.connectionColor = options.connectionColor || '#F00';

        this.showIDs = options.showIDs || false;
        this.showConnections = options.showConnections !== undefined ? options.showConnections : true;
        this.showSaccades = options.showSaccades !== undefined ? options.showSaccades : true;
        this.showFixations = options.showFixations !== undefined ? options.showFixations : true;

        this.greyFixationColor = options.greyFixationColor || 'rgba(0,0,0,0.5)';
        this.greyFixationSize = options.greyFixationSize || 15;
        this.fixationNumberSize = options.fixationNumberSize || 16;
        this.fixationNumberColor = options.fixationNumberColor || '#FF0';

        this.wordListUnits = options.wordListUnits || app.WordList.Units.MS;

        const lineColorA = 0.5;
        this._lineColors = [
            `rgba(255,0,0,${lineColorA}`,
            `rgba(255,255,0,${lineColorA}`,
            `rgba(0,255,0,${lineColorA}`,
            `rgba(0,255,224,${lineColorA}`,
            `rgba(0,128,255,${lineColorA}`,
            `rgba(255,0,255,${lineColorA}`,
        ];
        this._unmappedFixationColor = '#000';
        this._mergedFixationBorderColor = '#808';

        app.Visualization.call( this, options );

        this.options = {
            id: 'gaze-plot',
            title: 'Gaze plot',
            update: this.update.bind( this ),
            options: app.Visualization.createOptions({
                colorMetric: { type: Array, items: ['none', 'duration', 'char speed', 'syllable speed'], label: 'Word color metric' },
                showConnections: { type: Boolean, label: 'Show word-fixation connections' },
                connectionColor: { type: '#', label: 'Connection color' },
                showSaccades: { type: Boolean, label: 'Show saccades' },
                saccadeColor: { type: '#', label: 'Saccade color' },
                showFixations: { type: Boolean, label: 'Show fixations' },
                greyFixationColor: { type: '#', label: 'Default fixation color' },
                greyFixationSize: { type: Number, step: 1, label: 'Default fixation size' },
                showIDs: { type: Boolean, label: 'Show IDs' },
                fixationNumberSize: { type: Number, step: 1, label: 'ID font size' },
                fixationNumberColor: { type: '#', label: 'ID color' },
                wordListUnits: { type: Array, items: Object.values( app.WordList.Units ), label: 'Word list units' },
            }, this )
        };

        this._data = null;
    }

    app.loaded( () => { // we have to defer the prototype definition until the Visualization mudule is loaded

    GazePlot.prototype = Object.create( app.Visualization.prototype );
    GazePlot.prototype.base = app.Visualization.prototype;
    GazePlot.prototype.constructor = GazePlot;

    GazePlot.prototype.update = function() {
        if (this._pageIndex >= 0) {
            this._mapAndShow();
        }
    };

    GazePlot.prototype._fillCategories = function( list, users ) {
        const userData = [];
        users.forEach( userSnapshot => {
            const user = userSnapshot.val();
            user.name = userSnapshot.key;
            userData.push( user );
        });

        const gradeUsers = this._classifyUsersByGrade( userData );

        for (let grade in gradeUsers) {
            const option = this._addOption( list, grade, grade, gradeUsers[ grade ] );
            if (this._data && this._data.grade === grade) {
                option.selected = true;
            }
        }

        return 'Select a student';
        // users.forEach( user => {
        //     const userSessions = user.val()['sessions'];
        //     const sessions = new Map();
        //     for (let key of Object.keys( userSessions )) {
        //         sessions.set( key, userSessions[ key ] );
        //     }

        //     const option = this._addOption( list, user.key, user.key, sessions );
        //     if (this._data && this._data.user === user.key) {
        //         option.selected = true;
        //     }
        // });
    };

    // GazePlot.prototype._load = function( cbLoaded, sessionID, sessionName, sessionMeta, userName ) {
    GazePlot.prototype._load = function( cbLoaded, _, userName, user, grade ) {

        const sessionIDs = [];
        for (let sessionID in user.sessions) {
            sessionIDs.push( sessionID );
        }

        const sessionID = sessionIDs[0];
        const sessionMeta = user.sessions[ sessionID ];
        const sessionName = app.Visualization.formatDate( sessionMeta.date );

        const sessionPromise = this._loadSession( sessionID, sessionMeta );
        const textPromise = this._loadText( sessionMeta.text );

        Promise.all( [sessionPromise, textPromise] ).then( ([session, text]) => {
            this._data = {
                user: userName,
                grade: grade,
                sessionName: sessionName,
                sessionID: sessionID,
                session: session,
                text: text
            };

            app.WordList.instance.show();

            this._setSessionProps({
                speech: {
                    enabled: session.meta.interaction.speech.enabled,
                    value: Math.round( session.meta.interaction.speech.threshold )
                },
                syllab: {
                    enabled: session.meta.interaction.syllabification.enabled,
                    value: Math.round( session.meta.interaction.syllabification.threshold )
                }
            });

            this._recreateWordIDsInEvents( this._data.session, this._data.text );

            this._setPageIndex( 0 );
            this._mapAndShow();

            this._setPrevPageCallback( () => { this._prevPage(); } );
            this._setNextPageCallback( () => { this._nextPage(); } );
            this._setCloseCallback( undefined );

            if (cbLoaded) {
                cbLoaded();
            }

        }).catch( reason => {
            window.alert( reason );
        });
    };

    GazePlot.prototype._mapAndShow = function() {
        const sessionPage = this._data.session[ this._pageIndex ];
        const hyphen = this._data.session.meta.interaction.syllabification.hyphen;

        app.WordList.instance.fill(
            sessionPage.records, {
                hyphen: hyphen,
                units: this.wordListUnits
            }
        );

        const data = {
            fixations: sessionPage.fixations,
            words: this._data.text[ this._pageIndex ],
        };

        if (!data.fixations) {
            return;
        }

        const fixations = this._map( data ).fixations;

        const metricRange = app.Metric.compute( data.words, this.colorMetric );

        const ctx = this._getCanvas2D();
        this._setCanvasFont( ctx, this._data.session.meta.font );

        this._drawWords( ctx, data.words, {
            metricRange: metricRange,
            showIDs: this.showIDs,
            hideBoundingBox: (this.showIDs && !this.showConnections),
            hyphen: hyphen
        });

        if (sessionPage.syllabifications) {
            this._drawSyllabifications( ctx, sessionPage.syllabifications, hyphen );
        }
        if (this.showFixations && fixations) {
            this._drawFixations( ctx, fixations );
        }

        this._setTitle( `${this._data.user} reading "${this._data.session.meta.textTitle}" at ${this._data.sessionName}` );
    };

    GazePlot.prototype._drawFixations = function( ctx, fixations ) {
        let prevFix, fix;
        let id = 0;
        for (let i = 0; i < fixations.length; i += 1) {
            fix = fixations[i];
            if (fix.x <= 0 && fix.y <= 0) {
                continue;
            }

            if (this.showSaccades && prevFix) {
                this._drawSaccade( ctx, prevFix, fix );
            }

            if (this.showConnections && fix.word) {
                this._drawConnection( ctx, fix, {x: fix.word.left, y: fix.word.top} );
            }

            this._drawFixation( ctx, fix, fix.id );

            prevFix = fix;
            id++;
        }
    };

    GazePlot.prototype._drawFixation = function( ctx, fixation, id ) {
        if (this.showIDs) {
            this._drawGreyFixation( ctx, fixation, id );
        }
        else {
            this._drawColoredFixation( ctx, fixation, id );
        }
    };

    GazePlot.prototype._drawGreyFixation = function( ctx, fixation, id ) {
        ctx.fillStyle = this.greyFixationColor;
        ctx.beginPath();
        ctx.arc( fixation._x ? fixation._x : fixation.x, fixation.y, this.greyFixationSize, 0, 2*Math.PI);
        ctx.fill();

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = `bold ${this.fixationNumberSize}px Verdana`;
        ctx.fillStyle = this.fixationNumberColor;
        ctx.fillText( '' + id, fixation._x ? fixation._x : fixation.x, fixation.y );
    };

    GazePlot.prototype._drawColoredFixation = function( ctx, fixation, id ) {
        if (fixation.line !== undefined) {
            ctx.fillStyle = this._lineColors[ fixation.line % this._lineColors.length ];
        }
        else {
            ctx.fillStyle = this._unmappedFixationColor;
        }

        const circleSize = Math.round( Math.sqrt( fixation.duration ) ) / 2;

        ctx.beginPath();
        ctx.arc( fixation.x, fixation.y, circleSize, 0, 2*Math.PI);
        ctx.fill();

        if (fixation.merged) {
            ctx.strokeStyle = this._mergedFixationBorderColor;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc( fixation.x, fixation.y, circleSize + 3, 0, 2*Math.PI);
            ctx.stroke();
            ctx.lineWidth = 1;
        }
    };

    GazePlot.prototype._drawSaccade = function( ctx, from, to ) {
        ctx.strokeStyle = this.saccadeColor;
        ctx.beginPath();
        ctx.moveTo( this.showIDs ? (from._x ? from._x : from.x) : from.x, from.y );
        ctx.lineTo( this.showIDs ? (to._x ? to._x : to.x) : to.x, to.y );
        ctx.stroke();
    };

    GazePlot.prototype._drawConnection = function( ctx, from, to ) {
        ctx.strokeStyle = this.connectionColor;
        ctx.beginPath();
        ctx.moveTo( this.showIDs ? (from._x ? from._x : from.x) : from.x, from.y );
        ctx.lineTo( to.x, to.y );
        ctx.stroke();
    };

    GazePlot.prototype._prevPage = function() {
        if (this._data && this._pageIndex > 0) {
            this._setPageIndex( this._pageIndex - 1 );
            this._mapAndShow();
        }
    };

    GazePlot.prototype._nextPage = function() {
        if (this._data && this._pageIndex < this._data.text.length - 1) {
            this._setPageIndex( this._pageIndex + 1 );
            this._mapAndShow();
        }
    };

    }); // end of delayed call

    app.GazePlot = GazePlot;

})( window.ReadVis2 );
