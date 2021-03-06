// Requires:
//      Firebase

window.ReadVis2 = window.ReadVis2 || {};
const ReadVis2 = window.ReadVis2;

// "components" contains selectors for each component
ReadVis2.init = function( components ) {

    ReadVis2.loadingCallbacks.forEach( callback => { callback(); } );

    // DB
    if (typeof window.firebase !== 'undefined') {
        ReadVis2.firebase = window.firebase.database().ref( 'school2' );
    }
    else {
        window.alert( 'Please connect to the internet and reload the page' );
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
    const gazeReplay = new ReadVis2.GazeReplay({
        root: components.visualization
    });
    const wordReplay = new ReadVis2.WordReplay({
        root: components.visualization,
        container: components.wordReplay
    });
    const studentSummary = new ReadVis2.StudentSummary({
        root: components.visualization,
        container: components.studentSummary
    });

    /*const controls = */new ReadVis2.Controls({
        root: components.controls
    }, {
        displaySession: gazePlot.queryData.bind( gazePlot ),
        displayTextSummary: textSummary.queryData.bind( textSummary ),
        gazeReplay: gazeReplay.queryData.bind( gazeReplay ),
        wordReplay: wordReplay.queryData.bind( wordReplay ),
        studentSummary: studentSummary.queryData.bind( studentSummary ),
    });

    /*const options = */new ReadVis2.Options({
        root: components.options,
        text: components.textContainer + ' ' + components.text
    }, {    // services
        gazePlot: gazePlot.options,
        textSummary: textSummary.options,
        gazeReplay: gazeReplay.options,
        wordReplay: wordReplay.options,
        studentSummary: studentSummary.options,
        _common: ReadVis2.Visualization.createCommonOptions(),
        _sgwm: ReadVis2.Visualization.createSGWMOptions(),
    }, {    // utils
    });
};

ReadVis2.loaded = function( callback ) {
    ReadVis2.loadingCallbacks.push( callback );
};

ReadVis2.loadingCallbacks = [];