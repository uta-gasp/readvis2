// Requires:
//      shortcut
//      GazeTargets
//      utils/logger

(function( app ) { 'use strict';

    // Initializes and sets callbacks for the app controls
    // Constructor arguments:
    //      options: {
    //          root:               - controls container element ID
    //      }
    //      services: {
    //          displaySession ()
    //          displayTextSummary ()
    //          gazeReplay ()
    //          wordReplay ()
    //          studentSummary ()
    //      }
    function Controls( options, services ) {
        this.root = document.querySelector( options.root );

        const logError = app.Logger.moduleErrorPrinter( 'Controls' );

        _services = services || {};
        _services.displaySession = _services.displaySession || logError( 'displaySession' );
        _services.displayTextSummary = _services.displayTextSummary || logError( 'displayTextSummary' );
        _services.wordReplay = _services.wordReplay || logError( 'wordReplay' );
        _services.gazeReplay = _services.gazeReplay || logError( 'gazeReplay' );
        _services.studentSummary = _services.studentSummary || logError( 'studentSummary' );

        const gazePlot = this.root.querySelector( '.gaze-plot' );
        gazePlot.addEventListener('click', e => {
            _services.displaySession();
        });

        const textSummary = this.root.querySelector( '.text-summary' );
        textSummary.addEventListener('click', e => {
            _services.displayTextSummary( true );
        });

        const gazeReplay = this.root.querySelector( '.gaze-replay' );
        gazeReplay.addEventListener('click', e => {
            _services.gazeReplay( true );
        });

        const wordReplay = this.root.querySelector( '.word-replay' );
        wordReplay.addEventListener('click', e => {
            _services.wordReplay( true );
        });

        const studentSummary = this.root.querySelector( '.student-summary' );
        studentSummary.addEventListener('click', e => {
            _services.studentSummary( true );
        });
    }

    // private

    let _services;

    app.Controls = Controls;

})( this.ReadVis2 || module.exports );
