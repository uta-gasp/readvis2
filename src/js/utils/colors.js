(function( app ) { 'use strict';

    const Colors = { };

    // 'colors' is an array of {color: #XXX or #XXXXXX, weight: real}
    Colors.mix = function( colors ) {
        let c = 0;
        let m = 0;
        let y = 0;
        let k = 0;
        let w = 0;
        for ( let i = 0; i < colors.length; i += 1 )
        {
            const color = rgb2cmyk( colors[ i ].color );
            const weight = colors[ i ].weight;
            c += color.c * weight;
            m += color.m * weight;
            y += color.y * weight;
            k += color.k * weight;
            w += weight;
        }
        const cmyk = {
            c: c / w,
            m: m / w,
            y: y / w,
            k: k / w
        };
        return cmyk2rgb( cmyk );
    };

    // color is a string of #XXX or #XXXXXX}
    Colors.rgb2rgba = function( color, alpha ) {
        const cmyk = rgb2cmyk( color );

        let r = cmyk.c * (1.0 - cmyk.k) + cmyk.k;
        let g = cmyk.m * (1.0 - cmyk.k) + cmyk.k;
        let b = cmyk.y * (1.0 - cmyk.k) + cmyk.k;
        r = Math.round( (1.0 - r) * 255.0 );
        g = Math.round( (1.0 - g) * 255.0 );
        b = Math.round( (1.0 - b) * 255.0 );
        return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
    };


    Colors.colors = [
        '#5DA5DA',
        '#FAA43A',
        '#60BD68',
        '#F17CB0',
        '#B2912F',
        '#B276B2',
        '#DECF3F',
        '#4D4D4D',
        '#F15854',

        // '#FF0000',
        // '#00FF00',
        // '#0000FF',
        // '#FFFF00',
        // '#FF00FF',
        // '#00FFFF',
        // '#800000',
        // '#008000',
        // '#000080',
        // '#808000',
        // '#800080',
        // '#008080',
        // '#C0C0C0',
        // '#808080',
        // '#9999FF',
        // '#993366',
        // '#FFFFCC',
        // '#CCFFFF',
        // '#660066',
        // '#FF8080',
        // '#0066CC',
        // '#CCCCFF',
        // '#000080',
        // '#FF00FF',
        // '#FFFF00',
        // '#00FFFF',
        // '#800080',
        // '#800000',
        // '#008080',
        // '#0000FF',
        // '#00CCFF',
        // '#CCFFFF',
        // '#CCFFCC',
        // '#FFFF99',
        // '#99CCFF',
        // '#FF99CC',
        // '#CC99FF',
        // '#FFCC99',
        // '#3366FF',
        // '#33CCCC',
        // '#99CC00',
        // '#FFCC00',
        // '#FF9900',
        // '#FF6600',
        // '#666699',
        // '#969696',
        // '#003366',
        // '#339966',
        // '#003300',
        // '#333300',
        // '#993300',
        // '#993366',
        // '#333399',
        // '#333333',
    ];

    // ------------------------------------------------------
    // Private
    // ------------------------------------------------------

    function rgb2cmyk( color ) {
        color = color.substr( 1 );

        const compLength = color.length === 3 ? 1 : 2;
        const r = parseInt( clone( color.substr( 0 * compLength, compLength ), 3 - compLength), 16 );
        const g = parseInt( clone( color.substr( 1 * compLength, compLength ), 3 - compLength), 16 );
        const b = parseInt( clone( color.substr( 2 * compLength, compLength ), 3 - compLength), 16 );
        let c = 255 - r;
        let m = 255 - g;
        let y = 255 - b;
        let k = Math.min( c, m, y );
        c = ((c - k) / (255 - k));
        m = ((m - k) / (255 - k));
        y = ((y - k) / (255 - k));

        return {
            c: c,
            m: m,
            y: y,
            k: k / 255
        };
    }

    function cmyk2rgb( color ) {
        let r = color.c * (1.0 - color.k) + color.k;
        let g = color.m * (1.0 - color.k) + color.k;
        let b = color.y * (1.0 - color.k) + color.k;
        r = Math.round( (1.0 - r) * 255.0 + 0.5 );
        g = Math.round( (1.0 - g) * 255.0 + 0.5 );
        b = Math.round( (1.0 - b) * 255.0 + 0.5 );
        return '#' + decToHex( r ) + decToHex( g ) + decToHex( b );
    }

    function decToHex( aNum, aPadding ) {
        let hex = Number( aNum ).toString( 16 );
        aPadding = !aPadding && aPadding !== 0 ? 2 : aPadding;

        while (hex.length < aPadding) {
            hex = '0' + hex;
        }

        return hex;
    }

    function clone( str, count ) {
        let result = '';
        for (let i = 0; i < count; i += 1) {
            result += str;
        }
        return result;
    }

    app.Colors = Colors;

})( window.ReadVis2 );
