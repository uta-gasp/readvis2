(function (app) { 'use strict';

    var WordSplit = {};

    WordSplit.syllables = function (word) {
        var result = [];
        var syllable = '';
        var chain = '';
        word = word.toLowerCase( word );

        var isVowel = vowel => { return c === vowel; };

        var isMatchingSyllableBound = (bound, index) => {   // then search for the matching bound
//console.log('--- bound check ---' );
            var isMatching = chain.endsWith( bound[2] );
//console.log(bound[2], isMatching);
            if (isMatching && index === 3) {         // cannot be diftong or long vowel
                var s = syllable.substr( -2, 2 );
                if (s[0] === s[1]) {
                    isMatching = false;
//console.log('    cancel - this is long vowel');
                }
                else if (DIFTONGS.some( diftong => { return s === diftong; } )) {
                    isMatching = false;
//console.log('    cancel - this is diftong');
                }
            }
            return isMatching;
        };

        for (var i = 0; i < word.length; i += 1) {
            var c = word[i];
            syllable +=c;

            var charType = VOWELS.some( isVowel ) ? VOWEL : CONSONANT;
            chain += charType;
//console.log(chain, ':', syllable);
            if (charType === VOWEL && chain.length > 1) {            // when there are at least 2 chars, and the lst one is vowel,
                var boundIndex = bounds.findIndex( isMatchingSyllableBound );
                if (boundIndex >= 0) {
                    var newSyllableLength = bounds[ boundIndex ][1].length;
//console.log(newSyllableLength);
                    result.push( syllable.substr( 0, syllable.length - newSyllableLength ) );
//console.log('syllable found:', syllable.substr( 0, syllable.length - newSyllableLength ));
                    syllable = syllable.substr( -newSyllableLength, newSyllableLength );
//console.log('   text left:', syllable);
                    chain = chain.substr( -newSyllableLength, newSyllableLength );
//console.log('   chain left:', chain);
                }
            }
        }
        
        result.push( syllable );
//console.log('   text left:', syllable);

        return result;
    };

    const VOWEL = 'v';
    const CONSONANT = 'c';

    const VOWELS = [ 'a', 'o', 'u', 'i', 'e', 'ä', 'ö', 'y' ];
    const DIFTONGS = [
        'ai', 'ei', 'oi', 'ui', 'yi', 'äi', 'öi', 
        'au', 'eu', 'iu', 'ou',
        'äy', 'ey', 'iy', 'öy',
        'ie', 'uo', 'yö'
    ];
    var bounds = [
        [ VOWEL, CONSONANT+VOWEL ],
        [ VOWEL+CONSONANT, CONSONANT+VOWEL ],
        [ VOWEL+CONSONANT+CONSONANT, CONSONANT+VOWEL ],
        [ VOWEL, VOWEL ]
    ];

    bounds.forEach( item => {
        item.push( item[0] + item[1] );
    });

    app.WordSplit = WordSplit;
    
})( this.Reading || module.exports );
