// Requires:
//      app.WordList
//      app.Metric
//      app.Visualization

(function( app ) { 'use strict';

    // Text gazing display routine
    // Constructor arguments:
    //      options: {
    //          fixationColor       - fixation color
    //          showFixations       - fixation display flag
    //          showRegressions     - regression display flag
    //      }
    function TextSummary( options ) {

        this.fixationColor = options.fixationColor || '#000';

        this.showFixations = options.showFixations !== undefined ? options.showFixations : true;
        this.showRegressions = options.showRegressions !== undefined ? options.showRegressions : false;

        app.Visualization.call( this, options );

        this._data = null;
    }

    app.loaded( () => { // we have to defer the prototype definition until the Visualization mudule is loaded

    TextSummary.prototype = Object.create( app.Visualization.prototype );
    TextSummary.prototype.base = app.Visualization.prototype;
    TextSummary.prototype.constructor = TextSummary;

    TextSummary.prototype._fillCategories = function( list, users ) {
        const texts = this._getTexts( users );
        texts.forEach( (text, id) => {
            const option = this._addOption( list, id, text.title, text.sessions );
            if (this._data && this._data.textID === id) {
                option.selected = true;
            }
        });
    };

    TextSummary.prototype._load = function( cbLoaded, textID, sessions, textTitle ) {

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

            app.WordList.instance.show();

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

    TextSummary.prototype._remapAndShow = function() {
        app.WordList.instance.clear();

        const ctx = this._getCanvas2D();
        const words = this._data.text[ this._pageIndex ];
        const metricRange = app.Metric.compute( words, this.colorMetric );

        this._setCanvasFont( ctx, this._data.sessions[0].meta.font );
        this._drawWords( ctx, words, {
            metricRange: metricRange,
            showIDs: false,
            hideBoundingBox: true
        });

        this._data.sessions.forEach( session => {
            const sessionPage = session[ this._pageIndex ];

            app.WordList.instance.fill(
                sessionPage.records, {
                    preserve: true,
                    hyphen: session.meta.interaction.syllabification.hyphen
                }
            );

            const data = {
                fixations: sessionPage.fixations,
                words: words
            };

            let fixations;
            switch (this.mapping) {
                case app.Visualization.Mapping.STATIC: fixations = this._remapStatic( data ); break;
                //case app.Visualization.Mapping.DYNAMIC: fixations = this._remapDynamic( data ); break;
                default: console.error( 'unknown mapping type' ); return;
            }

            if (this.showFixations && fixations) {
                this._drawFixations( ctx, fixations );
            }
        });

        this._drawTitle( ctx, `"${this._data.text.title}" for ${this._data.sessions.length} sessions` );
    };

    TextSummary.prototype._remapStatic = function( session, words ) {
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

    // Overriden from Visualization._drawWord
    TextSummary.prototype._drawWord = function( ctx, word, settings ) {
        this.base._drawWord.call( this, ctx, word, settings );

        if (!settings.indexes) {
            if (this.showRegressions && word.regressionCount) {
                ctx.lineWidth = word.regressionCount + 1;
                ctx.strokeRect( word.x, word.y, word.width, word.height);
                ctx.lineWidth = 1;
            }
        }
    };

    TextSummary.prototype._drawFixations = function( ctx, fixations ) {
        ctx.fillStyle = this.fixationColor;

        fixations.forEach( fixation => {
            if (fixation.x <= 0 && fixation.y <= 0) {
                return;
            }

            ctx.beginPath();
            ctx.arc( fixation.x, fixation.y, 2, 0, 2*Math.PI );
            ctx.fill();
        });
    };

    TextSummary.prototype._prevPage = function () {
        if (this._data && this._pageIndex > 0) {
            this._pageIndex--;
            this._enableNavigationButtons( this._pageIndex > 0, this._pageIndex < this._data.text.length - 1 );
            this._remapAndShow();
        }
    };

    TextSummary.prototype._nextPage = function() {
        if (this._data && this._pageIndex < this._data.text.length - 1) {
            this._pageIndex++;
            this._enableNavigationButtons( this._pageIndex > 0, this._pageIndex < this._data.text.length - 1 );
            this._remapAndShow();
        }
    };

    });

    app.TextSummary = TextSummary;

})( this.ReadVis2 || module.exports );
