// Requires:
//      libs/regression
//      utils/logger

if (!this.Reading) {
    var regression = require('../../../libs/regression.js');
    module.exports.Logger = require('../utils/logger.js').Logger;
}

(function (app) { 'use strict';
    
    // Line object
    function Line (word, wordID, dom, index, prevLine) {
        this.left = Number.MAX_VALUE;
        this.top = Number.MAX_VALUE;
        this.right = Number.MIN_VALUE;
        this.bottom = Number.MIN_VALUE;
        this.center = undefined;

        this.index = index || 0;
        this.previous = prevLine || null;
        this.next = null;
        if (this.previous) {
            this.previous.next = this;
        }
        
        this.fixations = [];
        this.fitEq = null;

        this.words = [];

        if (word) {
            this.add( word, wordID, dom );
        }
    }

    Line.init = function () {
        _logger = app.Logger.forModule( 'Line' );
    };

    Line.prototype.width = function () {
        return this.right - this.left;
    };

    Line.prototype.add = function (word, wordID, dom) {
        this.left = Math.min( this.left, word.left );
        this.right = Math.max( this.right, word.right );
        this.top = Math.min( this.top, word.top );
        this.bottom = Math.max( this.bottom, word.bottom );

        this.center = {
            x: (this.left + this.right) / 2,
            y: (this.top + this.bottom) / 2
        };

        this.words.push( new Word( word, wordID, dom, this ) );
    };

    Line.prototype.addFixation = function (fixation) {

        this.fixations.push( [fixation.x, fixation.y, fixation.saccade] );
        _log = _logger.start();

        if (this.fixations.length > 1) {
            this._removeOldFixation();
            var type = this.fixations.length < _modelTypeSwitchThreshold ? 'linear' : 'polynomial';
            var model = regression.model( type, this.fixations, 2 );
            this.fitEq = model.equation;
            _log.push( 'model for line', this.index, ':', this.fitEq );

            if (type === 'linear') {    // put restriction on the gradient
                if (this.fitEq[1] < -_modelMaxGradient) {
                    this.fitEq = fixLinearModel( this.fixations, -_modelMaxGradient );
                    _log.push( 'model reset to', this.fitEq );
                }
                else if (this.fitEq[1] > _modelMaxGradient) {
                    this.fitEq = fixLinearModel( this.fixations, _modelMaxGradient );
                    _log.push( 'model reset to', this.fitEq );
                }
            }
        }
        
        _logger.end( _log );
    };

    // returns difference between model x and the actual x
    Line.prototype.fit = function (x, y) {
        if (this.fitEq) {
            var result = y - regression.fit( this.fitEq, x );
            //_logger.log( 'fitting', x, 'to line', this.index, ': error is ', result );
            var log = _logger.start();
            log.push( 'e[', this.index, '|', x, y, '] =', Math.floor( result ) );
            _logger.end( log );

            return result;
        }
        return Number.MAX_VALUE;
    };

    Line.prototype._removeOldFixation = function () {
        var lastIndex = this.fixations.length - 1;
        if (lastIndex < 5) {
            return;
        }

        var index = lastIndex;
        var fix;
        while (index > 0) {
            fix = this.fixations[ index ];
            if (index > 0 && fix[2].newLine) {       // the current line started here
                if (lastIndex - index + 1 > _modelRemoveOldFixThreshold) {     // lets have at least N fixations
                    this.fixations = this.fixations.slice( index );
                    _log.push( 'line fixations: reduced' );
                }
                break;
            }
            index -= 1;
        }
    };

    // internal
    var _modelMaxGradient = 0.15;
    var _modelTypeSwitchThreshold = 8;
    var _modelRemoveOldFixThreshold = 10;

    var _logger;
    var _log;

    function fixLinearModel (fixations, gradient) {
        var sum = 0;
        for (var i = 0; i < fixations.length; ++i) {
            var fix = fixations[i];
            sum += fix[1] - gradient * fix[0];
        }
        return [sum / fixations.length, gradient];
    }

    // Word object
    function Word (rect, id, dom, line) {
        this.rect = rect;
        this.id = id;
        this.dom = dom;
        this.line = line;
        this.index = line.words.length;
    }

    Word.prototype.toString = function () {
        return this.rect.left + ',' + this.rect.top + ' / ' + this.line.index;
    };

    // Publication
    app.Line = Line;
    app.Word = Word;

})( this.Reading || module.exports );