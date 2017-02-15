(function( app ) { 'use strict';

    const _hyphen = String.fromCharCode( 0x00B7 );//DOTS: 00B7 2010 2022 2043 LINES: 2758 22EE 205E 237F

    const _exceptions = (function( h ) {
        return {
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
    })( _hyphen );

    const _vowels = [ 'a', 'o', 'u', 'i', 'e', 'ä', 'ö', 'y' ];
    const _consonants = [ 'b', 'c', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'm',
                        'n', 'p', 'q', 'r', 's', 't', 'v', 'w', 'x', 'z' ];
    const _diftongs = [ 'ai', 'ei', 'oi', 'ui', 'yi', 'äi', 'öi', 'au', 'eu',
                        'iu', 'ou', 'ey', 'iy', 'äy', 'öy', 'ie', 'uo', 'yö' ];

    const Syllabifier = {
        clean: function( word, hyphen ) {
            const h = hyphen || _hyphen;
            const hyphenRegExp = new RegExp( `${h}`, 'g' );
            return word.replace( hyphenRegExp, '');
        },

        syllables: function( word ) {
            const exception = Object.keys( _exceptions ).find( exception => isException( word, exception ));
            if (exception) {
                return exceptionSyllables( word, exception, _exceptions[ exception ] );
            }

            const result = [];
            let str = '';

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
                            && !_diftongs.includes( char + charPrevious)) {
                            if (str) {
                                result.unshift( str );
                            }
                            str = '';
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

                str = char + str;

                if (separate) {
                    result.unshift( str );
                    str = '';
                    hasVowel = false;
                }
            }

            if (str) {
                result.unshift( str );
            }

            return result;
        },

        syllabify: function( word, hyphen ) {
            const h = hyphen || _hyphen;
            const cleanWord = Syllabifier.clean( word, h );
            return Syllabifier.syllables( cleanWord ).join( h );
        },

        getPrefixAndSuffix: function( word, hyphen ) {
            const chars = Array.from( word );
            const prefix = [];
            const postfix = [];

            let i = 0;
            while (i < chars.length && chars[i++] === hyphen) { prefix.push( hyphen ); }
            i = chars.length - 1;
            while (i >= 0 && chars[i--] === hyphen) { postfix.push( hyphen ); }

            return [ prefix.join(''), postfix.join('') ];
        }
    };

    function getType( c ) {
        return _vowels.includes( c ) ? 'V' : ( _consonants.includes( c ) ? 'C' : '_' );
    }

    function isException( word, exception ) {
        return word.toLowerCase().indexOf( exception ) >= 0;
    }

    function exceptionSyllables( word, exception, syllabified ) {
        const start = word.toLowerCase().indexOf( exception );
        const length = exception.length;
        const prefix = word.substr( 0, start );
        const postfix = word.substr( start + length );
        const chars = Array.from( syllabified );

        const result = [];
        let str = '';

        for (let i = start, j = 0; i < start + length; i++) {
            let c = word.charAt( i );
            if (c === c.toUpperCase()) {
                chars[j] = c;
            }

            str += chars[j];

            while (chars[ ++j ] === _hyphen) {
                if (str) {
                    result.push( str );
                }
                str = '';
            }
        }

        if (str) {
            result.push( str );
        }

        result[0] = prefix + result[0];
        result[ result.length - 1 ] = result[ result.length - 1 ] + postfix;

        return result;
    }

    function formatException( word, exception, syllabified, hyphen ) {
        return exceptionSyllables( word, exception, syllabified ).join( hyphen );
    }

    // export

    app.Syllabifier = Syllabifier;

})( this.ReadVis2 || module.exports );
