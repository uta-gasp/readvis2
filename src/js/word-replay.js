// Requires:

(function( app ) { 'use strict';

    // Real-time visualization constructor
    // Arguments:
    //      options: {
    //          container    - selecotr of the table
    //      }
    function WordReplay( options ) {

        this._container = document.querySelector( options.container );

        this.longFixationThreshold = 1000;

        app.Visualization.call( this, options );

        this.options = {
            id: 'word-replay',
            title: 'Word replay',
            update: this.update.bind( this ),
            options: app.Visualization.createOptions({
                longFixationThreshold: { type: new Number(100), label: 'Level duration, ms' },
            }, this )
        };

        this._data = null;
        this._tracks = null;
    }

    app.loaded( () => { // we have to defer the prototype definition until the Visualization mudule is loaded

    WordReplay.prototype = Object.create( app.Visualization.prototype );
    WordReplay.prototype.base = app.Visualization.prototype;
    WordReplay.prototype.constructor = WordReplay;

    WordReplay.prototype._fillCategories = function( list, users ) {
        const texts = this._getTexts( users );
        texts.forEach( (text, id) => {
            const option = this._addOption( list, id, text.title, text.sessions );
            if (this._data && this._data.textID === id) {
                option.selected = true;
            }
        });
    };

    WordReplay.prototype._load = function( cbLoaded, textID, sessions, textTitle ) {

        const textPromise = this._loadText( textID, textTitle );
        const promises = [ textPromise ];

        sessions.forEach( (session, id) => {
            app.WordList.instance.hyphen = session.interaction.syllabification.hyphen;
            promises.push( this._loadSession( id, session ) );
        });

        Promise.all( promises ).then( ([text, ...sessionDatas]) => {
            this._data = {
                textID: textID,
                textTitle: textTitle,
                text: text,
                sessions: sessionDatas,
                hyphen: sessionDatas[0].meta.interaction.syllabification.hyphen
            };

            Track.colorIndex = 0;
            this._tracks = [];

            sessionDatas.forEach( (sessionData, id) => {
                this._tracks.push( new Track( this._container, sessionData, id ) );
            });

            this._setPageIndex( 0 );
            this._start();

            this._setPrevPageCallback( () => { this._prevPage(); } );
            this._setNextPageCallback( () => { this._nextPage(); } );
            this._setCloseCallback( () => {
                this._stopAll();
                this._container.classList.add( 'invisible' );
            });

            if (cbLoaded) {
                cbLoaded();
            }

        }).catch( reason => {
            window.alert( reason );
        });
    };

    WordReplay.prototype._start = function() {
        if (!this._tracks.length) {
            return;
        }

        const ctx = this._getCanvas2D();
        this._drawTitle( ctx, `"${this._data.text.title}" for ${this._data.sessions.length} sessions` );

        const table = this._createTable( this._data.text[ this._pageIndex ], this._tracks );
        this._run( table );
    };

    WordReplay.prototype._stopAll = function() {
        if (this._tracks) {
            this._tracks.forEach( track => track.stop() );
        }
    }

    WordReplay.prototype._createTable = function( words, tracks ) {
        const table = this._container.querySelector( 'table' );
        table.innerHTML = '';

        const hyphenRegExp = new RegExp( `${this._data.hyphen}`, 'g' );
        words.forEach( word => {
            const row = table.insertRow();
            const cell = row.insertCell();
            cell.textContent = word.text.replace( hyphenRegExp, '');

            tracks.forEach( track => {
                row.insertCell();
            });
        });

        const header = table.createTHead();
        const footer = table.createTFoot();
        const headerRow = header.insertRow();
        const footerRow = footer.insertRow();
        headerRow.insertCell();
        footerRow.insertCell();

        tracks.forEach( track => {
            headerRow.insertCell().textContent = track.name;
            const doneCell = footerRow.insertCell();
            doneCell.textContent = 'done';
            doneCell.classList.add( 'hidden' );
        });

        this._container.classList.remove( 'invisible' );

        return table;
    };

    WordReplay.prototype._run = function( table ) {
        const rows = table.querySelectorAll( 'tr' );
        const pageText = this._data.text[ this._pageIndex ];

        this._tracks.forEach( (track, ti) => {

            const data = {
                fixations: track.session[ this._pageIndex ].fixations,
                words: pageText,
            };

            const mappingResult = this._map( data );

            track.start(
                mappingResult,
                (word, duration, pointer) => {
                    const rawWord = track.words[ word.id ];
                    rawWord.totalDuration = rawWord.totalDuration + duration;

                    const levels = 1 + Math.floor( rawWord.totalDuration / this.longFixationThreshold );
                    const tone = 255 - 24 * Math.min( 10, levels );
                    const rgb = `rgb(${tone},${tone},${tone})`;

                    const row = rows[ word.id + 1 ];
                    const cell = row.cells[ track.id + 1 ];
                    cell.style.backgroundColor = rgb;

                    track.pointer.style = `left: ${cell.offsetLeft + (cell.offsetWidth - track.pointerSize) / 2}px;
                                           top: ${cell.offsetTop + (cell.offsetHeight - track.pointerSize) / 2}px`;
                },
                () => {
                    const row = rows[ pageText.length + 1 ];
                    const cell = row.cells[ track.id + 1 ];
                    cell.classList.remove( 'hidden' );
                }
            );
        })
    };

    WordReplay.prototype._prevPage = function() {
        this._stopAll();
        if (this._data && this._pageIndex > 0) {
            this._setPageIndex( this._pageIndex - 1 );
            this._start();
        }
    };

    WordReplay.prototype._nextPage = function() {
        this._stopAll();
        if (this._data && this._pageIndex < this._data.text.length - 1) {
            this._setPageIndex( this._pageIndex + 1 );
            this._start();
        }
    };

    }); // end of delayed call

    function Track( root, session, id ) {
        this.root = root;
        this.name = session.meta.user;
        this.id = id;

        this.pointerSize = 8;
        this.fixationTimer = null;
        this.nextTimer = null;

        this.session = session;
        this.fixations = null;
        this.words = null;

        this.fixationIndex = -1;

        this.__next = this._next.bind( this );
    }

    Track.prototype.start = function( data, onWordFixated, onCompleted ) {
        this.onWordFixated = onWordFixated;
        this.onCompleted = onCompleted;

        if (!data.fixations) {
            onCompleted();
            return;
        }

        this.fixations = data.fixations;
        this.words = data.text.words;

        this.words.forEach( word => {
            word.totalDuration = 0;
        });

        this.fixationIndex = 0;

        this.pointer = document.createElement( 'div' );
        this.pointer.classList.add( 'pointer' );
        this.pointer.classList.add( 'invisible' );
        this.root.appendChild( this.pointer );

        this.nextTimer = setTimeout( this.__next, 1500);
    };

    Track.prototype.stop = function() {
        if (this.nextTimer) {
            clearTimeout( this.nextTimer );
            this.nextTimer = null;
        }

        if (this.fixationTimer) {
            clearTimeout( this.fixationTimer );
            this.fixationTimer = null;
        }

        if (this.pointer) {
            this.root.removeChild( this.pointer );
            this.pointer = null;
        }
    };

    Track.prototype._next = function() {
        let fixation = this.fixations[ this.fixationIndex ];

        this._moveFixation( fixation.word, fixation.duration );

        this.fixationIndex++;
        if (this.fixationIndex < this.fixations.length) {
            let pause = this.fixations[ this.fixationIndex ].ts - fixation.ts;
            this.nextTimer = setTimeout( this.__next, pause );
        }
        else {
            this.onCompleted();
            this.root.removeChild( this.pointer );
            this.pointer = null;
            this.nextTimer = null;
        }
    };

    Track.prototype._moveFixation = function( word, duration ) {
        if (this.fixationTimer) {
            clearTimeout( this.fixationTimer );
            this.fixationTimer = null;
        }

        if (word) {
            this.onWordFixated( word, duration, this.pointer );

            this.pointer.classList.remove( 'invisible' );

            this.fixationTimer = setTimeout( () => {
                this.fixationTimer = null;
                if (this.pointer) {
                    this.pointer.classList.add( 'invisible' );
                }
            }, duration);
        }
        else {
            this.pointer.classList.add( 'invisible' );
        }
    };

    app.WordReplay = WordReplay;

})( this.ReadVis2 || module.exports );
