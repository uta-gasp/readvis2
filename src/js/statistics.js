// Requires:
//      app.firebase
//      utils/logger
//      murmurhash3_32_gc

(function (app) { 'use strict';

    // Text highlighting propagation routine
    // Constructor arguments:
    //      options: {
    //          root:               - selector for the element that contains statistics view
    //          wordClass           - name of word class
    //          minFixationDuration - minimum fixation duration
    //      }
    //      services: {
    //          getTextSetup ()         - get an object woth text setup parameters
    //          getInteractionSetup ()  - get an object woth interaction setup parameters
    //      }
    function Statistics (options, services) {

        this.root = options.root || document.documentElement;
        this.wordSelector = '.' + options.wordClass || '.word';
        this.minFixationDuration = options.minFixationDuration || 80;

        this.userName = '';

        _services = services;

        var logError = app.Logger.moduleErrorPrinter( 'Statistics' );
        _services.getTextSetup = _services.getTextSetup || logError( 'getTextSetup' );
        _services.getInteractionSetup = _services.getInteractionSetup || logError( 'getInteractionSetup' );

        _view = document.querySelector( this.root );

        // var close = _view.querySelector( '.close' );
        // close.addEventListener('click', e => {
        //     _view.style.display = 'none';
        // });

        // var saveLocal = _view.querySelector( '.saveLocal' );
        // saveLocal.addEventListener('click', e => {
        //     //this._saveLocal();
        // });

        // var saveRemote = _view.querySelector( '.saveRemote' );
        // saveRemote.addEventListener('click', e => {
        //     this._saveRemote( filterFixations() );
        // });
    }

    Statistics.prototype.show = function () {
        _view.classList.remove( 'hidden' );
    };

    Statistics.prototype.hide = function () {
        _view.classList.add( 'hidden' );
    };

    /*
    // Print the statistics
    Statistics.prototype.print = function () {

        if (_currentWord && _currentPage) {
            var record = _currentPage.get( _currentWord );
            if (record) {
                record.stop();
            }
        }

        var text = Record.getHeader() + '\n';

        _pages.forEach( (words, id)  => {
            text += 'page #' + id + '\n';
            words.forEach( record => {
                text += record.toString() + '\n';
            });
        });

        text += '\n' + Fixation.getHeader() + '\n';

        _fixationsFiltered = [];
        var lastFix = null;
        for (var i = 0; i < _fixations.length; i += 1) {
            var fix = _fixations[i];
            if (fix.duration <= 80) {
                continue;
            }
            if (!lastFix || lastFix.ts !== fix.ts) {
                text += fix.toString() + '\n';
                if (lastFix) {
                    _fixationsFiltered.push( lastFix );
                }
            }
            lastFix = fix;
        }

        var textarea = document.querySelector( this.root + ' textarea' );
        textarea.value = text;

        _view.style.display = 'block';
    };
    */

    // Prepares to collect data
    Statistics.prototype.init = function () {
        _currentWord = null;
        _currentPage = null;
        _currentRecord = null;
        _pages.length = 0;
        _startTime = window.performance.now();
    };

    // Propagates the highlighing if the focused word is the next after the current
    // Arguments:
    //        word:         - the focused word  (DOM element)
    Statistics.prototype.setFocusedWord = function (word, pageID) {

        if (_currentWord != word) {
            if (_currentRecord) {
                _currentRecord.stop();
                _currentRecord = null;
            }

            if (word) {
                const page = this._getPage( pageID );
                _currentRecord = page.words.get( word );
                if (!_currentRecord) {
                    _currentRecord = new Record( word, pageID );
                    page.words.set( word, _currentRecord );
                }

                _currentRecord.start();
            }

            _currentWord = word;
            _currentPage = pageID;
        }
    };

    // Logs fixation
    Statistics.prototype.logFixation = function (fixation, pageID) {
        var page = this._getPage( pageID );
        page.fixations.push( new Fixation( fixation ) );
    };

    Statistics.prototype.save = function () {
        var fixations = filterFixations( this.minFixationDuration );
        this._saveRemote( fixations );
    };

    Statistics.prototype.onSyllabified = function (word) {
        if (!word || _currentPage === null) {
            return;
        }
        const page = this._getPage( _currentPage );
        if (!page) {
            return;
        }
        const record = page.words.get( word );
        if (record) {
            record.syllabified = true;
            page.syllabifications.push( new GazeEvent( record ) );
        }
    };

    Statistics.prototype.onPronounced = function (word) {
        if (!word || _currentPage === null) {
            return;
        }
        const page = this._getPage( _currentPage );
        if (!page) {
            return;
        }
        const record = page.words.get( word );
        if (record) {
            record.pronounced = true;
            page.speech.push( new GazeEvent( record ) );
        }
    };

    Statistics.prototype.getAvgWordReadingDuration = function () {
        const page = this._getPage( 0 );
        if (!page) {
            return 500;
        }

        let sum = 0;
        let count = 0;
        page.words.forEach( record => {
            if (record.duration > 200) {
                sum += record.duration;
                count++;
            }
        });

        if (!count) {
            return 500;
        }

        return sum / count;
    };

    // private
    Statistics.prototype._getPage =  function ( pageID ) {
        var page = _pages[ pageID ];
        if (!page) {
            page = new Page( this._getWordsList() );
            _pages.push( page );
        }

        return page;
    }
    /*
    Statistics.prototype._saveLocal = function () {
        var data = document.querySelector( this.root + ' textarea' ).value;
        var blob = new Blob([data], {type: 'text/plain'});

        var downloadLink = document.createElement("a");
        downloadLink.download = 'results.txt';
        downloadLink.innerHTML = 'Download File';

        var URL = window.URL || window.webkitURL;
        downloadLink.href = URL.createObjectURL( blob );
        downloadLink.onclick = function(event) { // self-destrly
            document.body.removeChild(event.target);
        };
        downloadLink.style.display = 'none';
        document.body.appendChild( downloadLink );

        downloadLink.click();
    };*/

    Statistics.prototype._saveRemote = function ( fixations ) {
        if (_currentRecord) {
            _currentRecord.stop();
            _currentRecord = null;
        }

        const name = this.userName || window.prompt( 'Please enter the name', GUID() );
        if (!name) {
            return;
        }

        const textSetup = _services.getTextSetup();
        const textHash = murmurhash3_32_gc( textSetup.text, 1837832);
        const date = (new Date()).toJSON();
        const sessionID = GUID();

        const session = _pages.map( (page, pi) => {
            const records = [];
            for (let record of page.words.values()) {
                records.push( record );
            }

            return {
                records: records,
                fixations: fixations[ pi ],
                syllabifications: page.syllabifications,
                speech: page.speech,
            };
        });

        const text = _pages.map( page => {
            return page.wordList;
        });

        const userSessions = app.firebase.child( 'users/' + name + '/sessions' );
        const sessionKey = userSessions.push({
            date: date,
            text: textHash,
            lineSize: textSetup.lineSize,
            font: textSetup.font,
            interaction: _services.getInteractionSetup()
        }).key;

        const updates = {};
        updates[ '/sessions/' + sessionKey ] = session;
        updates[ '/texts/' + textHash ] = text;

        this.show();
        app.firebase.update( updates, () => {
            this.hide();
        });
    };

    Statistics.prototype._getWordsList = function () {
        const list = [];
        const words = document.querySelectorAll( this.wordSelector );
        const emptyMapping = new Record();

        for (let i = 0; i < words.length; i += 1) {
            var word = words.item(i);
            var rect = word.getBoundingClientRect();
            //var mapping = _words.get( word ) || emptyMapping;  // this._getMapping( rect );
            list.push({
                text: word.textContent,
                x: rect.left,
                y: rect.top,
                width: rect.width,
                height: rect.height,
                id: i
            });
        }
        return list;
    };
    /*
    Statistics.prototype._getMapping = function (rect) {
        var result = {
            duration: 0,
            focusCount: 0,
            timestamp: 0
        };

        for (var word of _words.values()) {
            var r = word.rect;
            if (Math.abs(r.left - rect.left) < 1 && Math.abs(r.top - rect.top) < 1) {
                result.duration = word.duration;
                result.focusCount = word.focusCount;
                result.timestamp = word.timestamp;
                break;
            }
        }

        return result;
    };*/

    // private
    var _services;
    var _view;

    var _currentWord = null;
    var _currentPage = null;
    var _currentRecord = null;
    var _pages = [];
    var _startTime;

    // definitions

    function Page( wordList ) {
        this.wordList = wordList;
        this.words = new Map();
        this.fixations = [];
        this.syllabifications = [];
        this.speech = [];
    }

    function Record (elem, pageID) {
        let rect = null;
        if (elem) {
            const box = elem.getBoundingClientRect()
            rect = {
                x: box.left,
                y: box.top,
                width: box.width,
                height: box.height
            };
        }
        this.rect = rect;
        this.text = elem ? elem.textContent : '';
        this.duration = 0;
        this.focusCount = 0;
        this.firstEntry = 0;
        this.lastEntry = 0;
        this.pageID = pageID;
        this.syllabified = false;
        this.pronounced = false;
    }

    Record.prototype.start = function () {
        this.lastEntry = timestamp();
        if (!this.focusCount) {
            this.firstEntry = this.lastEntry;
        }
        this.focusCount++;
    };

    Record.prototype.stop = function () {
        this.duration += timestamp() - this.lastEntry;
    };

    Record.prototype.toString = function () {
        return this.pageID + '\t' + this.text + '\t' +
            Math.round(this.duration) + '\t' + this.focusCount + '\t' +
            Math.round(this.rect.left) + '\t' + Math.round(this.rect.top) + '\t' +
            Math.round(this.rect.width) + '\t' + Math.round(this.rect.height);
    };

    Record.getHeader = function () {
        return 'page\ttext\tdur\tfocus\tx\ty\tw\th';
    };

    function Fixation (fixation) {
        this.ts = fixation.ts;
        this.tsSync = timestamp();
        this.x = Math.round( fixation.x );
        this.y = Math.round( fixation.y );
        this.duration = fixation.duration;
    }

    Fixation.prototype.toString = function () {
        return this.ts + '\t' + this.x + '\t' + this.y + '\t' + this.duration;
    };

    Fixation.getHeader = function () {
        return 'ts\tx\ty\tdur';
    };

    function GazeEvent (record) {
        this.ts = timestamp();
        this.rect = record.rect;
        this.text = record.text;
    }

    // private functions

    function timestamp() {
        return Math.round( window.performance.now() - _startTime );
    }

    function GUID() {
        return Math.random().toString(36).substring(2, 15) +
            Math.random().toString(36).substring(2, 15);
    }

    function filterFixations( durationThreshold ) {
        const result = [];

        let lastFix = null;
        let lastFixContainer = null;

        _pages.forEach( page => {
            const pageFixations = [];
            let fixTimestamp = 0;
            let fixTimestampSync = 0;

            page.fixations.forEach( fixation => {
                if (fixation.duration < durationThreshold) {
                    return;
                }

                if (!lastFix) {
                    lastFixContainer = pageFixations;
                }
                else if (lastFix.ts !== fixation.ts) {
                    lastFix.tsSync = fixTimestampSync;
                    lastFixContainer.push( lastFix );
                    lastFixContainer = pageFixations;
                }

                if (fixTimestamp !== fixation.ts) {
                    fixTimestamp = fixation.ts;
                    fixTimestampSync = fixation.tsSync;
                }

                lastFix = fixation;
            });

            result.push( pageFixations );
        });

        if (lastFix && lastFixContainer) {
            lastFixContainer.push( lastFix );
        }

        return result;
    }

    // export

    app.Statistics = Statistics;

})( this.Reading || module.exports );
