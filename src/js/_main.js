// Requires:
//      Firebase

var Reading = Reading || {};

// "components" contains selectors for each component
Reading.init = function (components) {

    Reading.loadingCallbacks.forEach( callback => { callback(); } );

    // DB
    if (typeof firebase !== 'undefined') {
        Reading.firebase = firebase.database().ref( 'school2' );
    }
    else {
        alert( 'Please connect to the internet and reload the page' );
    }

    // setup
    Reading.Visualization.init( components.visualization );

    Reading.WordList.instance = new Reading.WordList({
        container: components.wordlist
    });

    var gazePlot = new Reading.GazePlot({
        root: components.visualization
    });
    var textSummary = new Reading.TextSummary({
        root: components.visualization
    });
    var rtv = new Reading.RTV({
        root: components.visualization
    });
    var gazeReplay = new Reading.GazeReplay({
        root: components.visualization
    });

    var controls = new Reading.Controls({
        root: components.controls
    }, {
        displaySession: gazePlot.queryData.bind( gazePlot ),
        displayTextSummary: textSummary.queryData.bind( textSummary ),
        simulate: rtv.queryData.bind( rtv ),
        gazeReplay: gazeReplay.queryData.bind( gazeReplay )
    });

    var options = new Reading.Options({
        root: components.options,
        text: components.textContainer + ' ' + components.text
    }, {    // services
        gazePlot: {
            mapping: function (value) { return value === undefined ?
                gazePlot.mapping :
                (gazePlot.mapping = value);
            },
            colorMetric: function (value) { return value === undefined ?
                gazePlot.colorMetric :
                (gazePlot.colorMetric = value);
            },
            showIDs: function (value) { return value === undefined ?
                gazePlot.showIDs :
                (gazePlot.showIDs = value);
            },
            showConnections: function (value) { return value === undefined ?
                gazePlot.showConnections :
                (gazePlot.showConnections = value);
            },
            showSaccades: function (value) { return value === undefined ?
                gazePlot.showSaccades :
                (gazePlot.showSaccades = value);
            },
            showFixations: function (value) { return value === undefined ?
                gazePlot.showFixations :
                (gazePlot.showFixations = value);
            },
            showOriginalFixLocation: function (value) { return value === undefined ?
                gazePlot.showOriginalFixLocation :
                (gazePlot.showOriginalFixLocation = value);
            }
        },
        textSummary: {
            colorMetric: function (value) { return value === undefined ?
                textSummary.colorMetric :
                (textSummary.colorMetric = value);
            },
            showFixations: function (value) { return value === undefined ?
                textSummary.showFixations :
                (textSummary.showFixations = value);
            },
            uniteSpacings: function (value) { return value === undefined ?
                textSummary.uniteSpacings :
                (textSummary.uniteSpacings = value);
            },
            showRegressions: function (value) { return value === undefined ?
                textSummary.showRegressions :
                (textSummary.showRegressions = value);
            }
        }
    }, {    // utils
    });
};

Reading.loaded = function (callback) {
    Reading.loadingCallbacks.push( callback );
};

Reading.loadingCallbacks = [];