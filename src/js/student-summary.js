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
        ];

        app.Visualization.call( this, options );

        this._users = null;
    }

    app.loaded( () => { // we have to defer the prototype definition until the Visualization mudule is loaded

    StudentSummary.prototype = Object.create( app.Visualization.prototype );
    StudentSummary.prototype.base = app.Visualization.prototype;
    StudentSummary.prototype.constructor = StudentSummary;

    StudentSummary.prototype._fillCategories = function( list, users ) {
        const userData = [];
        users.forEach( userSnapshot => {
            const user = userSnapshot.val();
            user.name = userSnapshot.key;
            userData.push( user );
        });

        const gradeUsers = this._classifyUsersByGrade( userData );

        for (let grade in gradeUsers) {
            this._addOption( list, grade, grade, gradeUsers[ grade ] );
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

    StudentSummary.prototype._load = function( cbLoaded, id, users, title ) {

        const textIDs = new Map();
        const sessionPromises = [];

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
                        if (textID == sessionMeta.text) {
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
        this._drawTitle( ctx, `${this._users.size} users` );

        const table = this._container.querySelector( 'table' );
        table.innerHTML = '';

        this._users.forEach( user => {
            const row = table.insertRow();
            const cell = row.insertCell();
            cell.textContent = user.name;

            const userStatistics = this._getUserStatistics( user );
            userStatistics.forEach( stat => {
                const cell = row.insertCell();
                cell.textContent = stat;
            });
        });

        const header = table.createTHead();
        const footer = table.createTFoot();
        const headerRow = header.insertRow();
        const footerRow = footer.insertRow();
        headerRow.insertCell();
        footerRow.insertCell();

        this._statistics.forEach( stat => {
            headerRow.insertCell().textContent = stat;
        });

        table.scrollTo( 0, 0 );

        this._container.classList.remove( 'invisible' );
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
            duration: 0
        };

        userSessions.forEach( session => {
            const dataPages = session.data;

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

            wordCount += session.pages.reduce( (acc, page) => {
                return acc + page.length;
            }, 0);

            fixations = session.data.reduce( (acc, page) => {
                return {
                    count: acc.count + page.fixations.length,
                    duration: acc.duration + page.fixations.reduce( (sum, fix) => (sum + fix.duration), 0 )
                };
            }, fixations);

            sessionCount++;
        });

        const totalDuration = new Date( 0, 0, 0, 0, 0, Math.round( duration / 1000 ) );
        result.push( `${totalDuration.getMinutes()}:${totalDuration.getSeconds()}` );
        result.push( (duration / wordCount / 1000).toFixed(2) );
        result.push( Math.round( fixations.duration / fixations.count ) );

        return result;
    }

    }); // end of delayed call

    app.StudentSummary = StudentSummary;

})( this.ReadVis2 || module.exports );
