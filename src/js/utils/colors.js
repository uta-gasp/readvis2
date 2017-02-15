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

})( this.ReadVis2 || module.exports );
