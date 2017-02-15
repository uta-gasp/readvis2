(function (app) {

    const Logger = {
        enabled: true
    };

    Logger.moduleErrorPrinter = function( moduleName ) {
        if (this.ReadVis2 !== undefined) {
            return () => { };
        }

        return missingService => {
            console.error( 'Missing "${missingService}" service for "${moduleName}"' );
        };
    };

    Logger.moduleLogPrinter = function( moduleName ) {
        const print = item => {
            console.log( item );
        };

        if (this.ReadVis2 !== undefined) {
            return () => { };
        }

        return (title, ...params) => {
            if (!Logger.enabled) {
                return;
            }

            console.log( '\n', moduleName );
            console.log( title );
            params.forEach( param => {
                if (param === undefined) {
                    return;
                }
                if (param instanceof Array) {
                    param.forEach( print );
                }
                else {
                    console.log( param );
                }
            });
        };
    };

    Logger.forModule = (moduleName) => {
        // if (this.ReadVis2 !== undefined) {
        //     return () => { };
        // }

        return {
            start: title => {
                return new Record( moduleName, title );
            },
            end: record => {
                records.delete( record.id );
            },
            log: (...params) => {
                if (!Logger.enabled) {
                    return;
                }
                console.log( moduleName, params );
            }
        };
    };

    function Record( module, title ) {
        this.id = Symbol( title );
        this._record = []; //title ? [ title ] : [];
        this.level = 0;

        this.generalPadding = '';
        for (let i = 0; i < records.size; i += 1) {
            this.generalPadding += Record.padding;
        }

        records.set( this.id, this );

        if (!Logger.enabled) {
            return;
        }

        console.log( '' + this.generalPadding + module );

        if (title) {
            console.log( Record.padding + this.generalPadding + title );
        }
    }

    Record.padding = '    ';

    Record.prototype.push = function() {
        let levelPadding = '';
        for (let i = 0; i < this.level; i += 1) {
            levelPadding += Record.padding;
        }
        //this._record.push( padding + Array.prototype.join.call( arguments, ' ' ) );
        if (!Logger.enabled) {
            return;
        }
        console.log( Record.padding + this.generalPadding + levelPadding + Array.prototype.join.call( arguments, ' ' ) );
    };

    Record.prototype.levelUp = function( text ) {
        if (text !== undefined) {
            this.push( text );
        }
        this.level += 1;
    };

    Record.prototype.levelDown = function() {
        this.level -= 1;
        if (this.level < 0) {
            this.level = 0;
        }
    };

    Record.prototype.notEmpty = function() {
        return this._record.length > 0;
    };

    Record.prototype.print = function() {
        if (!Logger.enabled) {
            return;
        }
        console.log( Record.padding + this.generalPadding + this._record.join( '\n' + Record.padding ) );
    };

    const records = new Map();

    app.Logger = Logger;

})( this.ReadVis2 || module.exports );