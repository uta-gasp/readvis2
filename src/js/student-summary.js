// Requires:

(function( app ) { 'use strict';

    // Real-time visualization constructor
    // Arguments:
    //      options: {
    //          container    - selecotr of the table
    //      }
    function StudentSummary( options ) {

        this._container = document.querySelector( options.container );
        this._statistics = [
            'Sessions',
            'Reading time',
            'Seconds per word',
            'Fixation, ms',
            'Hyphenations',
        ];

        app.Visualization.call( this, options );

        this.options = {
            id: 'student-summary',
            title: 'Student summary',
            update: this.update.bind( this ),
            options: app.Visualization.createOptions({
            }, this )
        };

        this._users = null;
        this._grade = null;
    }

    app.loaded( () => { // we have to defer the prototype definition until the Visualization mudule is loaded

    StudentSummary.prototype = Object.create( app.Visualization.prototype );
    StudentSummary.prototype.base = app.Visualization.prototype;
    StudentSummary.prototype.constructor = StudentSummary;

    StudentSummary.prototype._fillCategories = function( list, users ) {
        const userData = [];
        users.forEach( userSnapshot => {
            const user = userSnapshot.val();
            user.name = this._hideIdentity( userSnapshot.key );
            userData.push( user );
        });

        const gradeUsers = this._classifyUsersByGrade( userData );

        for (let grade in gradeUsers) {
            const option = this._addOption( list, grade, grade, gradeUsers[ grade ] );
            if (this._grade === grade) {
                option.selected = true;
            }
        }

        return 'Select students';
    };

    // StudentSummary.prototype._fillSessions = function( list, users ) {
    //     users.forEach( userSnapshot => {
    //         const userName = userSnapshot.key;
    //         const user = userSnapshot.val();
    //         user.name = userName;
    //         const option = this._addOption( list, userName, userName, user );
    //     });
    // };

    StudentSummary.prototype._load = function( cbLoaded, id, users, grade ) {

        const textIDs = new Map();
        const sessionPromises = [];

        this._grade = grade;

        users.forEach( (user, id) => {
            for (let session in user.sessions) {
                const sessionMeta = user.sessions[ session ];
                sessionMeta.user = user.name;
                sessionPromises.push( this._loadSession( session, sessionMeta ) );
                if (!textIDs.has( sessionMeta.text )) {
                    textIDs.set( sessionMeta.text, this._loadText( sessionMeta.text, sessionMeta.textTitle ) );
                }
            }
        });

        const textPromises = Array.from( textIDs.values() );
        Promise.all( [...textPromises, ...sessionPromises] ).then( records => {

            users.forEach( (user, userID) => {
                for (let sessionID in user.sessions) {
                    const sessionData = this._sessions[ sessionID ];
                    if (!sessionData) {
                        console.error( `No session data ${sessionID} for ${userID}` );
                        continue;
                    }

                    const sessionMeta = user.sessions[ sessionID ];
                    sessionMeta.data = sessionData;

                    for (let textID in this._texts) {
                        if (+textID === +sessionMeta.text) {
                            sessionMeta.pages = this._texts[ textID ];
                            break;
                        }
                    }
                }
            });

            this._users = users;

            this._setCloseCallback( () => {
                this._container.classList.add( 'invisible' );
            });

            this._show();

            if (cbLoaded) {
                cbLoaded();
            }

        }).catch( reason => {
            this._users = null;
            window.alert( reason );
        });
    };

    StudentSummary.prototype._show = function() {
        if (!this._users.size) {
            return;
        }

        const ctx = this._getCanvas2D();
        this._setTitle( `${this._users.size} students` );

        const table = this._container.querySelector( 'table' );
        table.innerHTML = '';

        this._users.forEach( user => {
            const row = table.insertRow();
            const cell = row.insertCell();
            cell.textContent = user.name;

            user.statistics = this._getUserStatistics( user );
            user.statistics.forEach( (stat, si) => {
                const cell = row.insertCell();
                if (si === 1) {
                    cell.textContent = `${(stat / 60).toFixed(0)}:${secondsToString( stat % 60 )}`;
                }
                else {
                    cell.textContent = stat;
                }
            });
        });

        const header = table.createTHead();
        const footer = table.createTFoot();
        const headerRow = header.insertRow();
        const footerRow = footer.insertRow();
        headerRow.insertCell();
        footerRow.insertCell();

        this._statistics.forEach( stat => {
            const header = headerRow.insertCell();
            header.textContent = stat;
            header.addEventListener( 'click', e => {
                const sortDirection = this._updateTableHeader( table, e.target.cellIndex );
                this._sortTable( table, e.target.cellIndex - 1, sortDirection );
            });
        });

        table.scrollTop = 0;

        this._container.classList.remove( 'invisible' );
    };

    StudentSummary.prototype._updateTableHeader = function( table, sortedColumn ) {
        const cells = table.tHead.rows[0].cells;
        let currentSortDirection = 0;
        if (cells[ sortedColumn ].classList.contains( 'up' )) {
            currentSortDirection = 1;
        }
        else if (cells[ sortedColumn ].classList.contains( 'down' )) {
            currentSortDirection = -1;
        }

        for (let i = 0; i < cells.length; i++) {
            cells[i].classList.remove( 'sorted' );
            cells[i].classList.remove( 'up' );
            cells[i].classList.remove( 'down' );
        }
        cells[ sortedColumn ].classList.add( 'sorted' );
        cells[ sortedColumn ].classList.add( currentSortDirection < 1 ? 'up' : 'down' );

        return currentSortDirection < 1 ? 1 : -1;
    };

    StudentSummary.prototype._sortTable = function( table, statIndex, sortDirection ) {
        const users = [];
        this._users.forEach( user => {
            users.push( user );
        });

        users.sort( (a, b) => {
            return sortDirection > 0 ?
                b.statistics[ statIndex ] - a.statistics[ statIndex ] :
                a.statistics[ statIndex ] - b.statistics[ statIndex ] ;
        });

        const rows = table.tBodies[0].rows;
        users.forEach( (user, index) => {
            const row = rows[ index ];
            row.cells[0].textContent = user.name;

            user.statistics.forEach( (stat, si) => {
                const cell = row.cells[ si + 1 ];
                if (si === 1) {
                    cell.textContent = `${(stat / 60).toFixed(0)}:${secondsToString( stat % 60 )}`;
                }
                else {
                    cell.textContent = stat;
                }
            });
        });
    };

    StudentSummary.prototype._getUserStatistics = function( user ) {
        const result = [];

        const userSessions = Object.values( user.sessions );
        result.push( userSessions.length );

        let duration = 0;
        let sessionCount = 0;
        let wordCount = 0;
        let fixations = {
            count: 0,
            duration: 0,
            hyphenations: 0
        };

        userSessions.forEach( session => {
            const dataPages = session.data;
            const textPages = session.pages;

            let lastPage;
            for (let i = dataPages.length - 1; i>= 0; i--) {
                const page = dataPages[i];
                if (page.fixations) {
                    lastPage = page;
                    break;
                }
            }

            if (!lastPage) {
                return;
            }

            const lastFixation = lastPage.fixations[ lastPage.fixations.length - 1 ];
            duration += lastFixation.tsSync + lastFixation.duration;

            wordCount += textPages.reduce( (acc, page) => {
                return acc + page.length;
            }, 0);

            fixations = dataPages.reduce( (acc, page) => {
                return {
                    count: acc.count + page.fixations.length,
                    duration: acc.duration + page.fixations.reduce( (sum, fix) => (sum + fix.duration), 0 ),
                    hyphenations: acc.hyphenations + (page.syllabifications ? page.syllabifications.length : 0)
                };
            }, fixations);

            sessionCount++;
        });

        const totalDuration = new Date( 0, 0, 0, 0, 0, Math.round( duration / 1000 ) );

        result.push( totalDuration.getMinutes() * 60 + totalDuration.getSeconds() );
        result.push( (duration / wordCount / 1000).toFixed(2) );
        result.push( Math.round( fixations.duration / fixations.count ) );
        result.push( fixations.hyphenations / userSessions.length );

        return result;
    };

    }); // end of delayed call

    function secondsToString( seconds ) {
        let text = '' + seconds;
        if (text.length < 2) {
            text = '0' + text;
        }
        return text;
    }

    app.StudentSummary = StudentSummary;

})( window.ReadVis2 );
