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

    const controls = new ReadVis2.Controls({
        root: components.controls
    }, {
        displaySession: gazePlot.queryData.bind( gazePlot ),
        displayTextSummary: textSummary.queryData.bind( textSummary ),
        gazeReplay: gazeReplay.queryData.bind( gazeReplay ),
        wordReplay: wordReplay.queryData.bind( wordReplay ),
        studentSummary: studentSummary.queryData.bind( studentSummary ),
    });

    const options = new ReadVis2.Options({
        root: components.options,
        text: components.textContainer + ' ' + components.text
    }, {    // services
        common: {
            name: 'common',
            title: 'Common',
            options: ReadVis2.Visualization.createCommonOptions()
        },
        gazePlot: {
            name: 'gaze-plot',
            title: 'Gaze plot',
            update: gazePlot.update.bind( gazePlot ),
            options: gazePlot.options
        },
        textSummary: {
            name: 'text-summary',
            title: 'Text summary',
            update: textSummary.update.bind( textSummary ),
            options: textSummary.options
        },
        gazeReplay: {
            name: 'gaze-replay',
            title: 'Gaze replay',
            update: gazeReplay.update.bind( gazeReplay ),
            options: gazeReplay.options
        },
        wordReplay: {
            name: 'word-replay',
            title: 'Word replay',
            update: wordReplay.update.bind( wordReplay ),
            options: wordReplay.options
        },
    }, {    // utils
    });
};

ReadVis2.loaded = function( callback ) {
    ReadVis2.loadingCallbacks.push( callback );
};

ReadVis2.loadingCallbacks = [];