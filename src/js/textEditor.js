// Requires:
//      utils/logger

(function (app) { 'use strict';

    // Controller for the text editing side-slider
    // Constructor arguments:
    //      options: {
    //          root:         - slideout element ID
    //          text:         - ID of the element that stores the text to edit
    //      }
    //      services: {
    //          splitText ()        - service to split the updated text
    //      }
    function TextEditor(options, services) {

        this.root = options.root || '#textEditor';
        this.text = options.text || '#text';

        var logError = app.Logger.moduleErrorPrinter( 'TextEditor' );
        _services.splitText = services.splitText || logError( 'splitText' );
        _services.getText = services.getText || logError( 'getText' );
        _services.setText = services.setText || logError( 'setText' );

        this._slideout = document.querySelector( this.root );

        var text = document.querySelector( this.text );

        this._editorText = document.querySelector( this.root + ' .text' );
        this._editorText.value = text.textContent;

        var save = document.querySelector( this.root + ' .save' );
        save.addEventListener( 'click', (e) => {
            _services.setText( this._editorText.value );
            this._slideout.classList.add( 'hidden' );
        });

        var cancel = document.querySelector( this.root + ' .cancel' );
        cancel.addEventListener( 'click', (e) => {
            this._slideout.classList.add( 'hidden' );
        });
    }

    TextEditor.prototype.show = function () {
        this._editorText.value = _services.getText();
        this._slideout.classList.remove( 'hidden' );
    };

    var _services = {};

    app.TextEditor = TextEditor;

})( this.Reading || module.exports );
