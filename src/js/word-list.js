(function( app ) { 'use strict';

	// Word statistic list
    // Arguments:
    //      options: {
    //          container   - container selector
    function WordList( options ) {
        this._container = document.querySelector( options.container );
        this._words = new Map();

        const close = app.Visualization.root.querySelector( '.close' );
        close.addEventListener( 'click', e => {
            this._container.classList.add( 'invisible' );
        });

        const drowpdown = this._container.querySelector( '.button' );
        const table = this._container.querySelector( '.table' );
        drowpdown.addEventListener( 'click', e => {
            drowpdown.classList.toggle( 'dropped' );
            table.classList.toggle( 'invisible' );
        });
    }

    WordList.instance = null;
    WordList.Units = {
    	MS: 'ms',
    	PERCENTAGE: '%'
    };

    WordList.prototype.show = function() {
		this._container.classList.remove( 'invisible' );
    };

    WordList.prototype.clear = function() {
        this._words = new Map();
    };

    // words: Map
    // options: {
    //		units (String): [ms, %] = ms,
    //      preserve (bool) = false
    //      hyphen (Char) = '-'
    // }
    WordList.prototype.fill = function( words, options = {} ) {
        if (!words) {
            return;
        }

        if (!options.preserve) {
            this._words = new Map();
        }

        const hyphen = options.hyphen || '-';

        const table = this._container.querySelector( '.table' );
        table.innerHTML = '';

        let totalDuration = 0;
        const hyphenRegExp = new RegExp( `${hyphen}`, 'g' );
        const descending = (a, b) => b[1].duration - a[1].duration;
        words.forEach( word => {
            let id = word.id;
            if (id === undefined) {
                id = '' + Math.floor( word.rect.x / 10 ) + '_' + Math.floor( word.rect.y / 10 );
                //console.log( 'new id', id);
            }

            let w = this._words.get( id );
            if (!w) {
                w = Object.assign( {}, word );
                w.text = w.text.replace( hyphenRegExp, '');
                this._words.set( id, w );
            }
            else {
                w.duration += word.duration;
            }

            totalDuration += w.duration;
        });

        this._words = new Map( [...this._words.entries()].sort( descending ) );

        const units = options.units || WordList.Units.MS;

        this._words.forEach( word => {
        	let value = word.duration;
        	if (units === WordList.Units.MS) {
        		value = Math.round( value );
        	}
        	else if (units === WordList.Units.PERCENTAGE) {
        		value = (100 * value / totalDuration).toFixed(1) + '%';
        	}

            const wordItem = document.createElement( 'span' );
            wordItem.classList.add( 'word' );
            wordItem.textContent = word.text;

            const durationItem = document.createElement( 'span' );
            durationItem.classList.add( 'duration' );
            durationItem.textContent = value;

            const record = document.createElement( 'div' );
            record.classList.add( 'record' );
            record.appendChild( wordItem );
            record.appendChild( durationItem );

            table.appendChild( record );
        });
    };

    app.WordList = WordList;

})( window.ReadVis2 );
