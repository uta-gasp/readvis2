// Requires:
//      model/zone

if (!this.Reading) {
    module.exports.Zone = require('./zone.js').Zone;
}

(function (app) { 'use strict';

    var Fixations = {

        init: function (options) {
            options = options || {};

            _minDuration = options.minDuration || 80;
            _threshold = options.threshold || 70;
            _sampleDuration = options.sampleDuration || 33;
            _lpc = options.filterDemph || 0.4;
            _invLpc = 1 - _lpc;
            
            _zone = app.Zone;

            _currentFixation = new Fixation( -10000, -10000, Number.MAX_VALUE );
            _currentFixation.saccade = new Saccade( 0, 0 );
        },

        feed: function (data1, data2) {

            var result;
            if (data2 !== undefined) {    // this is smaple
                result = parseSample( data1, data2 );
            }
            else {
                result = parseFixation( data1 );
            }
            return result;
        },

        add: function (x, y, duration) {
            if (duration < _minDuration) {
                return null;
            }

            var fixation = new Fixation( x, y, duration );
            fixation.previous = _currentFixation;
            _currentFixation.next = fixation;
            
            fixation.saccade = new Saccade( x - _currentFixation.x, y - _currentFixation.y );
            
            _currentFixation = fixation;
                
            return _currentFixation;
        },

        reset: function () {
            _fixations.length = 0;

            _currentFixation = new Fixation(-10000, -10000, Number.MAX_VALUE);
            _currentFixation.saccade = new Saccade(0, 0);

            _candidate = null;
        },

        current: function() {
            return _currentFixation;
        }
    };

    // internal
    var _minDuration;
    var _threshold;
    var _sampleDuration;

    var _fixations = [];
    var _currentFixation;
    var _candidate = null;

    var _lpc;
    var _invLpc;

    var _zone;

    function parseSample (x, y) {
        var dx = x - _currentFixation.x;
        var dy = y - _currentFixation.y;
        var result;

        if (Math.sqrt( dx * dx + dy * dy) > _threshold) {
            if (_candidate === null) {
                _candidate = new Fixation(x, y, _sampleDuration);
                _candidate.previous = _currentFixation;
                _candidate.saccade = new Saccade(x - _currentFixation.x, y - _currentFixation.y);
                _currentFixation.next = _candidate;
            }
            else {
                _candidate.x = _lpc * x + _invLpc * _candidate.x;
                _candidate.y = _lpc * y + _invLpc * _candidate.y;
                _candidate.duration += _sampleDuration;
                _currentFixation = _candidate;
                _candidate = null;
            }
        }
        else {
            _candidate = null;
            var prevDuration = _currentFixation.duration;
            _currentFixation.duration += _sampleDuration;
            _currentFixation.x = _lpc * _currentFixation.x + _invLpc * x;
            _currentFixation.y = _lpc * _currentFixation.y + _invLpc * y;
            
            if (prevDuration < _minDuration && _currentFixation.duration >= _minDuration) {
                result = _currentFixation;
            }
        }

        return result;
    }

    function parseFixation (progressingFixation) {

        if (progressingFixation.duration < _minDuration) {
            return null;
        }

        var result = null;
        if (_currentFixation.duration > progressingFixation.duration) {
            var fixation = new Fixation( progressingFixation.x, progressingFixation.y, progressingFixation.duration );
            fixation.previous = _currentFixation;
            _currentFixation.next = fixation;
            
            var saccade = progressingFixation.saccade;
            if (saccade) {
                fixation.saccade = new Saccade( saccade.dx, saccade.dy );
            }
            else {
                fixation.saccade = new Saccade( progressingFixation.x - _currentFixation.x, 
                                                progressingFixation.y - _currentFixation.y );
            }
            
            _currentFixation = fixation;
            _fixations.push( _currentFixation );
                
            result = _currentFixation;
        }
        else {
            _currentFixation.duration = progressingFixation.duration;
            _currentFixation.x = progressingFixation.x;
            _currentFixation.y = progressingFixation.y;
        }

        return result;
    }

    // Fixation
    function Fixation (x, y, duration) {
        this.x = x;
        this.y = y;
        this.duration = duration;
        this.saccade = null;
        this.word = null;
        this.previous = null;
        this.next = null;
    }

    Fixation.prototype.toString = function () {
        return 'FIX ' + this.x + ',' + this.y + ' / ' + this.duration +
            'ms S=[' + this.saccade + '], W=[' + this.word + ']';
    };

    // Saccade
    function Saccade (x, y) {
        this.x = x;
        this.y = y;
        this.zone = _zone.nonreading;
        this.newLine = false;
    }

    Saccade.prototype.toString = function () {
        return this.x + ',' + this.y + ' / ' + this.zone + ',' + this.newLine;
    };

    // Publication
    app.Fixations = Fixations;
    app.Fixation = Fixation;
    app.Saccade = Saccade;

})( this.Reading || module.exports );