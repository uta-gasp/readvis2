// Requires:
//      shortcut
//      GazeTargets
//      utils/logger

(function (app) { 'use strict';

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
    //      }
    function Controls (options, services) {
        this.root = document.querySelector( options.root );

        _services = services;

        const logError = app.Logger.moduleErrorPrinter( 'Controls' );
        _services.displaySession = _services.displaySession || logError( 'displaySession' );
        _services.displayTextSummary = _services.displayTextSummary || logError( 'displayTextSummary' );
        _services.wordReplay = _services.wordReplay || logError( 'wordReplay' );
        _services.gazeReplay = _services.gazeReplay || logError( 'gazeReplay' );

        const gazePlot = this.root.querySelector( '.gaze-plot' );
        gazePlot.addEventListener('click', function () {
            _services.displaySession();
        });

        const textSummary = this.root.querySelector( '.text-summary' );
        textSummary.addEventListener('click', function () {
            _services.displayTextSummary( true );
        });

        const gazeReplay = this.root.querySelector( '.gaze-replay' );
        gazeReplay.addEventListener('click', function () {
            _services.gazeReplay( true );
        });

        const wordReplay = this.root.querySelector( '.word-replay' );
        wordReplay.addEventListener('click', function () {
            _services.wordReplay( true );
        });
    }

    // private

    let _services;

    app.Controls = Controls;

})( this.ReadVis2 || module.exports );
