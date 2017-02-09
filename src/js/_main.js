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
    var gazePlots = new Reading.GazePlots({
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
        displaySessions: gazePlots.queryData.bind( gazePlots ),
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
        gazePlots: {
            colorMetric: function (value) { return value === undefined ?
                gazePlots.colorMetric :
                (gazePlots.colorMetric = value);
            },
            showFixations: function (value) { return value === undefined ?
                gazePlots.showFixations :
                (gazePlots.showFixations = value);
            },
            uniteSpacings: function (value) { return value === undefined ?
                gazePlots.uniteSpacings :
                (gazePlots.uniteSpacings = value);
            },
            showRegressions: function (value) { return value === undefined ?
                gazePlots.showRegressions :
                (gazePlots.showRegressions = value);
            }
        }
    }, {    // utils
    });
};

Reading.loaded = function (callback) {
    Reading.loadingCallbacks.push( callback );
};

Reading.loadingCallbacks = [];