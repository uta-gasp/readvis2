(function (app) { 'use strict';

    var Colors = { };

    // 'colors' is an array of {color: #XXX or #XXXXXX, weight: real}
    Colors.mix = function( colors ) {
        var c = 0;
        var m = 0;
        var y = 0;
        var k = 0;
        var w = 0;
        for ( var i = 0; i < colors.length; i += 1 )
        {
            var color = rgb2cmyk( colors[ i ].color );
            var weight = colors[ i ].weight;
            c += color.c * weight;
            m += color.m * weight;
            y += color.y * weight;
            k += color.k * weight;
            w += weight;
        }
        var cmyk = {
            c: c / w,
            m: m / w,
            y: y / w,
            k: k / w
        };
        var result = cmyk2rgb( cmyk );
        return result;
    };

    // color is a string of #XXX or #XXXXXX}
    Colors.rgb2rgba = function( color, alpha ) {
        var cmyk = rgb2cmyk( color );
        
        var r = cmyk.c * (1.0 - cmyk.k) + cmyk.k;
        var g = cmyk.m * (1.0 - cmyk.k) + cmyk.k;
        var b = cmyk.y * (1.0 - cmyk.k) + cmyk.k;
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

        var compLength = color.length === 3 ? 1 : 2;
        var r = parseInt( clone( color.substr( 0 * compLength, compLength ), 3 - compLength), 16 );
        var g = parseInt( clone( color.substr( 1 * compLength, compLength ), 3 - compLength), 16 );
        var b = parseInt( clone( color.substr( 2 * compLength, compLength ), 3 - compLength), 16 );
        var c = 255 - r;
        var m = 255 - g;
        var y = 255 - b;
        var k = Math.min( c, m, y );
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
        var r = color.c * (1.0 - color.k) + color.k;
        var g = color.m * (1.0 - color.k) + color.k;
        var b = color.y * (1.0 - color.k) + color.k;
        r = Math.round( (1.0 - r) * 255.0 + 0.5 );
        g = Math.round( (1.0 - g) * 255.0 + 0.5 );
        b = Math.round( (1.0 - b) * 255.0 + 0.5 );
        return '#' + decToHex( r ) + decToHex( g ) + decToHex( b );
    }

    function decToHex( aNum, aPadding ) {
        var hex = Number( aNum ).toString( 16 );
        aPadding = !aPadding && aPadding !== 0 ? 2 : aPadding;

        while (hex.length < aPadding) {
            hex = '0' + hex;
        }

        return hex;
    }

    function clone( str, count ) {
        var result = '';
        for (var i = 0; i < count; i += 1) {
            result += str;
        }
        return result;
    }

    app.Colors = Colors;

})( this.Reading || module.exports );
