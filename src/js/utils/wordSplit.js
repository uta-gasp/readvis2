(function (app) { 'use strict';

    const WordSplit = {};

    WordSplit.syllables = function (word) {
        const result = [];
        let syllable = '';
        let chain = '';
        word = word.toLowerCase( word );

        const isVowel = vowel => { return c === vowel; };

        const isMatchingSyllableBound = (bound, index) => {   // then search for the matching bound
//console.log('--- bound check ---' );
            let isMatching = chain.endsWith( bound[2] );
//console.log(bound[2], isMatching);
            if (isMatching && index === 3) {         // cannot be diftong or long vowel
                const s = syllable.substr( -2, 2 );
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

        for (let i = 0; i < word.length; i += 1) {
            const c = word[i];
            syllable +=c;

            const charType = VOWELS.some( isVowel ) ? VOWEL : CONSONANT;
            chain += charType;
//console.log(chain, ':', syllable);
            if (charType === VOWEL && chain.length > 1) {            // when there are at least 2 chars, and the lst one is vowel,
                const boundIndex = bounds.findIndex( isMatchingSyllableBound );
                if (boundIndex >= 0) {
                    const newSyllableLength = bounds[ boundIndex ][1].length;
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

    const bounds = [
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
