// Requires:
//      utils/logger

if (!this.Reading) {
    var logger = require('../utils/logger.js').Logger;
    module.exports.Line = require('./line.js').Line;
}

(function (app) { 'use strict';

    var LinePredictor = {

        init: function (geomModel, settings) {
            _geomModel = geomModel;

            settings = settings || {};

            _currentLineDistReduce = settings.currentLineDistReduce || 0.8;

            _threshold = (settings.threshold || 0.45) * _geomModel.lineSpacing;
            _thresholdForCurrentLine = (settings.thresholdForCurrentLine || 0.55) * _geomModel.lineSpacing;
            _thresholdForSaccade = (settings.thresholdForSaccade || 0.3) * _geomModel.lineSpacing;
            _newLineSaccadeLengthFraction = settings.newLineSaccadeLength || -0.7;

            _logger = (logger || app.Logger).forModule( 'LinePredictor' );
            
            _log = _logger.start();
            _log.push( 'currentLineDistReduce: ', _currentLineDistReduce );
            _log.push( 'currentLineDefDist: ', _threshold );
            _log.push( 'currentLineMaxDist: ', _thresholdForCurrentLine );
            _log.push( 'newLineSaccadeLengthFraction: ', _newLineSaccadeLengthFraction );
            _log.push( 'geomModel.lineSpacing: ', _geomModel.lineSpacing );
            _logger.end( _log );
        },

        get: function (isEnteredReadingMode, currentFixation, currentLine, offset) {
            var result = null;
            
            _log = _logger.start();

            if (currentFixation.previous && currentFixation.previous.saccade.newLine && !currentLine.fitEq) {
                result = checkAgainstCurrentLine( currentFixation, offset );
            }
            else if (isEnteredReadingMode || currentFixation) {
                result = guessCurrentLine( currentFixation, currentLine, offset );
            }

            if (!result) {
                result = getClosestLine( currentFixation, offset );
            }

            if (result && (!currentLine || result.index !== currentLine.index)) {
                currentFixation.saccade.newLine = true;
            }

            _logger.end( _log );
            return result;
        },

        reset: function() {
            _geomModel = null;
        }
    };

    // internal
    var _geomModel;
    var _logger;
    var _log;

    var _currentLineDistReduce;
    var _guessMaxDist;
    var _thresholdForCurrentLine;
    var _thresholdForSaccade;
    var _threshold;
    var _newLineSaccadeLengthFraction;

    function guessCurrentLine(fixation, currentLine, offset) {
        var result = null;
        var perfectLineMatch = false;
        var minDiff = Number.MAX_VALUE;
        var minDiffAbs = Number.MAX_VALUE;
        var currentLineIndex = currentLine ? currentLine.index : -1;
        var x = fixation.x;
        var y = fixation.y;

        var lines = _geomModel.lines;
        for (var i = 0; i < lines.length; ++i) {
            var line = lines[i];
            var diff = line.fit( x, y );
            var diffAbs = Math.abs( diff );
            if (currentLineIndex === line.index) {      // current line has priority:
                if (diffAbs < _threshold) {     // it must be followed in case the fixation is close
                    result = line;
                    minDiff = diff;
                    minDiffAbs = diffAbs;
                    perfectLineMatch = true;
                    _log.push( 'following the current line #', currentLineIndex );
                    break;
                }
                else if (diff != Number.MAX_VALUE) {                                  // if the distance exceeds the threshold, then 
                    diff *= _currentLineDistReduce;      // lets artificially reduce the distance
                    diffAbs = Math.abs( diff );
                    _log.push( '>>', Math.floor( diff ) );
                }
            }
            if (diffAbs < minDiffAbs) {
                result = line;
                minDiffAbs = diffAbs;
                minDiff = diff;
            }
        }

        if (!perfectLineMatch) {    // only for printing the minDiff out
            _log.push( 'dist =', minDiff != Number.MAX_VALUE ? Math.floor( minDiff ) : 'N/A' );
        }

        // threshold must depend on the saccade type: long regressive is most likely belong to a new line, 
        // thus compare the diff against reduced threshold from the lower bound

        var newLineSaccadeLength = currentLine ? currentLine.width() * _newLineSaccadeLengthFraction : 100000;
        var threshold = fixation.saccade.x < newLineSaccadeLength ? _thresholdForSaccade : _threshold;
        _log.push( 'threshold:', threshold );
        
        if (minDiffAbs < threshold ) {
            if (!perfectLineMatch) {
                _log.push( 'most likely:', result ? result.index : '---' );
            }
        }
        else if (currentLine) {     // maybe, this is a quick jump to some other line?
            result = checkLineJump( result, minDiff, currentLine, fixation, threshold );
        }
        else {
            result = null;
        }

        return result;
    }

    function checkLineJump (result, diff, currentLine, fixation, threshold) {

        _log.levelUp();
        _log.push( 'checking possible jump...' );

        var currentLineIndex = currentLine ? currentLine.index : -1;
        var lineIndex = -1;

        if (diff != Number.MAX_VALUE) { 
            lineIndex = currentLineIndex + Math.round( diff / _geomModel.lineSpacing );
            _log.push( 'supposed line:', lineIndex );
        }

        var lines = _geomModel.lines;
        if (0 <= lineIndex && lineIndex < lines.length) {

            var acceptSupposedLine = true;

            // check which one fits better
            var supposedLine = lines[ lineIndex ];
            if (supposedLine.fitEq) {   // this line was visited already, lets check which line, the supposed or the current is closer
                var supposedLineDiff = Math.abs( supposedLine.fit( fixation.x, fixation.y ) );
                _log.push( ' >> dist =', Math.floor( supposedLineDiff ) );
                if (supposedLineDiff >= Math.abs( diff ) ) {
                    acceptSupposedLine = false;
                    _log.push( ' >> keep the line #', result.index );
                }
            }
            else if (supposedLine.index === currentLineIndex + 1) { // maybe, we should stay on the current line?
                // the supposed line is next line
                _log.push( 'looks like a new line... check it!' );

                // first, lets check the average fitting of the fixation to the current line, 
                // but taking into account only lines visited already
                var avgOffset = 0;
                var count = 0;
                for (var li = 0; li < lines.length; ++li) {
                    var line = lines[ li ];
                    if (li === currentLineIndex || !line.fitEq) {
                        continue;
                    }

                    avgOffset += line.fit( fixation.x, fixation.y ) - (currentLineIndex - li) * _geomModel.lineSpacing;
                    count++;
                }

                if (count) {
                    avgOffset /= count;
                    _log.push( 'the average fitting offset is ', avgOffset );
                    if (avgOffset < threshold) {
                        acceptSupposedLine = false;
                        result = currentLine;
                        _log.push( '- stay on line #', result.index );
                    }
                    else {
                        // accept the supposed line
                    }
                }
                else {
                    // only one line was discovered so far - the current line
                    // so, just accept the supposed line
                    _log.push( 'nothing to compare with...' );
                }
            }
            else {
                _log.push( 'just accept it' );
                // what can we do here?
                // just accepting the supposed line
            }

            if (acceptSupposedLine) {
                result = supposedLine;
                _log.push( 'jump to supposed line #', result.index );
            }
        }
        else {
            result = null;
            _log.push( '...invalid' );
        }

        _log.levelDown();
        return result;
    }

    function checkAgainstCurrentLine( currentFixation, offset ) {
        var minDist = Number.MAX_VALUE;
        var dist;
        var currentLine = null;
        var previousLine = null;
        var closestFixation = null;

        var fixation = currentFixation.previous;
        while (fixation) {
            if (fixation.word) {
                var line = fixation.word.line;
                if (!currentLine) {
                    currentLine = line;
                }
                if (line.index != currentLine.index) {
                    if (currentLine.index - line.index === 1) {
                        previousLine = line;
                    }
                    break;
                }
                dist = Math.abs( currentFixation.y + offset - currentLine.center.y );
                if (dist < minDist) {
                    minDist = dist;
                    closestFixation = fixation;
                }
            }

            fixation = fixation.previous;
        }

        var result = closestFixation && (minDist < _thresholdForCurrentLine) ? currentLine : null;

        _log.push( 'dist :', minDist );
        _log.push( 'is following the current line:', result ? 'yes' : 'no' );

        // If recognized as not following but still not too far and recently jumped from the previous line,
        // then check whether it fits this previous line
        if (!result && previousLine && minDist < _geomModel.lineSpacing) {
            var diff = Math.abs( previousLine.fit( currentFixation.x, currentFixation.y ) );
            if (diff < _thresholdForCurrentLine) {
                result = previousLine;
                _log.push( 'back to the prev line' );
            }
            else {
                result = currentLine;
                _log.push( 'still better fit than to the previous line' );
            }
        }

        return result;
    }

    function getClosestLine( fixation, offset ) {
        var result = null;
        var minDist = Number.MAX_VALUE;
        var line, dist;

        _log.push( 'searching the closest line given the offset',  offset );
        _log.levelUp();
        var lines = _geomModel.lines;
        for (var i = 0; i < lines.length; ++i) {
            line = lines[i];
            dist = Math.abs( fixation.y + offset - line.center.y );
            _log.push( '#' + i + '=' + dist );
            if (dist < minDist) {
                minDist = dist;
                result = line;
            }
        }

        _log.levelDown();
        _log.push( 'closest:',  result.index );
        return result;        
    }

    // Publication
    app.LinePredictor = LinePredictor;

})( this.Reading || module.exports );
