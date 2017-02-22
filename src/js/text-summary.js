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

        this.options = {
            id: 'text-summary',
            title: 'Text summary',
            update: this.update.bind( this ),
            options: app.Visualization.createOptions({
                fixationColor: { type: '#', label: 'Fixation color' },
                showFixations: { type: Boolean, label: 'Show fixations' },
                showRegressions: { type: Boolean, label: 'Highlight regressions' },
            }, this )
        };

        this._data = null;
    }

    app.loaded( () => { // we have to defer the prototype definition until the Visualization mudule is loaded

    TextSummary.prototype = Object.create( app.Visualization.prototype );
    TextSummary.prototype.base = app.Visualization.prototype;
    TextSummary.prototype.constructor = TextSummary;

    TextSummary.prototype.update = function() {
        if (this._pageIndex >= 0) {
            this._mapAndShow();
        }
    };

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

            this._data.sessions.forEach( session => {
                this._recreateWordIDsInEvents( session, this._data.text );
            });

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

    TextSummary.prototype._mapAndShow = function() {
        app.WordList.instance.clear();

        const ctx = this._getCanvas2D();
        const meta = this._data.sessions[0].meta;
        const words = this._data.text[ this._pageIndex ];
        const metricRange = app.Metric.compute( words, this.colorMetric );

        this._setCanvasFont( ctx, meta.font );
        this._drawWords( ctx, words, {
            metricRange: metricRange,
            showIDs: false,
            hideBoundingBox: true,
            hyphen: meta.interaction.syllabification.hyphen
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

            const fixations = this._map( data ).fixations;

            if (this.showFixations && fixations) {
                this._drawFixations( ctx, fixations );
            }
        });

        this._drawTitle( ctx, `"${this._data.text.title}" for ${this._data.sessions.length} sessions` );
    };

    // Overriden from Visualization._drawWord
    TextSummary.prototype._drawWord = function( ctx, word, settings ) {
        this.base._drawWord.call( this, ctx, word, settings );

        if (this.showRegressions && word.regressionCount) {
            ctx.lineWidth = word.regressionCount + 1;
            ctx.strokeRect( word.x, word.y, word.width, word.height);
            ctx.lineWidth = 1;
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

    TextSummary.prototype._prevPage = function() {
        if (this._data && this._pageIndex > 0) {
            this._setPageIndex( this._pageIndex - 1 );
            this._mapAndShow();
        }
    };

    TextSummary.prototype._nextPage = function() {
        if (this._data && this._pageIndex < this._data.text.length - 1) {
            this._setPageIndex( this._pageIndex + 1 );
            this._mapAndShow();
        }
    };

    });

    app.TextSummary = TextSummary;

})( window.ReadVis2 );
