// Requires:
//      utils/logger

if (!this.Reading) {
    module.exports.Logger = require('../utils/logger.js').Logger;
    module.exports.Line = require('./line.js').Line;
}

(function (app) { 'use strict';

    var Geometry = {

        init: function (options) {
            options = options || {};

            _isTextFixed = options.isTextFixed || true;

            _logger = app.Logger.forModule( 'Geometry' );
        },

        create: function (targets) {
            if (_isTextFixed && _lines.length > 0) {
                return null;
            }

            this.reset();
        
            compute( targets );

            return this.model();
        },

        reset: function () {
            // _lines.forEach(function (line) {
            //     line.forEach(function (w) {
            //         _logger.log('new Word({ left: ' + w.rect.left + 
            //             ', top: ' + w.rect.top + 
            //             ', right: ' + w.rect.right + 
            //             ', bottom: ' + w.rect.bottom + ' }),');
            //     });
            // });
            _lines = [];
            _lineSpacing = 0;
            _lineHeight = 0;
            _lineWidth = 0;
        },

        model: function () {
            return {
                lines: _lines,
                lineSpacing: _lineSpacing,
                lineHeight: _lineHeight,
                lineWidth: _lineWidth
            };
        }
    };

    var _isTextFixed;

    var _lines = [];
    var _lineSpacing;
    var _lineHeight;
    var _lineWidth;

    var _logger;

    function compute (targets) {

        var lineY = 0;
        var currentLine = null;

        for (var i = 0; i < targets.length; i += 1) {
            var target = targets[i];
            var rect = target.getBoundingClientRect();
            if (lineY < rect.top || !currentLine) {
                if (currentLine) {
                    _lineSpacing += rect.top - currentLine.top;
                    _lineHeight += currentLine.bottom - currentLine.top;
                    if (_lineWidth < currentLine.right - currentLine.left) {
                        _lineWidth = currentLine.right - currentLine.left;
                    }
                }
                currentLine = new app.Line( rect, i, target, _lines.length, _lines[ _lines.length - 1 ] );
                _lines.push( currentLine );
                lineY = rect.top;
            }
            else {
                currentLine.add( rect, i, target );
            }
//                _logger.log('{ left: ' + Math.round(rect.left) + ', top: ' + Math.round(rect.top) + ', right: ' + Math.round(rect.right) + ', bottom: ' + Math.round(rect.bottom) + ' }');
        }

        if (currentLine) {
            _lineHeight += currentLine.bottom - currentLine.top;
            _lineHeight /= _lines.length;
            if (_lineWidth < currentLine.right - currentLine.left) {
                _lineWidth = currentLine.right - currentLine.left;
            }
        }

        if (_lines.length > 1) {
            _lineSpacing /= _lines.length - 1;
        }
        else if (_lines.length > 0) {
            var line = _lines[0];
            _lineSpacing = 2 * (line.bottom - line.top);
        }
        
        var log = _logger.start( _lines.length + ' lines' );
        _logger.end( log );
    }

    // Publication
    app.Geometry = Geometry;

})( this.Reading || module.exports );