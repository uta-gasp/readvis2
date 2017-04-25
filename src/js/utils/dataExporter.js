// Requires:

(function( app ) { 'use strict';

    app.DataExporter = {
        save: function (data, filename) {
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
        }
    };

})( window.ReadVis2 );
