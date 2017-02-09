(function (app) { 'use strict';

    const MappingsToSave = {
        NONE: 0,
        FIXATIONS: 1,
        WORDS: 2,
        UNIQUE_WORDS: 4,
        PARTICIPANTS: 8
    };

    const MAPPING_TO_SAVE = MappingsToSave.FIXATIONS;

    var RemapExporter = { };

    RemapExporter.export = function (snapshot, remap) {
        if (MAPPING_TO_SAVE === MappingsToSave.NONE) {
            return;
        }

        var logs = createLogs( snapshot, remap );
        saveLogs( logs );
    };

    RemapExporter.save = function (data, filename) {
        var blob = new Blob([data], {type: 'text/plain'});

        var downloadLink = document.createElement("a");
        downloadLink.download = filename;
        downloadLink.innerHTML = 'Download File';

        var URL = window.URL || window.webkitURL;
        downloadLink.href = URL.createObjectURL( blob );
        downloadLink.onclick = function(event) { // self-destrly
            document.body.removeChild(event.target);
        };
        downloadLink.style.display = 'none';
        document.body.appendChild( downloadLink );

        downloadLink.click();
    };

    function createLogs (snapshot, remap) {
        var logs = {
            fixations: [],
            words: [],
            uniqueWords: new Map(),
            participants: new Map()
        };

        snapshot.forEach( childSnapshot => {
            var session = childSnapshot.val();
            if (!session.fixations || !session.words) {
                return;
            }

            var fixations = remap( session );

            var id = childSnapshot.key();

            if (MAPPING_TO_SAVE & MappingsToSave.FIXATIONS) {
                //Array.prototype.push.apply( logs.fixations, logFixations( id, fixations ) );
                logs.fixations = logs.fixations.concat( id, ...logFixations( fixations ) );
            }

            if (MAPPING_TO_SAVE & MappingsToSave.WORDS) {
                Array.prototype.push.apply( logs.words, logWords( id, fixations, session.words ) );
            }

            if (MAPPING_TO_SAVE & MappingsToSave.UNIQUE_WORDS) {
                logUniqueWords( fixations, session.words, logs.uniqueWords );
            }
            if (MAPPING_TO_SAVE & MappingsToSave.PARTICIPANTS) {
                logParticipants( id, fixations, session.words, logs.participants );
            }
        });

        return logs;
    }

    function saveLogs( logs ) {
        if (MAPPING_TO_SAVE & MappingsToSave.FIXATIONS) {
            RemapExporter.save( logs.fixations.join( '\r\n' ), 'mapping_fixations.txt' );
        }
        if (MAPPING_TO_SAVE & MappingsToSave.WORDS) {
            RemapExporter.save( logs.words.join( '\r\n' ), 'mapping_words.txt' );
        }
        if (MAPPING_TO_SAVE & MappingsToSave.UNIQUE_WORDS) {
            var data = [];
            logs.uniqueWords.forEach( word => {
                data.push( `${word.text}\t${word.duration}\t${word.avgFixDur()}` );
            });
            RemapExporter.save( data.join( '\r\n' ), 'mapping_uniqueWords.txt' );
        }
        if (MAPPING_TO_SAVE & MappingsToSave.PARTICIPANTS) {
            var data = [];
            logs.participants.forEach( participant => {
                data.push( participant.id );
                participant.words.forEach( word => {
                    data.push( `${word.text}\t${word.duration}\t${word.avgFixDur()}` );
                });
            });
            RemapExporter.save( data.join( '\r\n' ), 'mapping_participants.txt' );
        }
    }

    function logFixations (fixations) {
        //var i = 0;
        var fixations = fixations.map( fix => {
            var x = fix._x !== undefined ? fix._x : fix.x;
            if (x < 0 || fix.y < 0 ) {
                return null;
            }
            var word = !fix.word ? '' : fix.word.index;
            var line = fix.line === undefined || fix.line === null || word === '' ? -1 : fix.line;
            return `${x}\t${fix.y}\t${fix.duration}\t${fix.id}\t${line}\t${word}`;
//            return `${x}\t${fix.y}\t${fix.duration}\t${line}\t${word}\t` +
//                ( !fix.word ? `\t` : `${fix.word.text}\t` );
        });

        return fixations.filter( record => { return record !== null; } );
    }

    function logWords (id, fixations, words) {
        var counters = new Map();

        fixations.forEach( fixation => {
            var line = fixation.line === undefined || fixation.line === null ? -1 : fixation.line;
            var word = !fixation.word ? -1 : fixation.word.index;
            if (line >= 0 && word >= 0) {
                var wordID = `${line}_${word}`;
                var wordText = fixation.word.text;
                if (!counters.has( wordID )) {
                    counters.set( wordID, new Counter( wordText, fixation.duration ) );
                }
                else {
                    counters.get( wordID ).add( fixation.duration );
                }
            }
        });

        var words = [ id ];
        counters.forEach( word => {
            words.push( `${word.text}\t${word.duration}\t${word.avgFixDur()}` );
        });

        return words;
    }

    function logUniqueWords (fixations, words, accumulator) {
        fixations.forEach( fixation => {
            if (!fixation.word) {
                return;
            }

            var word = fixation.word.text.toLowerCase().match( /([a-z]|[0-9]|ä|ö)+/ )[0];
            if (!accumulator.has( word )) {
                accumulator.set( word, new Counter( word, fixation.duration ) );
            }
            else {
                accumulator.get( word ).add( fixation.duration );
            }
        });
    }

    function logParticipants (id, fixations, words, accumulator) {
        var participantID = id.split( '_' )[0];
        var participant = accumulator.get( participantID );
        if (!participant) {
            participant = {
                id: participantID,
                words: new Map()
            };
            accumulator.set( participantID, participant );
        }
        var words = participant.words;

        fixations.forEach( fixation => {
            if (!fixation.word) {
                return;
            }

            var word = fixation.word.text.toLowerCase().match( /([a-z]|[0-9]|ä|ö)+/ )[0];
            if (!words.has( word )) {
                words.set( word, new Counter( word, fixation.duration ) );
            }
            else {
                words.get( word ).add( fixation.duration );
            }
        });
    }

    function Counter (text, duration) {
        this.text = text;
        this.duration = duration;
        this.durationCount = 1;
        this.count = 1;
    }

    Counter.prototype.add = function (duration) {
        this.duration += duration;
        this.durationCount++;
    }

    Counter.prototype.avgFixDur = function () {
        return this.duration / this.durationCount;
    }

    Counter.prototype.avgDur = function () {
        return this.duration / this.count;
    }

    app.RemapExporter = RemapExporter;

})( this.Reading || module.exports );
