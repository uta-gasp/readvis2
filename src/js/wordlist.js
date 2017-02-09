(function (app) { 'use strict';

	// Word statistic list
    // Arguments:
    //      options: {
    //          container   - container selector
    function WordList (options) {
        this._container = document.querySelector( options.container );

        this.hyphen = '-';

        const close = app.Visualization.root.querySelector( '.close' );
        close.addEventListener( 'click', () => {
            this._container.classList.add( 'invisible' );
        });

        const drowpdown = this._container.querySelector( '.button' );
        const table = this._container.querySelector( '.table' );
        drowpdown.addEventListener( 'click', () => {
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
    }

    // Options: {
    //		units (String): [ms, %]
    // }
    WordList.prototype.fill = function( words, options = {} ) {
        const table = this._container.querySelector( '.table' );
        table.innerHTML = '';

        const hyphenRegExp = new RegExp( `${this.hyphen}`, 'g' );
        const descending = (a, b) => b.duration - a.duration;
        words = words.map( word => {
            const w =  Object.assign( {}, word );
            w.text = w.text.replace( hyphenRegExp, '');
            return w;
        }).sort( descending );

        const units = options.units || WordList.Units.MS;
        const totalDuration = words.reduce( (sum, word) => (sum + word.duration), 0);

        words.forEach( word => {
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
    }

    app.WordList = WordList;

})( this.Reading || module.exports );
