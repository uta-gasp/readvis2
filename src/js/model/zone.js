// Requires:
//      utils/logger

if (!this.Reading) {
    module.exports.Logger = require('../utils/logger.js').Logger;
}

(function (app) { 'use strict';

    var Zone = {

        // types
        nonreading: 0,
        neutral: 1,
        reading: 2,

        init: function (settings, geomModel) {
            _lineHeight = geomModel.lineHeight;
            _progressiveLeft = Math.round(( settings.progressiveLeft || -1.5) * _lineHeight );
            _progressiveRight = Math.round( (settings.progressiveRight || 10) * _lineHeight );
            _regressiveLeft = -geomModel.lineWidth - 500;
            _regressiveRight = 0;
            _readingMarginY = Math.round( (settings.readingMarginY || 1.5) * _lineHeight );
            _neutralMarginY = Math.round( (settings.neutralMarginY || 3) * _lineHeight );
            _slope = settings.slope || 0.1;

            _logger = app.Logger.forModule( 'Zone' );
        },

        match: function (saccade) {
            _log = _logger.start();
            _log.push( 'saccade:', saccade.x, saccade.y );
            var zone = this.nonreading;

            if (isInsideBox( _readingMarginY, saccade)) {
                zone = this.reading;
            }
            else if (isInsideBox( _neutralMarginY, saccade )) {
                zone = this.neutral;
            }

            _log.push( 'result: ', zone );
            _logger.end( _log );

            return zone;
        },

        reset: function () {
        }
    };

    // internal
    var _lineHeight;
    var _progressiveLeft;
    var _progressiveRight;
    var _regressiveLeft;
    var _regressiveRight;
    var _readingMarginY;
    var _neutralMarginY;
    var _slope;

    var _logger;
    var _log;

    function isInsideProgressive (marginY, saccade) {
        var heightDelta = saccade.x * _slope;
        var margin = Math.round( marginY + heightDelta );
        _log.push( 'Progressive: [', _progressiveLeft, _progressiveRight, -margin, margin, ']' );
        return _progressiveLeft < saccade.x && saccade.x < _progressiveRight && 
               -margin < saccade.y && saccade.y < margin;
    }

    function isInsideRegressive (marginY, saccade) {
        var heightDelta = -saccade.x * _slope;
        var margin = Math.round( marginY + heightDelta );
        _log.push( 'Regressive: [', _regressiveLeft, _regressiveRight, -margin, margin, ']' );
        return _regressiveLeft < saccade.x && saccade.x < 0 && 
               -margin < saccade.y && saccade.y < margin;
    }

    function isInsideBox (marginY, saccade) {
        return isInsideProgressive( marginY, saccade ) || isInsideRegressive( marginY, saccade );
    }
    
    // Publication
    app.Zone = Zone;

})( this.Reading || module.exports );