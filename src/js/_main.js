// Requires:
//      Firebase

var ReadVis2 = ReadVis2 || {};

// "components" contains selectors for each component
ReadVis2.init = function( components ) {

    ReadVis2.loadingCallbacks.forEach( callback => { callback(); } );

    // DB
    if (typeof firebase !== 'undefined') {
        ReadVis2.firebase = firebase.database().ref( 'school2' );
    }
    else {
        alert( 'Please connect to the internet and reload the page' );
    }

    // setup
    ReadVis2.Visualization.init( components.visualization );

    ReadVis2.WordList.instance = new ReadVis2.WordList({
        container: components.wordList
    });

    const gazePlot = new ReadVis2.GazePlot({
        root: components.visualization
    });
    const textSummary = new ReadVis2.TextSummary({
        root: components.visualization
    });
    const wordReplay = new ReadVis2.WordReplay({
        root: components.visualization,
        container: components.wordReplay
    });
    const gazeReplay = new ReadVis2.GazeReplay({
        root: components.visualization
    });

    const controls = new ReadVis2.Controls({
        root: components.controls
    }, {
        displaySession: gazePlot.queryData.bind( gazePlot ),
        displayTextSummary: textSummary.queryData.bind( textSummary ),
        gazeReplay: gazeReplay.queryData.bind( gazeReplay ),
        wordReplay: wordReplay.queryData.bind( wordReplay ),
    });

    const options = new ReadVis2.Options({
        root: components.options,
        text: components.textContainer + ' ' + components.text
    }, {    // services
        gazePlot: {
            mapping: value => { return value === undefined ?
                gazePlot.mapping :
                (gazePlot.mapping = value);
            },
            colorMetric: value => { return value === undefined ?
                gazePlot.colorMetric :
                (gazePlot.colorMetric = value);
            },
            showIDs: value => { return value === undefined ?
                gazePlot.showIDs :
                (gazePlot.showIDs = value);
            },
            showConnections: value => { return value === undefined ?
                gazePlot.showConnections :
                (gazePlot.showConnections = value);
            },
            showSaccades: value => { return value === undefined ?
                gazePlot.showSaccades :
                (gazePlot.showSaccades = value);
            },
            showFixations: value => { return value === undefined ?
                gazePlot.showFixations :
                (gazePlot.showFixations = value);
            },
            showOriginalFixLocation: value => { return value === undefined ?
                gazePlot.showOriginalFixLocation :
                (gazePlot.showOriginalFixLocation = value);
            }
        },
        textSummary: {
            colorMetric: value => { return value === undefined ?
                textSummary.colorMetric :
                (textSummary.colorMetric = value);
            },
            showFixations: value => { return value === undefined ?
                textSummary.showFixations :
                (textSummary.showFixations = value);
            },
            showRegressions: value => { return value === undefined ?
                textSummary.showRegressions :
                (textSummary.showRegressions = value);
            }
        }
    }, {    // utils
    });
};

ReadVis2.loaded = function( callback ) {
    ReadVis2.loadingCallbacks.push( callback );
};

ReadVis2.loadingCallbacks = [];