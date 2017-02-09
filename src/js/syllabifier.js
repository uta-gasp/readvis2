(function (app) { 'use strict';

    // Word-in-focus highlighting, syllabification and pronounciation
    //  external dependencies:
    //      responsiveVoice
    //      EventEmitter
    //
    // Constructor arguments:
    //      options: {
    //          highlightingEnabled
    //          syllabificationEnabled
    //          syllabificationThreshold - minimum fixation duration in ms to consider the word should be split
    //          syllabificationSmart     - if enabled, computeds the threshold after the first page is read
    //          speechEnabled
    //          speechThreshold - minimum fixation duration in ms to consider the word should be pronounced
    //      }
    function Syllabifier( options ) {

        this.highlightingEnabled = options.highlightingEnabled || false;
        this.syllabification = {};
        this.syllabification.enabled = options.syllabificationEnabled || false;
        this.syllabification.threshold = options.syllabificationThreshold || 2500;
        this.syllabification.smart = {}
        this.syllabification.smart.enabled = options.syllabificationSmart || true;
        this.syllabification.smart.threshold = {}
        this.syllabification.smart.threshold.min = options.syllabificationSmartThresholdMin || 1500;
        this.syllabification.smart.threshold.max = options.syllabificationSmartThresholdMax || 3000;
        this.syllabification.smart.threshold.factor = options.syllabificationSmartThresholdFactor || 4;
        this.speechEnabled = (options.speechEnabled || false) && (typeof responsiveVoice !== 'undefined');
        this.speechThreshold = options.speechThreshold || 4000;

        this.events = new EventEmitter();

        this.className = 'currentWord';
        this.hyphen = String.fromCharCode( 0x00B7 );//DOTS: 00B7 2010 2022 2043 LINES: 2758 22EE 205E 237F
        this.hyphenHtml = `<span class="hyphen">${this.hyphen}</span>`;

        this.timer = null;
        this.currentWord = null;
        this.words = null;

        const h = this.hyphen;
        this.exceptions = {
            'krokotiili': 'kro'+h+'ko'+h+'tii'+h+'li',
            'talviunille': 'tal'+h+'vi'+h+'u'+h+'nil'+h+'le',
            'hankien': 'han'+h+'ki'+h+'en',
            'metsien': 'met'+h+'si'+h+'en',
            'talviyön': 'tal'+h+'vi'+h+'yön',
            'avantouinnille': 'a'+h+'van'+h+'to'+h+'uin'+h+'nil'+h+'le',
            'kreikassa': 'krei'+h+'kas'+h+'sa',
            'maanosaa': 'maan'+h+'o'+h+'saa',
            'kansanedustajaa': 'kan'+h+'san'+h+'e'+h+'dus'+h+'ta'+h+'jaa',
            'kuntien': 'Kun'+h+'ti'+h+'en',
            'vuodenaikaa': 'vuo'+h+'den'+h+'ai'+h+'kaa',
            'kaikkien': 'kaik'+h+'ki'+h+'en',
            'finlandia-talossa': 'fin'+h+'lan'+h+'di'+h+'a-ta'+h+'los'+h+'sa',
            'weegee:ssä': 'weegee:ssä',
            'käsityöläisalue': 'kä'+h+'si'+h+'työ'+h+'läis'+h+'a'+h+'lu'+h+'e',
            'talviurheilukeskus': 'tal'+h+'vi'+h+'ur'+h+'hei'+h+'lu'+h+'kes'+h+'kus',
            'mualiman': 'mua'+h+'li'+h+'man',
            'kattokruunuun': 'kat'+h+'to'+h+'kruu'+h+'nuun',
            'unien': 'u'+h+'ni'+h+'en',
            'ikkunanpielien': 'ik'+h+'ku'+h+'nan'+h+'pie'+h+'li'+h+'en',
            'pohjois-suomessa': 'poh'+h+'jois-suo'+h+'mes'+h+'sa',
        };
    }

    Syllabifier.prototype.getSetup = function () {
        return {
            syllabification: {
                enabled: this.syllabification.enabled,
                threshold: this.syllabification.threshold,
                hyphen: this.hyphen
            },
            speech: {
                enabled: this.speechEnabled,
                threshold: this.speechThreshold
            }
        };
    };

    // Resets the highlighting
    Syllabifier.prototype.reset = function () {

        if (this.currentWord) {
            this.currentWord.classList.remove( this.className );
            this.currentWord = null;
        }

        clearTimeout( this.timer );
        this.timer = null;
        this.words = null;
    };

    Syllabifier.prototype.init = function () {
        this.words = new Map();
        if (this.syllabification.enabled || this.speechEnabled) {
            this.timer = setInterval( () => {
                this._tick();
            }, 30);
        }
    };

    Syllabifier.prototype.setAvgWordReadingDuration = function ( avgWordReadingDuration ) {
        if (!this.syllabification.smart.enabled) {
            return;
        }
        this.syllabification.threshold =
            Math.max( this.syllabification.smart.threshold.min,
            Math.max( this.syllabification.smart.threshold.max,
            avgWordReadingDuration * this.syllabification.smart.threshold.factor
        ));
    };

    Syllabifier.prototype._tick = function () {
        for (let key of this.words.keys()) {

            const wordSyllabParams = this.words.get( key );
            wordSyllabParams.accumulatedTime = Math.max( 0,
                wordSyllabParams.accumulatedTime + (key === this.currentWord ? 30 : -30)
            );

            if (this.syllabificatione.enabled &&
                wordSyllabParams.notSyllabified &&
                wordSyllabParams.accumulatedTime > this.syllabification.threshold) {

                wordSyllabParams.notSyllabified = false;

                const word = getWordFromElement( key );
                key.innerHTML = this.syllabifyWord( word, this.hyphenHtml );

                this.events.emitEvent( 'syllabified', [ key ] );
            }

            if (this.speechEnabled &&
                wordSyllabParams.notPronounced &&
                wordSyllabParams.accumulatedTime > this.speechThreshold) {

                wordSyllabParams.notPronounced = false;
                responsiveVoice.speak( wordSyllabParams.word, 'Finnish Female' );

                this.events.emitEvent( 'pronounced', [ key ] );
            }
        }
    };

    // Propagates / removed the highlighing
    // Arguments:
    //   wordEl: - the focused word DOM element
    Syllabifier.prototype.setFocusedWord = function (wordEl) {

        if (this.currentWord != wordEl) {
            if (this.highlightingEnabled) {
                if (this.currentWord) {
                    this.currentWord.classList.remove( this.className );
                }
                if (wordEl) {
                    wordEl.classList.add( this.className );
                }
            }
            this.currentWord = wordEl;

            if (wordEl && !this.words.has( wordEl )) {
                this.words.set( wordEl, {
                    accumulatedTime: 0,
                    notSyllabified: true,
                    notPronounced: true,
                    word: getWordFromElement( wordEl )
                });
            }
        }
    };

    Syllabifier.prototype.syllabify = function( text ) {

        if (!this.syllabification.enabled) {
            return text;
        }

        return text.map( line => {
            const words = line.split( ' ' ).map( word => word.toLowerCase() );
            return words.map( word => this.syllabifyWord( word, this.hyphenHtml ) ).join( ' ' );
        });
    };

    Syllabifier.prototype.prepareForSyllabification = function( text ) {

        if (!this.syllabification.enabled) {
            return text;
        }

        const prepareWord = word => {
            if (!word) {
                return word;
            }

            const syllabifiedWord = this.syllabifyWord( word, this.hyphen );
            const hyphenCount = syllabifiedWord.length - word.length;
            const halfHyphenCount = Math.round( hyphenCount / 2 );

            return  '<span class="hyphens">' +
                        (Array( halfHyphenCount + 1 ).join( this.hyphen ) ) +
                    '</span>' +
                    word +
                    '<span class="hyphens">' +
                        (Array( hyphenCount - halfHyphenCount + 1 ).join( this.hyphen ) ) +
                    '</span>';
        };

        if ( text instanceof Array ) {
            return text.map( line => {
                const words = line.split( ' ' ).map( word => word.toLowerCase() );
                return words.map( prepareWord ).join( ' ' );
            });
        }
        else {
            return prepareWord( text );
        }
    };

    Syllabifier.prototype.syllabifyWord = function (word, hyphen) {
        const exception = Object.keys( this.exceptions ).find( exception => this._isException( word, exception ));
        if (exception) {
            return this._formatException( word, exception, this.exceptions[ exception ], hyphen );
        }

        const vowels = [ 'a', 'o', 'u', 'i', 'e', 'ä', 'ö', 'y' ];
        const consonants = [ 'b', 'c', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'm',
                            'n', 'p', 'q', 'r', 's', 't', 'v', 'w', 'x', 'z' ];
        const diftongs = [ 'ai', 'ei', 'oi', 'ui', 'yi', 'äi', 'öi', 'au', 'eu',
                            'iu', 'ou', 'ey', 'iy', 'äy', 'öy', 'ie', 'uo', 'yö' ];

        const getType = c => vowels.includes( c ) ? 'V' : ( consonants.includes( c ) ? 'C' : '_' );

        const result = [];

        let hasVowel = false;
        for (let i = word.length - 1; i >= 0; i--) {
            let separate = false;
            const char = word[i];
            const type = getType( char );
            if (type === 'V') {
                if (i < word.length - 1) {
                    const charPrevious = word[ i + 1 ];
                    const typePrevious = getType( charPrevious );
                    if (charPrevious !== char && typePrevious === type
                        && !diftongs.includes( char + charPrevious)) {
                        result.unshift( hyphen );
                    }
                }
                hasVowel = true;
            }
            else if (type === 'C' && hasVowel) {
                separate = i > 0;
                if (i === 1) {
                    const charNext = word[i - 1];
                    const typeNext = getType( charNext );
                    if (typeNext === type) {
                        separate = false;
                    }
                }
            }
            result.unshift( char );

            if (separate) {
                result.unshift( hyphen );
                hasVowel = false;
            }
        }

        return result.join('');
    }

    Syllabifier.prototype._isException = function( word, exception ) {
        return word.toLowerCase().indexOf( exception ) >= 0;
    }

    Syllabifier.prototype._formatException = function( word, exception, syllabified, hyphen ) {
        const start = word.toLowerCase().indexOf( exception );
        const length = exception.length;
        const prefix = word.substr( 0, start );
        const postfix = word.substr( start + length );
        const chars = Array.from( syllabified );

        for (let i = start, j = 0; i < start + length; i++) {
            let c = word.charAt( i );
            if (c === c.toUpperCase()) {
                chars[j] = c;
            }

            while (chars[ ++j ]=== this.hyphen) { }
        }

        let result = chars.join('');
        if (this.hyphen !== hyphen) {
            const re = new RegExp( this.hyphen, 'g' );
            result = result.replace( re, hyphen );
        }

        return prefix + result + postfix;
    }

    function getWordFromElement( element ) {
        const textNodes = Array.from( element.childNodes ).filter( node =>
            node.nodeType === Node.TEXT_NODE ||
            !node.classList.contains( 'hyphens' )
        );
        return textNodes[0].textContent.trim();
    }

    // test
    // syllabified.forEach( line => line.forEach( word => { console.log(word); } ));
    //console.log( new Syllabifier({}).syllabifyWord( 'WeeGee:ssä.', '-' ) );
    //console.log( new Syllabifier({}).syllabifyWord( '"Unien', '-' ) );

    // export

    app.Syllabifier = Syllabifier;

})( this.Reading || module.exports );
