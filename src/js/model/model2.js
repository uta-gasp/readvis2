// Reading model 2

if (!this.Reading) {
    module.exports.Logger = require('../utils/logger.js').Logger;
    module.exports.Line = require('./line.js').Line;
    module.exports.Geometry = require('./geometry.js').Geometry;
    module.exports.Fixations = require('./fixations.js').Fixations;
    module.exports.Zone = require('./zone.js').Zone;
}

(function (app) { 'use strict';

    var Model2 = {

        // Initializes the model
        // Arguments:
        //      settings
        init: function (settings) {
            settings = settings || {};

            _settings = {
            };

            app.Line.init();

            _geometry = app.Geometry;
            _geometry.init( true );

            _fixationDetector = app.Fixations;
            _fixationDetector.init();

            _logger = app.Logger.forModule( 'Model2' );
        },

        feedFixation: function (fixation) {
            if (!fixation) {
                return;
            }

            _lastFixation = fixation;

            _log = _logger.start( '--- fix ---' );
            _log.push( fixation.toString() );

            _currentLine = lineFromSaccade( fixation.saccade.y ); // line, null, or false

            if (!_currentLine) {
                _currentLine = lineFromAbsolutePosition( fixation );
            }
            else {  // check how far the fixation from the currentlt mapped line
                _currentLine = ensureFixationIsClose( fixation );
            }

            _lastMapped = mapToWord( fixation );

            _logger.end( _log );

            return _lastMapped ? _lastMapped.dom : null;
        },

        feed: function (targets, x, y) {
            var result = null;

            _geomModel = _geometry.create( targets );

            var newFixation = _fixationDetector.feed( x, y );
            if (newFixation) {
                result = this.feedFixation( newFixation );
            }
            else {
                _lastFixation = null;
            }

            return result;
        },

        reset: function (targets) {
            _geometry.reset();
            _fixationDetector.reset();

            _currentLine = null;
            _lastMapped = null;
            _lastFixation = null;
            _geomModel = null;

            if (targets) {
                _geomModel = _geometry.create( targets );
            }
        },

        callbacks: function (callbacks) {
            if (!callbacks) {
                return _callbacks;
            }
            else {
                _callbacks.onMapped = callbacks.onMapped;
            }
        },

        currentWord: function () {
            return _lastMapped;
        },

        mappedFix: function () {
            return lastFixation;
        }
    };

    // internal
    var _settings;

    var _geometry;
    var _fixationDetector;
    var _logger;
    var _log;

    var _geomModel;
    var _currentLine;
    var _lastMapped;
    var _lastFixation;

    var _callbacks = {
        onMapped: null
    };

    function lineFromSaccade (dy) {
        var saccadeThreshold = _geomModel.lineHeight * 1.2;
        var nextLineSaccadeThreshold = _geomModel.lineSpacing * 1.75;
        
        var lineChange = Number.NaN;

        if (Math.abs( dy ) < saccadeThreshold) {
            lineChange = 0;
        }
        else if (dy > 0 && dy < nextLineSaccadeThreshold)  {
            lineChange = 1;
        }
        else if (dy < 0) {
            lineChange = Math.round( dy / _geomModel.lineSpacing);
        }

        _log.push( Number.isNaN( lineChange ) ? 'chaotic jump' : 'line changed by ' + lineChange);

        var result = null;
        if (_currentLine && !Number.isNaN( lineChange )) {
            var newLineIndex = _currentLine.index + lineChange;
            if (newLineIndex >= 0 && newLineIndex < _geomModel.lines.length) {
                result = _geomModel.lines[ newLineIndex ];
                _log.push( 'line #', result.index );
            }
            else {
                _log.push( 'jump outside the line' );
            }
        } 
        else {
            result = false;
            _log.push( 'cannot estimate line from saccade' );
        }


        return result;
    }

    function lineFromAbsolutePosition (fixation) {
        var verticalThreshold = _geomModel.lineSpacing * 0.5;
        var horizontalThreshold = 200;
        var result = _geomModel.lines.find( (line) => {
            let dy = Math.abs( fixation.y - line.center.y );
            let dx = fixation.x < line.left ? line.left - fixation.x : 
                    (fixation.x > line.right ? fixation.x - line.right : 0);
            return dx < horizontalThreshold && dy < verticalThreshold;
        });

        if (result) {
            _log.push( 'line #', result.index );
        }
        else {
            _log.push( 'the fixation is not on any line' );
        }

        return result;
    }

    function ensureFixationIsClose (fixation) {
        var fixOffsetY = fixation.y - _currentLine.center.y;
        _log.push( 'checking the Y offset', fixOffsetY );

        var doesNotFollow = _geomModel.lines.find( line => {
            if (!line.fixations.length) {
                return false;
            }

            var y = line.center.y;
            _log.push( '    ly =', y );
            var avgOffsetY = line.fixations.reduce( (sum, fix) => {
                _log.push( '    :', (fix[1] - y) );
                return sum + (fix[1] - y);
            }, 0) / line.fixations.length;

            _log.push( '    d = ', avgOffsetY );

            if (avgOffsetY === undefined) {
                return false;
            }
            
            return fixOffsetY < avgOffsetY - _geomModel.lineHeight || 
                   fixOffsetY > avgOffsetY + _geomModel.lineHeight
        });

        if (doesNotFollow) {
            _log.push( 'the line is too far, mapping naively' );
            return lineFromAbsolutePosition( fixation );
        }

        return _currentLine;
    }

    function mapToWord (fixation) {
        if (!_currentLine) {
            return null;
        }

        _currentLine.addFixation( fixation );
        fixation.line = _currentLine.index;

        var x = fixation.x;
        var result = null;
        var minDist = Number.MAX_VALUE;

        var words = _currentLine.words;
        for (var i = 0; i < words.length; ++i) {
            var word = words[i];
            var rect = word.rect;
                
            var dist = x < rect.left ? (rect.left - x) : (x > rect.right ? x - rect.right : 0);
            if (dist < minDist) {
                result = word;
                minDist = dist;
                if (dist === 0) {
                    break;
                }
            }
        }

        fixation.word = result;

        if (result && _callbacks.onMapped) {
            _callbacks.onMapped( fixation );
        }
        
        _log.push( '[d=', Math.floor( minDist ), ']', result ? result.line.index + ',' + result.index : '' );

        return result;
    }

    // Publication
    app.Model2 = Model2;

})( this.Reading || module.exports );