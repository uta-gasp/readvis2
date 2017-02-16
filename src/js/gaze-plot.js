// Requires:
//      app.WordList
//      app.Metric
//      app.Visualization

(function( app ) { 'use strict';

    // Gaze plot visualization constructor
    // Arguments:
    //      options: {
    //          fixationColor       - fixation color
    //          showIDs             - if set, fixations and words are labelled by IDs. FIxations also have single color
    //          saccadeColor        - saccade color
    //          connectionColor     - connection color
    //          showConnections     - flat to display fixation-word connections
    //          showSaccades        - flag to display saccades
    //          showFixations       - flag to display fixations
    //          showOriginalFixLocation - flag to display original fixation location
    //          originalFixationColor - original fixation color, if displayed
    //          greyFixationColor   - the color of fixation used for inspection
    //          fixationNumberColor - the color of fixation number
    //          greyFixationSize    - size of grey fixations
    //          numberFont          - fixation number font
    //      }
    function GazePlot( options ) {

        this.fixationColor = options.fixationColor || '#000';
        this.saccadeColor = options.saccadeColor || '#08F';
        this.connectionColor = options.connectionColor || '#F00';
        this.showIDs = options.showIDs || false;

        this.showConnections = options.showConnections !== undefined ? options.showConnections : true;
        this.showSaccades = options.showSaccades !== undefined ? options.showSaccades : true;
        this.showFixations = options.showFixations !== undefined ? options.showFixations : true;
        this.showOriginalFixLocation = options.showOriginalFixLocation !== undefined ? options.showOriginalFixLocation : false;
        this.originalFixationColor = options.originalFixationColor || 'rgba(0,0,0,0.15)';
        this.greyFixationColor = options.greyFixationColor || 'rgba(0,0,0,0.5)';
        this.fixationNumberColor = options.fixationNumberColor || '#FF0';
        this.greyFixationSize = options.greyFixationSize || 15;
        this.numberFont = options.numberFont || 'bold 16px Verdana';

        const lineColorA = 0.5;
        this.lineColors = [
            `rgba(255,0,0,${lineColorA}`,
            `rgba(255,255,0,${lineColorA}`,
            `rgba(0,255,0,${lineColorA}`,
            `rgba(0,255,224,${lineColorA}`,
            `rgba(0,128,255,${lineColorA}`,
            `rgba(255,0,255,${lineColorA}`,
        ];

        app.Visualization.call( this, options );

        this._data = null;
    }

    app.loaded( () => { // we have to defer the prototype definition until the Visualization mudule is loaded

    GazePlot.prototype = Object.create( app.Visualization.prototype );
    GazePlot.prototype.base = app.Visualization.prototype;
    GazePlot.prototype.constructor = GazePlot;

    GazePlot.prototype._fillCategories = function( list, users ) {
        const userData = [];
        users.forEach( userSnapshot => {
            const user = userSnapshot.val();
            user.name = userSnapshot.key;
            userData.push( user );
        });

        const gradeUsers = this._classifyUsersByGrade( userData );

        for (let grade in gradeUsers) {
            this._addOption( list, grade, grade, gradeUsers[ grade ] );
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

            this._pageIndex = 0;
            this._enableNavigationButtons( this._pageIndex > 0, this._pageIndex < this._data.text.length - 1 );
            this._remapAndShow();

            this._setPrevPageCallback( () => { this._prevPage(); });
            this._setNextPageCallback( () => { this._nextPage(); });

            if (cbLoaded) {
                cbLoaded();
            }

        }).catch( reason => {
            window.alert( reason );
        });
    };

    GazePlot.prototype._remapAndShow = function() {
        const sessionPage = this._data.session[ this._pageIndex ];
        const hyphen = this._data.session.meta.interaction.syllabification.hyphen;

        app.WordList.instance.fill(
            sessionPage.records, {
                hyphen: hyphen
            }
        );

        const data = {
            fixations: sessionPage.fixations,
            words: this._data.text[ this._pageIndex ],
        };

        if (!data.fixations) {
            return;
        }

        let fixations;
        switch (this.mapping) {
            case app.Visualization.Mapping.STATIC: fixations = this._remapStatic( data ); break;
            //case app.Visualization.Mapping.DYNAMIC: fixations = this._remapDynamic( data ); break;
            default: console.error( 'unknown mapping type' ); return;
        }

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

        this._drawTitle( ctx, `${this._data.user} at ${this._data.sessionName}` );
    };

    GazePlot.prototype._drawFixations = function( ctx, fixations ) {
        ctx.fillStyle = this.fixationColor;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = this.numberFont;

        let prevFix, fix;
        let id = 0;
        for (let i = 0; i < fixations.length; i += 1) {
            fix = fixations[i];
            if (fix.x <= 0 && fix.y <= 0) {
                continue;
            }

            ctx.strokeStyle = this.saccadeColor;
            if (this.showSaccades && prevFix) {
                this._drawSaccade( ctx, prevFix, fix );
            }

            if (this.showConnections && fix.word) {
                ctx.strokeStyle = this.connectionColor;
                this._drawConnection( ctx, fix, {x: fix.word.left, y: fix.word.top} );
            }

            ctx.strokeStyle = '#808';
            this._drawFixation( ctx, fix, fix.id );

            prevFix = fix;
            id++;
        }
    };

    GazePlot.prototype._drawGreyFixation = function( ctx, fixation, id ) {
        ctx.fillStyle = this.greyFixationColor;
        ctx.beginPath();
        ctx.arc( fixation._x ? fixation._x : fixation.x, fixation.y, this.greyFixationSize, 0, 2*Math.PI);
        ctx.fill();

        ctx.fillStyle = this.fixationNumberColor;
        ctx.fillText( '' + id, fixation._x ? fixation._x : fixation.x, fixation.y );
    }

    GazePlot.prototype._drawFixation = function( ctx, fixation, id ) {
        let circleSize;

        if (this.showIDs) {
            this._drawGreyFixation( ctx, fixation, id );
            circleSize = this.greyFixationSize;
        }
        else {
            if (fixation.line !== undefined) {
                ctx.fillStyle = this.lineColors[ fixation.line % 6 ];
            }
            else {
                ctx.fillStyle = this.fixationColor;
            }

            circleSize = Math.round( Math.sqrt( fixation.duration ) ) / 2;

            ctx.beginPath();
            ctx.arc( fixation.x, fixation.y, circleSize, 0, 2*Math.PI);
            ctx.fill();

            if (fixation.merged) {
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc( fixation.x, fixation.y, circleSize + 3, 0, 2*Math.PI);
                ctx.stroke();
                ctx.lineWidth = 1;
            }
        }

        if (this.showOriginalFixLocation /*&& fixation._x*/) {
            ctx.fillStyle = this.originalFixationColor;
            ctx.beginPath();
            ctx.arc( fixation.x, fixation.y, circleSize, 0, 2*Math.PI);
            ctx.fill();
        }
    };

    GazePlot.prototype._drawSaccade = function( ctx, from, to ) {
        ctx.beginPath();
        ctx.moveTo( this.showIDs ? (from._x ? from._x : from.x) : from.x, from.y );
        ctx.lineTo( this.showIDs ? (to._x ? to._x : to.x) : to.x, to.y );
        ctx.stroke();
    };

    GazePlot.prototype._drawConnection = function( ctx, from, to ) {
        ctx.beginPath();
        ctx.moveTo( this.showIDs ? (from._x ? from._x : from.x) : from.x, from.y );
        ctx.lineTo( to.x, to.y );
        ctx.stroke();
    };

    /*
    GazePlot.prototype._remapDynamic = function( session ) {
        app.Logger.enabled = false;

        const fixations = app.Fixations;
        const model = app.Model2;

        fixations.init( 80, 50 );
        model.init({
            linePredictor: {
                factors: {
                    currentLineDefDist: 0.4,
                    currentLineMaxDist: 0.4,
                    newLineSaccadeLengthFraction: 0.1
                }
            }
        });

        const layout = session.words.map( function( word ) {
            return new Word({ left: word.x, top: word.y, right: word.x + word.width, bottom: word.y + word.height });
        });

        fixations.reset();
        model.reset( layout );

        const result = [];
        session.fixations.forEach( function( fix ) {
            const fixation = fixations.add( fix.x, fix.y, fix.duration );
            if (fixation) {
                model.feedFixation( fixation );
                result.push( fixation );
            }
        });

        return result;
    };*/

    GazePlot.prototype._remapStatic = function( session ) {
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

        return result.fixations;
    };

    GazePlot.prototype._prevPage = function() {
        if (this._data && this._pageIndex > 0) {
            this._pageIndex--;
            this._enableNavigationButtons( this._pageIndex > 0, this._pageIndex < this._data.text.length - 1 );
            this._remapAndShow();
        }
    };

    GazePlot.prototype._nextPage = function() {
        if (this._data && this._pageIndex < this._data.text.length - 1) {
            this._pageIndex++;
            this._enableNavigationButtons( this._pageIndex > 0, this._pageIndex < this._data.text.length - 1 );
            this._remapAndShow();
        }
    };

    }); // end of delayed call

    /*
    function Word( rect ) {
        this.left = rect.left;
        this.top = rect.top;
        this.right = rect.right;
        this.bottom = rect.bottom;
    }

    Word.prototype.getBoundingClientRect = function() {
        return this;
    };*/

    app.GazePlot = GazePlot;

})( this.ReadVis2 || module.exports );
