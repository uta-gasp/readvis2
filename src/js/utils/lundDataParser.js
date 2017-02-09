(function (app) { 'use strict';

    var lundDataParser = { };

    lundDataParser.words = function (rows, index) {
        let pages = [];
        let words = [];
        pages.push( { words: words } );

        rows.forEach( row => {
            if (row[0] === '#') {
                return;
            }

            let values = row.split( '\t' );
            if (values.length !== 9) {
                return;
            }

            let pageID = +values[0];
            if (pageID > pages.length) {
                words = [];
                pages.push( { words: words } );
            }

            let word = new Word(
                +values[1], // x1
                +values[2], // y1
                +values[3], // x2
                +values[4], // y2
                +values[6], // col
                +values[7], // row
                values[8]   // text
            );
            words.push( word );
        });

        return pages[ index ].words;
    };

    lundDataParser.fixations = function (rows) {
        let fixations = [];

        rows.forEach( (row, index) => {
            if (index === 0) {
                return;
            }

            let values = row.split( '\t' );
            if (values.length < 8) {
                return;
            }

            let fixation = new Fixation(
                +values[0],     // ts
                +values[1],     // duraiton
                +values[2],     // x
                +values[3],     // y
                +values[4],     // wordID
                values[5] === 'NaN' ? -1 : +values[5],  // col
                values[6] === 'NaN' ? -1 : +values[6],  // row
                values[7]   // text
            );
            fixations.push( fixation );
        });

        return fixations;
    };

    function Word (x1, y1, x2, y2, col, row, text) {
        this.x = x1;
        this.y = y1;
        this.width = x2 - x1;
        this.height = y2 - y1;
        this.row = row;
        this.col = col;
        this.text = text;
    }

    function Fixation (ts, duration, x, y, wordID, col, row, text) {
        this.ts = ts;
        this.duration = duration;
        this.x = x;
        this.y = y;
        this.wordID = wordID;
        this.row = row;
        this.col = col;
        this.text = text;
    }

    app.lundDataParser = lundDataParser;
    
})( this.Reading || module.exports );
