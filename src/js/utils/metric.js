(function (app) { 'use strict';

    var Metric = { };

    Metric.compute = function (words, metricType) {

        var maxRange = 0;

        words.forEach( word => {
            if (word.fixations) {
                var params = word.fixations.reduce( (sum, fix) => {
                    sum.duration += fix.duration;
                    sum.regressionCount += fix.isRegression ? 1 : 0;
                    return sum; 
                }, {
                    duration: 0, 
                    regressionCount: 0
                } );
                
                word.duration = params.duration;
                word.regressionCount = params.regressionCount;
                word.charSpeed = 1000 * word.text.length / word.duration;
                word.syllableSpeed = 1000 * app.WordSplit.syllables( word.text ).length / word.duration;

                var metricValue = 0;
                switch (metricType) {
                case Metric.Type.DURATION:
                    metricValue = word.duration;
                    break;
                case Metric.Type.CHAR_SPEED:
                    metricValue = word.charSpeed;
                    break;
                case Metric.Type.SYLL_SPEED:
                    metricValue = word.syllableSpeed;
                    break;
                }
                
                if (maxRange < metricValue) {
                    maxRange = metricValue;
                }
            }
        });

        return maxRange;
    };

    Metric.getAlpha = function (word, metricType, metricRange) {
        return alphaComputers[ metricType ]( word, metricRange );
    };

    function mapDurationToAlpha (word, maxDuration) {
        var result = 0;
        if (word.duration > DURATION_TRANSPARENT) {
            result = (word.duration - DURATION_TRANSPARENT) / (maxDuration - DURATION_TRANSPARENT);
        }
        return result;
    }

    function mapCharSpeedTAlpha (word, maxCharSpeed) {
        var result = 0;
        if (word.charSpeed > 0) {
            result = 1 - word.charSpeed / maxCharSpeed;
        }
        return result;
    }

    function mapSyllableSpeedToAlpha (word, maxSyllableSpeed) {
        var result = 0;
        if (word.syllableSpeed > 0) {
            result = 1 - word.syllableSpeed / maxSyllableSpeed;
        }
        return result;
    }

    const alphaComputers = [
        function () { return 0; },      // for NONE
        mapDurationToAlpha,
        mapCharSpeedTAlpha,
        mapSyllableSpeedToAlpha,
    ];

    const DURATION_TRANSPARENT = 100;
    
    Metric.Type = {
        NONE: 0,
        DURATION: 1,
        CHAR_SPEED: 2,
        SYLL_SPEED: 3,
    };

    app.Metric = Metric;
    
})( this.Reading || module.exports );
