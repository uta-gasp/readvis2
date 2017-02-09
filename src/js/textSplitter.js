(function (app) { 'use strict';

    // Text splitting into words routine
    // Constructor arguments:
    //      options: {
    //          root:       - selector for the element that contains text for reading
    //      }
    //      services: {
    //          prepareForSyllabification:  - enlarges a word to compensate for word syllabification
    //      }
    function TextSplitter( options, services ) {
        this.root = options.root || document.documentElement;

        _services = services;

        this.wordClass = 'word';
    }

    // Splits the text nodes into words, each in its own span.word element
    TextSplitter.prototype.split = function () {

        var re = /[^\s]+/gi;

        var nodeIterator = document.createNodeIterator(
            document.querySelector( this.root ),
            NodeFilter.SHOW_TEXT,
            { acceptNode: node => {
                if ( ! /^\s*$/.test( node.data ) ) {
                    return NodeFilter.FILTER_ACCEPT;
                }
                return NodeFilter.FILTER_REJECT;
            }}
        );

        // Show the content of every non-empty text node that is a child of root
        var node;
        var docFrags = [];

        while ((node = nodeIterator.nextNode())) {

            var word;
            var index = 0;
            var docFrag = document.createDocumentFragment();

            while ((word = re.exec( node.textContent )) !== null) {

                if (index < word.index) {
                    var space = document.createTextNode( node.textContent.substring( index, word.index ) );
                    docFrag.appendChild( space );
                }

                var wordText = _services.prepareForSyllabification( word[ 0 ] );

                var span = document.createElement( 'span' );
                span.classList.add( this.wordClass );
                span.innerHTML = wordText;
                docFrag.appendChild( span );

                index = re.lastIndex;
            }

            docFrags.push( {
                node: node,
                docFrag: docFrag
            });
        }

        docFrags.forEach( function (item) {
            item.node.parentNode.replaceChild( item.docFrag, item.node );
        });
    };

    // private
    var _services;

    // export

    app.TextSplitter = TextSplitter;

})( this.Reading || module.exports );
