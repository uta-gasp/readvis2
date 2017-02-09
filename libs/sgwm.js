var SGWM =
/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;
/******/
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ function(module, exports, __webpack_require__) {

	/*
	    Main class (and entry point), unites all the fuctionality
	*/
	'use strict';
	
	const FixationProcessor = __webpack_require__(1);
	const splitToProgressions = __webpack_require__(4);
	const TextModel = __webpack_require__(6);
	const ProgressionMerger = __webpack_require__(7);
	const WordMapper = __webpack_require__(10);
	
	const FixationProcessorSettings = __webpack_require__(2);
	const ProgressionMergerSettings = __webpack_require__(9);
	const SplitToProgressionsSettings = __webpack_require__(5);
	const WordMapperSettings = __webpack_require__(11);
	
	class SGWM {
		constructor( logger ) {
	        this.logger = logger;
		}
	
		// Arguments:
		//	data ({
		//		fixations (Array of Fixations)
	    //          Fixation = {ts, x, y, duration}
		//		words (Aarray of Word)
	    //          Word = {x, y, width, height, text, row:optional=<line ID starting form 1>}
		//	})
	    map( data ) {
	        let fixations = data.fixations;
	        const words = data.words;
	
	        if (!fixations || !words) {
	            return;
	        }
	
	        const text = new TextModel( data.words );
	
	        fixations = fixations.map( (fixation, i) => Object.assign( { id: i }, fixation ) );
	
	        const fixationProcessor = new FixationProcessor( this.logger );
	    	fixations = fixationProcessor.filterByLocation( fixations, text.box );
	    	fixations = fixationProcessor.filterByDuration( fixations );
	
	    	const progressions = splitToProgressions( fixations, text.lineHeight, text.interlineDistance );
	
			const merger = new ProgressionMerger( text.interlineDistance, this.logger );
	    	const fixationLines = merger.merge( progressions, text.lines );
	
		    const wordMapper = new WordMapper( this.logger );
		    wordMapper.map( fixationLines, text.lines );
		    wordMapper.clean( fixations, text.words );
	
	    	return { fixations, text };
	    }
	
	    static get FixationProcessorSettings() { return FixationProcessorSettings; }
	    static get ProgressionMergerSettings() { return ProgressionMergerSettings; }
	    static get SplitToProgressionsSettings() { return SplitToProgressionsSettings; }
	    static get WordMapperSettings() { return WordMapperSettings; }
	}
	
	module.exports = SGWM;

/***/ },
/* 1 */
/***/ function(module, exports, __webpack_require__) {

	/*
	    Reprocesses or filter out fixatins based on their properties
	*/
	'use strict';
	
	const FixationProcessorSettings = __webpack_require__(2);
	
	const settings = new FixationProcessorSettings();
	
	let log = () => {}; // Function( module, ...messages )
	
	class FixationProcessor {
	    // Arguments:
	    //   logger ({ log(...) }): optional logger
	    constructor( logger ) {
	        settings.load();
	
	        if (logger) {
	            logger.log( '. . . . . . . . .' );
	            log = (...params) => {
	                logger.log( 'FixationProcessor   ', ...params );
	            };
	        }
	    }
	
	    // Arguments
	    //   fixations (Array of Fixation)
	    //   textbox {left, right, top, bottom}
	    // Returns
	    //   new array with original fixations (Array of Fixation)
	    filterByLocation( fixations, textbox ) {
	        if (!settings.location.enabled || !textbox) {
	            return fixations;
	        }
	
	        const result = [];
	
	        for (let i = 0; i < fixations.length; i += 1) {
	            const fixation = fixations[i];
	            if (fixation.x > textbox.left - settings.location.marginX &&
	                    fixation.x < textbox.right + settings.location.marginX &&
	                    fixation.y > textbox.top - settings.location.marginY &&
	                    fixation.y < textbox.bottom + settings.location.marginY) {
	                result.push( fixation );
	            }
	        }
	
	        return result;
	    }
	
	    // Arguments:
	    //   fixations (Array of Fixation)
	    // Returns
	    //   new array of fixations
	    //   (the merged fixations have property "merged" = <number of merged fixations>)
	    filterByDuration( fixations ) {
	        if (!settings.duration.enabled) {
	            return fixations;
	        }
	
	        let fixationCount;
	        let result = fixations;
	
	        do {
	            fixationCount = result.length;
	            result = joinOrDeleteShortFixations( result );
	        } while (result.length !== fixationCount);
	
	        return result;
	    }
	}
	
	// Calculated distance between 2 fixations
	function dist( a, b ) {
	    return Math.sqrt( Math.pow( a.x - b.x, 2 ) + Math.pow( a.y - b.y, 2 ) );
	}
	
	// Joins 2 fixations, saves the result to the first fixation,
	// and adds property "merged" = <number of merged fixations>
	function join( a, b ) {
	    const totalDuration = a.duration + b.duration;
	    a.x = (a.x * a.duration + b.x * b.duration) / totalDuration;
	    a.y = (a.y * a.duration + b.y * b.duration) / totalDuration;
	    a.duration = totalDuration;
	    a.merged = (a.merged || 1) + (b.merged || 1);
	    log( 'joined', b.id, 'to', a.id );
	    return a;
	}
	
	// Tries to join the fixation
	// Arguments:
	//      fixation (Fixation)
	//      prev (Fixation)
	//      next (Fixation)
	// Returns
	//      true if the fixation was joined and the original instance should be removed
	function tryJoinFixation( fixation, prev, next ) {
	    const distToPrev = prev ? dist( fixation, prev ) : Number.MAX_VALUE;
	    const distToNext = next ? dist( fixation, next ) : Number.MAX_VALUE;
	    if (distToPrev < settings.duration.mergingDistanceThreshold || distToNext < settings.duration.mergingDistanceThreshold) {
	        if (distToNext < distToPrev) {
	            join( next, fixation );
	        }
	        else {
	            join( prev, fixation );
	        }
	        return true;
	    }
	    else if (fixation.duration < settings.duration.removingDurationThreshold) {
	        log( 'removed', fixation.id );
	        return true;
	    }
	
	    return false;
	}
	
	// Cycle all fixations and joins or deletes too short
	// Returns
	//   new sequence of fixations (Array of Fixation)
	function joinOrDeleteShortFixations( fixations ) {
	    const result = [];
	
	    let prevFix, prevPrevFix;
	    for (let i = 0; i < fixations.length; i += 1) {
	        const fixation = fixations[i];
	
	        if (prevFix && prevFix.duration < settings.duration.mergingDurationThreshold ) {
	            if (tryJoinFixation( prevFix, prevPrevFix, fixation )) {
	                result.pop();
	                prevFix = prevPrevFix;
	            }
	        }
	
	        result.push( fixation );
	
	        prevPrevFix = prevFix;
	        prevFix = fixation;
	    }
	
	    if (prevFix.duration < settings.duration.mergingDurationThreshold) {
	        if (tryJoinFixation( prevFix, prevPrevFix, null )) {
	          result.pop();
	        }
	    }
	
	    return result;
	}
	
	module.exports = FixationProcessor;


/***/ },
/* 2 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';
	
	const Settings = __webpack_require__(3);
	
	class FixationProcessorSettings extends Settings {
		constructor() {
			super( 'fixationProcessorSettings' );
			this._location = {
				enabled: false,
				marginX: 200,
				marginY: 200
			};
			this._duration = {
				enabled: false,
				mergingDistanceThreshold: 40,
				mergingDurationThreshold: 100,
				removingDurationThreshold: 80
			};
	
			super.load();
		}
	
		get location() { return this._location; }
		set location( value ) { this._location = value; }
		get duration() { return this._duration; }
		set duration( value ) { this._duration = value; }
	}
	
	module.exports = FixationProcessorSettings;

/***/ },
/* 3 */
/***/ function(module, exports) {

	/*
		Base class for settings
	*/
	'use strict';
	
	class Settings {
		// Arguments:
		//	 name (string): settings own namespace (without domain which is defined in the class)
		constructor( name ) {
			this._name = name;
			this._domain = 'sgwm';
	
			this._fullPath = function( name ) {
				return [ this._domain, this._name, name ].join( '_' );
			};
		}
	
		load() {
			const hiddenProps = Object.keys(new Settings(''));
	
			for (let p in this) {
				if (hiddenProps.indexOf( p ) > -1) {
					continue;
				}
				const value = JSON.parse( localStorage.getItem( this._fullPath( p ) ) );
				if (value !== null) {
					this[p] = value;
				}
			}
		}
	
		save() {
			const hiddenProps = Object.keys(new Settings(''));
	
			for (let p in this) {
				if (hiddenProps.indexOf( p ) > -1) {
					continue;
				}
				localStorage.setItem( this._fullPath( p ), JSON.stringify( this[p] ) );
			}
		}
	}
	
	module.exports = Settings;

/***/ },
/* 4 */
/***/ function(module, exports, __webpack_require__) {

	/*
		Create a set of chunks of progressive reading fixations
	*/
	'use strict';
	
	const SplitToProgressionsSettings = __webpack_require__(5);
	
	const settings = new SplitToProgressionsSettings();
	let progressionBox;
	
	const isProgressiveReadingSaccade = function( dx, dy ) {
		return (
			dx > progressionBox.left &&
			dx < progressionBox.right &&
			Math.abs( dy ) < progressionBox.vertical( dx )
		);
	};
	
	// Arguments:
	//   fixations (Array of Fixation)
	//   lineHeight (Number): word box height in pixels
	// Returns:
	//   A set of progresions which are the sequences of fixations (Array of (Array of Fixation))
	// Note:
	//   Fixations in the output are referencing to the fixations in the input (no copying)
	module.exports = function( fixations, lineHeight, interlineDistance ) {
	    settings.load();
	    progressionBox = settings.pixelBounds( lineHeight, interlineDistance );
	
	    const result = [];
	    let currentProgression;
	
	    const startNewProgression = function( fixation ) {
	        currentProgression = [ fixation ];
	        result.push( currentProgression );
	    };
	
	    let lastFix = fixations[0];
	    startNewProgression( lastFix );
	
	    for (let i = 1; i < fixations.length; i += 1) {
	        const fixation = fixations[i];
	        if (!isProgressiveReadingSaccade( fixation.x - lastFix.x, fixation.y - lastFix.y )) {
	            startNewProgression( fixation );
	        }
	        else {
	            currentProgression.push( fixation );
	        }
	        lastFix = fixation;
	    }
	
	    return result;
	};

/***/ },
/* 5 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';
	
	const Settings = __webpack_require__(3);
	
	class ProgressionSplitterSettings extends Settings {
		constructor() {
			super( 'progressionSplitterSettings' );
			this._bounds = {
				left: -0.5,
				right: 10,
				verticalChar: 1.5,	// in characters
				verticalLine: 0.65,	// in interline distances
			};
			this._angle = Math.sin( 15 * Math.PI / 180 );
	
			super.load();
		}
	
		get bounds() { return this._bounds; }
		set bounds( value ) { this._bounds = value; }
		get angle() { return this._angle; }
		set angle( value ) { this._angle = value; }
	
		pixelBounds( lineHeight, interlineDistance ) {
			const vertical = Math.min(
				this._bounds.verticalChar * lineHeight,
				this._bounds.verticalLine * interlineDistance
			);
	
			return {
				left: this._bounds.left * lineHeight,
				right: this._bounds.right * lineHeight,
				vertical: dx => vertical + dx * this._angle,
				_vertical: vertical
			};
		}
	}
	
	module.exports = ProgressionSplitterSettings;

/***/ },
/* 6 */
/***/ function(module, exports) {

	/*
		Creates an array lines, each as array of word boxes
	*/
	'use strict';
	
	class TextModel {
		// Arguments
		//	 words (Array of {x, y, width, height, text, row:optional=<line ID starting form 1>})
	    // Notes:
	    //   1. each word gets property "id" = <index in the text>
	    //   2. the words in "lines" and "wrods" properties are copied (and shared between these two properties)
		constructor( words ) {
	        const lines = [];
	        const wordList = [];
	        const box = {
	        	left: Number.MAX_VALUE,
	        	top: Number.MAX_VALUE,
	        	right: 0,
	        	bottom: 0
	        };
	
	        let currentLine;
	
	        const createNewLine = function( word ) {
	            currentLine = [ word ];
	            currentLine.id = word.row === undefined ? lines.length : word.row - 1;
	            currentLine.y = word.y;
	            lines.push( currentLine );
	        };
	
	        let currentY = Number.MIN_VALUE;
	        for (let i = 0; i < words.length; i += 1) {
	            const word = Object.assign( {}, words[i] );
	            wordList.push( word );
	
	            word.id = i;
	            if (word.x < box.left) { box.left = word.x; }
	            if (word.y < box.top) { box.top = word.y; }
	            if (word.x + word.width > box.right) { box.right = word.x + word.width; }
	            if (word.y + word.height > box.bottom) { box.bottom = word.y + word.height; }
	
	            if (word.y != currentY) {
	                currentY = word.y;
	                createNewLine( word );
	            }
	            else {
	                currentLine.push( word );
	            }
	        }
	
	        this._box = box;
	        this._lines = lines;
	        this._words = wordList;
	
	        this._lineHeight = lines[0][0].height;
	        this._interlineDistance = getInterlineDistance( lines );
		}
	
		get box() { return this._box; }
		get lines() { return this._lines; }
	    get words() { return this._words; }
		get lineHeight() { return this._lineHeight;	}
	    get interlineDistance() { return this._interlineDistance; }
	}
	
	function getInterlineDistance( lines ) {
	    let interlineDist = 9;
	    if (lines.length > 1) {
	        const interlineDists = [];
	        for (let i = 1; i < lines.length; i += 1) {
	            interlineDists.push( lines[i].y - lines[i - 1].y );
	        }
	        interlineDist = median( interlineDists );
	        /*/
	        for (let i = 1; i < textLines.length; i += 1) {
	            interlineDist += textLines[i].y - textLines[i - 1].y;
	        }
	        interlineDist = interlineDist / (textLines.length - 1);
	        */
	    }
	    else {
	        interlineDist = Number.MAX_VALUE;
	    }
	
	    return interlineDist;
	}
	
	function median( array ) {
	    if (array.length <= 5) {
	        return array[ Math.floor( array.length / 2 ) ];
	    }
	
	    const sets = new Array( Math.floor( array.length / 5 ) + (array.length % 5 ? 1 : 0) );
	    for (let i = 0; i < sets.length; i+=1) {
	        sets[i] = [];
	    }
	    for (let i = 0; i < array.length; i+=1) {
	        sets[ Math.floor( i / 5 ) ].push( array[i] );
	    }
	
	    let medians = [];
	    sets.forEach( set => {
	        set.sort( (a, b) => {
	            return a - b;
	        });
	        medians.push( set[ Math.floor( set.length / 2 ) ] );
	    });
	
	    return median( medians );
	}
	
	module.exports = TextModel;

/***/ },
/* 7 */
/***/ function(module, exports, __webpack_require__) {

	/*
	    Merges progressive reading fixations within the text lines
	*/
	'use strict';
	
	const regression = __webpack_require__(8);
	const ProgressionMergerSettings = __webpack_require__(9);
	
	const settings = new ProgressionMergerSettings();
	
	const SET_TYPE = {
	    LONG: 1,
	    SHORT: 2,
	    ANY: 3
	};
	
	let interlineDistance = 30;
	
	let log = () => {}; // Function( module, ...messages )
	
	class ProgressionMerger {
	    // Arguments:
	    //   interlineDistance (Number): inter-line distance in pixels
	    //   logger ({ log(...) }): optional logger
	    constructor( _interlineDistance, logger ) {
	        interlineDistance = _interlineDistance;
	
	        settings.load();
	        settings.fitThreshold *= interlineDistance;
	
	        if (logger) {
	            logger.log( '. . . . . . . . .' );
	            log = (...params) => {
	                logger.log( 'ProgressionMerger   ', ...params );
	            };
	        }
	    }
	
	    // Arguments:
	    //   progressions (Array of (Array of Fixation))
	    //   textLines (Array of (Array of word))
	    // Returns:
	    //   new sorted array of original and merged progressions (Array of (Array of Fixation))
	    // Notes:
	    //   1. Fixations get property "line", the index of line they land onto.
	    //   2. Merged sets have property "joined" = <number of joined progressions>
	    //   3. Progressions not included in the resulting array and not merged with other have property "removed"
	    merge( progressions, textLines ) {
	        const lineCount = textLines.length;
	
	        let result = progressions.map( set => set );
	        log( '#0:', result.length, '\n', result.map( set => (set.map( fix => fix.id ))) );
	
	        // 1. join only long sets
	        result = joinSetsOfType( result, lineCount, SET_TYPE.LONG, SET_TYPE.LONG, settings.minLongSetLength );
	        log( '#1a:', result.length );
	
	        // 2. join short sets with long sets
	        result = joinSetsOfType( result, lineCount, SET_TYPE.SHORT, SET_TYPE.LONG, settings.minLongSetLength );
	        log( '#1b:', result.length );
	
	        // 3. join the remaining single-fixation sets with multi-fixation sets
	        const multiFixationSetLength = 2;
	        result = joinSetsOfType( result, lineCount, SET_TYPE.SHORT, SET_TYPE.LONG, multiFixationSetLength );
	        log( '#1c:', result.length );
	
	        if (result.length > lineCount) {
	            // still too many: join any multi-fixation set with any other multi-fixation set
	            result = joinSetsOfType( result, lineCount, SET_TYPE.LONG, SET_TYPE.LONG, multiFixationSetLength );
	            log( '#2:', result.length );
	        }
	        else if (settings.removeSingleFixationLines) {
	            result = dropShortSets( result, 2 );
	        }
	
	        if (result.length > lineCount) {
	            // and still too many...
	            // drop short sets
	            result = dropShortSets( result, settings.minLongSetLength );
	            log( '#3a:', result.length );
	
	            // then force joining the closest sets
	            result = joinSetsOfType( result, lineCount, SET_TYPE.ANY, SET_TYPE.ANY );
	            log( '#3b:', result.length );
	        }
	
	        align( result, textLines );
	
	        return result;
	    }
	}
	
	function joinSetsOfType( fixationsSets, lineCount, primarySetType, secondarySetType, minLongSetLength ) {
	    let result = fixationsSets;
	    const forced = primarySetType === SET_TYPE.ANY && secondarySetType === SET_TYPE.ANY;
	
	    while (result.length > lineCount) {
	        const pairs = createPairs( result, primarySetType, secondarySetType, minLongSetLength );
	        const updatedSets = findAndJoinClosestPair( result, pairs, forced );
	
	        if (!updatedSets) {
	            break;
	        }
	
	        result = updatedSets;
	    }
	
	    return result;
	}
	
	/**********************
	    createPairs
	**********************/
	
	function isValidSet( set, lengthType, lengthTypeThreshold) {
	    if (lengthType === SET_TYPE.LONG && set.length < lengthTypeThreshold) {
	        return false;
	    }
	    else if (lengthType === SET_TYPE.SHORT && set.length >= lengthTypeThreshold) {
	        return false;
	    }
	    return true;
	}
	
	// function getFittingError( fixations, model ) {
	//     let error = 0;
	
	//     for (let i = 0; i < fixations.length; i += 1) {
	//         const fixation = fixations[i];
	//         const y = regression.fit( model, fixation.x );
	//         error += (fixation.y - y) * (fixation.y - y);
	//     }
	
	//     return Math.sqrt( error / fixations.length );
	// }
	
	function fixationsToArray( fixations ) {
	    const result = [];
	    for (let i = 0; i < fixations.length; i += 1) {
	        const fixation = fixations[i];
	        result.push([ fixation.x, fixation.y ]);
	    }
	    return result;
	}
	
	function getFitError( fixations ) {
	    const model = regression.model( 'linear', fixationsToArray( fixations ) );
	
	    let error = 0;
	
	    for (let i = 0; i < fixations.length; i += 1) {
	        const fixation = fixations[i];
	        const y = regression.fit( model.equation, fixation.x );
	        error += (fixation.y - y) * (fixation.y - y);
	    }
	
	    return Math.sqrt( error / fixations.length );
	}
	
	function createPairs( fixationsSets, primarySetType, secondarySetType, setSetTypeThreshold) {
	    const pairs = [];
	
	    for (let i = 0; i < fixationsSets.length; i += 1) {
	        const set1 = fixationsSets[i];
	        if (!isValidSet( set1, primarySetType, setSetTypeThreshold )) {
	            continue;
	        }
	
	        // Compute error of fitting to linear model for each pair of sets
	        for (let j = 0; j < fixationsSets.length; j += 1) {
	            if (i === j) {
	                continue;
	            }
	
	            const set2 = fixationsSets[j];
	            if (!isValidSet( set2, secondarySetType, setSetTypeThreshold )) {
	                continue;
	            }
	
	            const joinedSets = set1.concat( set2 );
	
	            pairs.push({
	                set1: i,
	                set2: j,
	                error: getFitError( joinedSets )
	            });
	        }
	    }
	
	    return pairs;
	}
	
	/**********************
	    findAndJoinClosestPair
	**********************/
	
	function joinSets( fixationsSets, id1, id2, forced ) {
	    const maxGradient = forced ? Number.MAX_VALUE : settings.maxLinearGradient;
	
	    const set1 = fixationsSets[ id1 ];
	    const set2 = fixationsSets[ id2 ];
	    const joinedSet = set1.concat( set2 );
	    joinedSet.joined = (set1.joined || 1) + (set2.joined || 1);
	
	    const model = regression.model( 'linear', fixationsToArray( joinedSet ) );
	    const gradient = model.equation[1];
	
	    if (Math.abs( gradient ) < maxGradient) {
	        const minIndex = Math.min( id1, id2 );
	        const maxIndex = Math.max( id1, id2 );
	
	        fixationsSets.splice( maxIndex, 1 );
	        fixationsSets.splice( minIndex, 1 );
	        fixationsSets.push( joinedSet );
	
	        log( 'joined', id1 + ' = ' + set1.map( fix => fix.id), ' & ', id2 + ' = ' + set2.map( fix => fix.id) );
	        log( '--->\n', fixationsSets.map( set => set.map( fix => fix.id ) ) );
	        return true;
	    }
	
	    return false;
	}
	
	function findAndJoinClosestPair( fixationsSets, pairs, forced ) {
	    let result;
	
	    const fitThreshold = forced ? Number.MAX_VALUE : settings.fitThreshold;
	
	    // holds pairs that produce too inclined set
	    const invalidPairs = {};
	
	    do {
	        // find 2 nearest sets, i.e. the pair with smallest error
	        let minError = Number.MAX_VALUE;
	        let minIndex = -1;
	        for (let i = 0; i < pairs.length; i += 1) {
	            if (invalidPairs[i]) {
	                continue;
	            }
	            const pair = pairs[i];
	            if (pair.error < minError) {
	                minIndex = i;
	                minError = pair.error;
	            }
	        }
	
	        // if found, try to join them
	        if (minIndex >= 0 && minError < fitThreshold) {
	            const pair = pairs[ minIndex ];
	            const success = joinSets( fixationsSets, pair.set1, pair.set2, forced );
	            if (success) {
	                result = fixationsSets;
	            }
	            else {
	                invalidPairs[ minIndex ] = true;
	            }
	        }
	        else {
	            result = null;
	        }
	
	        // break only when
	        //  - all pairs have too distant components, or
	        //  - all pairs have very distinctly inclined set of fixations, or
	        //  - a pair of the closest sets was joined
	    } while (result === undefined);
	
	    return result;
	}
	
	/**********************
	    align
	**********************/
	function avgY( fixations ) {
	    let sumY = 0;
	    for (let i = 0; i < fixations.length; i += 1) {
	        sumY += fixations[i].y;
	    }
	    return sumY / fixations.length;
	}
	
	function sortSets( fixationsSets ) {
	    fixationsSets.sort( (set1, set2) => {
	        return avgY( set1 ) - avgY( set2 );
	    });
	    fixationsSets.forEach( set => {
	        set.sort( (fix1, fix2) => {
	            return fix1.ts - fix2.ts;
	        });
	    });
	}
	
	function align( fixationsSets, textLines ) {
	
	    sortSets( fixationsSets );
	
	    let minID = Number.MAX_VALUE;
	    let maxID = 0;
	    textLines.forEach( line => {
	        if (minID > line.id) {
	            minID = line.id;
	        }
	        if (maxID < line.id) {
	            maxID = line.id;
	        }
	    });
	
	    let currentLineID = 0;
	    let lastSetY;
	    // let lastLineY;
	
	    for (let i = 0; i < fixationsSets.length; i += 1) {
	        const fixations = fixationsSets[i];
	        const currentSetY = avgY( fixations );
	        // let currentLineY;
	
	        const initialLineID = currentLineID;
	        if (settings.correctForEmptyLines && i > 0) {
	            /*
	            while (currentLineID < textLines.length) {
	                currentLineY = textLines[ currentLineID ].y;
	
	                const setDist = currentSetY - lastSetY;
	                const lineDist = currentLineY - lastLineY;
	
	                if (setDist < settings.emptyLineDetectorFactor * lineDist) {
	                    break;
	                }
	
	                currentLineID += 1;
	            }
	            */
	            const lineIDsFromMappedSets = [];
	            for (let j = 0; j < i; j += 1) {
	                const prevSet = fixationsSets[j];
	                if (prevSet[0].line === undefined) {
	                    continue;
	                }
	
	                const prevSetY = avgY( prevSet );
	                lineIDsFromMappedSets.push( prevSet[0].line + (currentSetY - prevSetY) / interlineDistance );
	            }
	
	            if (lineIDsFromMappedSets.length) {
	                const avgID = lineIDsFromMappedSets.reduce( (acc, id) => {
	                    return acc + id;
	                }, 0 ) / lineIDsFromMappedSets.length;
	                currentLineID = Math.min( maxID, Math.max( minID, Math.round( avgID ) ) );
	            }
	            else {
	                currentLineID += 1;
	            }
	        }
	        // else {
	        //     currentLineY = textLines[ currentLineID ].y;
	        // }
	
	        if (initialLineID !== currentLineID) {
	            log( `Line advanced: #${initialLineID} => ${currentLineID}` );
	        }
	
	        for (let j = 0; j < fixations.length; j += 1) {
	            fixations[j].line = currentLineID;
	        }
	
	        // lastLineY = currentLineY;
	        lastSetY = currentSetY;
	
	        currentLineID += 1;
	        // if (currentLineID >= textLines.length) {
	        //     break;
	        // }
	
	        // currentLineY = textLines[ currentLineID ].y;
	    }
	// fixationsSets.forEach( (p, pi) => {
	//     console.log('--',pi,'--');
	//     console.log( p.map( (f, fi) => { return f.line; } ).join(' ') ) ;
	// });
	}
	
	/**********************
	    dropShortSets
	**********************/
	function dropShortSets( fixationSets, minLength ) {
	    var result = [];
	
	    for (var i = 0; i < fixationSets.length; i += 1) {
	        var fixationSet = fixationSets[i];
	        if (fixationSet.length >= minLength) {
	            result.push( fixationSet );
	        }
	        else {
	            fixationSet.removed = true;
	        }
	    }
	
	    return result;
	}
	
	module.exports = ProgressionMerger;

/***/ },
/* 8 */
/***/ function(module, exports, __webpack_require__) {

	/**
	* @license
	*
	* Regression.JS - Regression functions for javascript
	* http://tom-alexander.github.com/regression-js/
	*
	* copyright(c) 2013 Tom Alexander
	* Licensed under the MIT license.
	*
	**/
	/* jshint ignore:start */
	;(function() {
	    'use strict';
	
	    var gaussianElimination = function(a, o) {
	           var i = 0, j = 0, k = 0, maxrow = 0, tmp = 0, n = a.length - 1, x = new Array(o);
	           for (i = 0; i < n; i++) {
	              maxrow = i;
	              for (j = i + 1; j < n; j++) {
	                 if (Math.abs(a[i][j]) > Math.abs(a[i][maxrow]))
	                    maxrow = j;
	              }
	              for (k = i; k < n + 1; k++) {
	                 tmp = a[k][i];
	                 a[k][i] = a[k][maxrow];
	                 a[k][maxrow] = tmp;
	              }
	              for (j = i + 1; j < n; j++) {
	                 for (k = n; k >= i; k--) {
	                    a[k][j] -= a[k][i] * a[i][j] / a[i][i];
	                 }
	              }
	           }
	           for (j = n - 1; j >= 0; j--) {
	              tmp = 0;
	              for (k = j + 1; k < n; k++)
	                 tmp += a[k][j] * x[k];
	              x[j] = (a[n][j] - tmp) / a[j][j];
	           }
	           return (x);
	    };
	
	    var methods = {
	        linear: function(data) {
	            var sum = [0, 0, 0, 0, 0], n = 0, results = [];
	
	            for (; n < data.length; n++) {
	              if (data[n][1] != null) {
	                sum[0] += data[n][0];
	                sum[1] += data[n][1];
	                sum[2] += data[n][0] * data[n][0];
	                sum[3] += data[n][0] * data[n][1];
	                sum[4] += data[n][1] * data[n][1];
	              }
	            }
	
	            var gradient = (n * sum[3] - sum[0] * sum[1]) / (n * sum[2] - sum[0] * sum[0]);
	            var intercept = (sum[1] / n) - (gradient * sum[0]) / n;
	          //  var correlation = (n * sum[3] - sum[0] * sum[1]) / Math.sqrt((n * sum[2] - sum[0] * sum[0]) * (n * sum[4] - sum[1] * sum[1]));
	
	            for (var i = 0, len = data.length; i < len; i++) {
	                var coordinate = [data[i][0], data[i][0] * gradient + intercept];
	                results.push(coordinate);
	            }
	
	            var string = 'y = ' + Math.round(gradient*100) / 100 + 'x + ' + Math.round(intercept*100) / 100;
	
	            return {equation: [intercept, gradient], points: results, string: string};
	        },
	
	        linearThroughOrigin: function(data) {
	            var sum = [0, 0], n = 0, results = [];
	
	            for (; n < data.length; n++) {
	                if (data[n][1] != null) {
	                    sum[0] += data[n][0] * data[n][0]; //sumSqX
	                    sum[1] += data[n][0] * data[n][1]; //sumXY
	                }
	            }
	
	            var gradient = sum[1] / sum[0];
	
	            for (var i = 0, len = data.length; i < len; i++) {
	                var coordinate = [data[i][0], data[i][0] * gradient];
	                results.push(coordinate);
	            }
	
	            var string = 'y = ' + Math.round(gradient*100) / 100 + 'x';
	
	            return {equation: [0, gradient], points: results, string: string};
	        },
	
	        exponential: function(data) {
	            var sum = [0, 0, 0, 0, 0, 0], n = 0, results = [];
	
	            for (len = data.length; n < len; n++) {
	              if (data[n][1] != null) {
	                sum[0] += data[n][0];
	                sum[1] += data[n][1];
	                sum[2] += data[n][0] * data[n][0] * data[n][1];
	                sum[3] += data[n][1] * Math.log(data[n][1]);
	                sum[4] += data[n][0] * data[n][1] * Math.log(data[n][1]);
	                sum[5] += data[n][0] * data[n][1];
	              }
	            }
	
	            var denominator = (sum[1] * sum[2] - sum[5] * sum[5]);
	            var A = Math.pow(Math.E, (sum[2] * sum[3] - sum[5] * sum[4]) / denominator);
	            var B = (sum[1] * sum[4] - sum[5] * sum[3]) / denominator;
	
	            for (var i = 0, len = data.length; i < len; i++) {
	                var coordinate = [data[i][0], A * Math.pow(Math.E, B * data[i][0])];
	                results.push(coordinate);
	            }
	
	            var string = 'y = ' + Math.round(A*100) / 100 + 'e^(' + Math.round(B*100) / 100 + 'x)';
	
	            return {equation: [A, B], points: results, string: string};
	        },
	
	        logarithmic: function(data) {
	            var sum = [0, 0, 0, 0], n = 0, results = [];
	
	            for (len = data.length; n < len; n++) {
	              if (data[n][1] != null) {
	                sum[0] += Math.log(data[n][0]);
	                sum[1] += data[n][1] * Math.log(data[n][0]);
	                sum[2] += data[n][1];
	                sum[3] += Math.pow(Math.log(data[n][0]), 2);
	              }
	            }
	
	            var B = (n * sum[1] - sum[2] * sum[0]) / (n * sum[3] - sum[0] * sum[0]);
	            var A = (sum[2] - B * sum[0]) / n;
	
	            for (var i = 0, len = data.length; i < len; i++) {
	                var coordinate = [data[i][0], A + B * Math.log(data[i][0])];
	                results.push(coordinate);
	            }
	
	            var string = 'y = ' + Math.round(A*100) / 100 + ' + ' + Math.round(B*100) / 100 + ' ln(x)';
	
	            return {equation: [A, B], points: results, string: string};
	        },
	
	        power: function(data) {
	            var sum = [0, 0, 0, 0], n = 0, results = [];
	
	            for (len = data.length; n < len; n++) {
	              if (data[n][1] != null) {
	                sum[0] += Math.log(data[n][0]);
	                sum[1] += Math.log(data[n][1]) * Math.log(data[n][0]);
	                sum[2] += Math.log(data[n][1]);
	                sum[3] += Math.pow(Math.log(data[n][0]), 2);
	              }
	            }
	
	            var B = (n * sum[1] - sum[2] * sum[0]) / (n * sum[3] - sum[0] * sum[0]);
	            var A = Math.pow(Math.E, (sum[2] - B * sum[0]) / n);
	
	            for (var i = 0, len = data.length; i < len; i++) {
	                var coordinate = [data[i][0], A * Math.pow(data[i][0] , B)];
	                results.push(coordinate);
	            }
	
	             var string = 'y = ' + Math.round(A*100) / 100 + 'x^' + Math.round(B*100) / 100;
	
	            return {equation: [A, B], points: results, string: string};
	        },
	
	        polynomial: function(data, order) {
	            if(typeof order == 'undefined'){
	                order = 2;
	            }
	             var lhs = [], rhs = [], results = [], a = 0, b = 0, i = 0, k = order + 1;
	
	                    for (; i < k; i++) {
	                       for (var l = 0, len = data.length; l < len; l++) {
	                          if (data[l][1] != null) {
	                           a += Math.pow(data[l][0], i) * data[l][1];
	                          }
	                        }
	                        lhs.push(a), a = 0;
	                        var c = [];
	                        for (var j = 0; j < k; j++) {
	                           for (var l = 0, len = data.length; l < len; l++) {
	                              if (data[l][1] != null) {
	                               b += Math.pow(data[l][0], i + j);
	                              }
	                            }
	                            c.push(b), b = 0;
	                        }
	                        rhs.push(c);
	                    }
	            rhs.push(lhs);
	
	           var equation = gaussianElimination(rhs, k);
	
	                for (var i = 0, len = data.length; i < len; i++) {
	                    var answer = 0;
	                    for (var w = 0; w < equation.length; w++) {
	                        answer += equation[w] * Math.pow(data[i][0], w);
	                    }
	                    results.push([data[i][0], answer]);
	                }
	
	                var string = 'y = ';
	
	                for(var i = equation.length-1; i >= 0; i--){
	                  if(i > 1) string += Math.round(equation[i] * Math.pow(10, i)) / Math.pow(10, i)  + 'x^' + i + ' + ';
	                  else if (i == 1) string += Math.round(equation[i]*100) / 100 + 'x' + ' + ';
	                  else string += Math.round(equation[i]*100) / 100;
	                }
	
	            return {equation: equation, points: results, string: string};
	        },
	
	        lastvalue: function(data) {
	          var results = [];
	          var lastvalue = null;
	          for (var i = 0; i < data.length; i++) {
	            if (data[i][1]) {
	              lastvalue = data[i][1];
	              results.push([data[i][0], data[i][1]]);
	            }
	            else {
	              results.push([data[i][0], lastvalue]);
	            }
	          }
	
	          return {equation: [lastvalue], points: results, string: "" + lastvalue};
	        }
	    };
	
	    var regression = {
	
	      model: function(method, data, order) {
	
	        if (typeof method == 'string') {
	          return methods[method](data, order);
	        }
	      },
	
	      fit: function (equation, x) {
	        var result = 0;
	        var value = 1;
	
	        if (!equation) {
	          return Number.MAX_VALUE;
	        }
	
	        for (var i = 0; i < equation.length; ++i) {
	          result += equation[i] * value;
	          value *= x;
	        }
	
	        return result;
	      }
	    };
	
	    if (true) {
	        module.exports = regression;
	    } else {
	        window.regression = regression;
	    }
	
	}());
	/* jshint ignore:end */

/***/ },
/* 9 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';
	
	const Settings = __webpack_require__(3);
	
	class ProgressionMergerSettings extends Settings {
		constructor() {
			super( 'progressionMergerSettings' );
	
			this._minLongSetLength = 3; 	// the minimal length of "long" set
			this._fitThreshold = 0.3;		// fraction of the average inter-line distance
			this._maxLinearGradient = 0.15; // the maximum difference in equation gradients for fixations that can be joined
			this._removeSingleFixationLines = false;
			this._correctForEmptyLines = true;
			this._emptyLineDetectorFactor = 1.7;	// multiplier to interlineDistance
	
			super.load();
		}
	
		get minLongSetLength() { return this._minLongSetLength; }
		set minLongSetLength( value ) { this._minLongSetLength = value; }
		get fitThreshold() { return this._fitThreshold; }
		set fitThreshold( value ) { this._fitThreshold = value; }
		get maxLinearGradient() { return this._maxLinearGradient; }
		set maxLinearGradient( value ) { this._maxLinearGradient = value; }
		get removeSingleFixationLines() { return this._removeSingleFixationLines; }
		set removeSingleFixationLines( value ) { this._removeSingleFixationLines = value; }
		get correctForEmptyLines() { return this._correctForEmptyLines; }
		set correctForEmptyLines( value ) { this._correctForEmptyLines = value; }
		get emptyLineDetectorFactor() { return this._emptyLineDetectorFactor; }
		set emptyLineDetectorFactor( value ) { this._emptyLineDetectorFactor = value; }
	}
	
	module.exports = ProgressionMergerSettings;

/***/ },
/* 10 */
/***/ function(module, exports, __webpack_require__) {

	/*
		Maps fixations to words within a line
	*/
	'use strict';
	
	const WordMapperSettings = __webpack_require__(11);
	
	const settings = new WordMapperSettings();
	
	let log = () => {}; // Function( module, ...messages )
	
	class WordMapper {
	    // Arguments:
	    //   logger ({ log(...) }): optional logger
	    constructor( logger ) {
	        settings.load();
	
	        if (logger) {
	            logger.log( '. . . . . . . . .' );
	            log = (...params) => {
	                logger.log( 'WordMapper   ', ...params );
	            };
	        }
	    }
	
	    // Arguments:
	    //   fixationLines (Array of (Array of Fixation)): only (all) fixations from one array correspond
	    //      to a text line
	    //      the array is sorted top-to-bottom
	    //   textLines (Array of (Array of Word))
	    // Notes
	    //   1. If rescaling is enabled, then updates fixation.x value and copies the original value to fixation._x
	    //   2, Fixations mapped on a word get property "word" =
	    //      {left, top, right, bottom, index=<index_in_line>, id=<index_in_text>, text }
	    //   3. Words with mapped fixations get property "fixations" = (Array of Fixation)
	    map( fixationLines, textLines ) {
	        for (let i = 0; i < fixationLines.length; i += 1) {
	            const fixations = fixationLines[i];
	            const lineID = fixations[0].line;
	            const textLine = getTextLine( textLines, lineID );
	
	            if (textLine !== undefined) {
	                if (settings.rescaleFixationX) {
	                    rescaleFixations( fixations, textLine );
	                }
	                mapFixationsWithinLine( fixations, textLine );
	            }
	        }
	    }
	
	    // Arguments:
	    //   fixations (Array of Fixation): the list of fixations
	    //   words (Array of Word): the Text.words
	    clean( fixations, words ) {
	        if (settings.ignoreTransitions) {
	            removeTransitions( fixations, words );
	        }
	    }
	}
	
	function getTextLine( textLines, lineID ) {
	    let textLine;
	    for (let i = 0; i < textLines.length; i += 1) {
	        if (lineID === textLines[i].id) {
	            textLine = textLines[i];
	            break;
	        }
	    }
	    return textLine;
	}
	
	/*****************
	    rescaleFixations
	*****************/
	
	function getNewLeftMostX( word ) {
	    if (word.text.length > 2 * settings.wordCharSkipStart) {
	        return word.x + Math.floor( settings.wordCharSkipStart / word.text.length * word.width );
	    }
	    else {
	        return word.x + Math.floor( word.width / 2 );
	    }
	}
	
	function getNewRightMostX( word ) {
	    if (word.text.length > settings.wordCharSkipStart + settings.wordCharSkipEnd) {
	        return word.x + Math.floor( (word.text.length - settings.wordCharSkipEnd) / word.text.length * word.width );
	    }
	    else {
	        return word.x + Math.floor( word.width / 2 );
	    }
	}
	
	function getFixationsRange( fixations ) {
	    let leftMostX = Number.MAX_VALUE,
	        rightMostX = Number.MIN_VALUE;
	
	    for (let i = 0; i < fixations.length; i += 1) {
	        let fix = fixations[i];
	        if (fix.x < leftMostX) {
	            leftMostX = fix.x;
	        }
	        else if (fix.x > rightMostX) {
	            rightMostX = fix.x;
	        }
	    }
	
	    return { leftMostX, rightMostX };
	}
	
	function computeScale( newRange, oldRange ) {
	    let scale = newRange / oldRange;
	
	    // limit the scaling factor
	    let newXCorrection = 0;
	    if (scale < settings.scalingDiffLimit) {
	        scale = settings.scalingDiffLimit;
	        newXCorrection = (scale * oldRange - newRange) / 2;
	    }
	    else if (scale > (2 - settings.scalingDiffLimit)) {
	        scale = 2 - settings.scalingDiffLimit;
	        newXCorrection = -(scale * oldRange - newRange) / 2;
	    }
	
	    return { scale, newXCorrection };
	}
	
	function rescaleFixations( fixations, words ) {
	
	    const firstWord = words[0];
	    const lastWord = words[ words.length - 1 ];
	
	    const leftThreshold = firstWord.x + firstWord.width;
	    const rightThreshold = lastWord.x + lastWord.width;
	
	    let { leftMostX, rightMostX } = getFixationsRange( fixations );
	
	    log( 'rescaling...' );
	    log( 'left: ' + leftMostX + ' ' + leftThreshold );
	    log( 'right: ' + rightMostX + ' ' + rightThreshold );
	
	    if (leftMostX < leftThreshold || rightMostX > rightThreshold) {
	        // Calculate the scaling factor
	        let newLeftMostX = leftMostX < leftThreshold ?  // if the left-most fixation lands left to the 2nd word...
	                        getNewLeftMostX( words[0] ) :   // ...estimate its expected location
	                        leftMostX;                      // otherwise we do not know where it shoud be...
	        let newRightMostX = rightMostX > rightThreshold ?    // if the right-most fixation lands right to the 2nd last word...
	                        getNewRightMostX( lastWord ) :       // ...estimate its expected location
	                        rightMostX;                          // otherwise we do not know where it shoud be...
	        const newRange = newRightMostX - newLeftMostX;
	        const oldRange = rightMostX - leftMostX;
	        const { scale, newXCorrection } = computeScale( newRange, oldRange );
	        log( 'scale', scale );
	
	        newLeftMostX -= newXCorrection;
	        newRightMostX += newXCorrection;
	
	        // Recalculate x's
	        for (let i = 0; i < fixations.length; i += 1) {
	            const fixation = fixations[i];
	            fixation._x = fixation.x;
	            fixation.x = newLeftMostX + scale * (fixation.x - leftMostX);
	        }
	    }
	}
	
	/**************
	    mapFixationsWithinLine
	**************/
	
	function getClosestWordID( fixation, words ) {
	    let minDist = Number.MAX_VALUE;
	    let minDistWordID = -1;
	
	    for (let i = 0; i < words.length; i += 1) {
	        const word = words[i];
	        const effectiveWordWidth = word.fixations || word.text.length <= settings.partialLengthMaxWordLength ?
	            settings.effectiveLengthFactor * word.width : word.width;
	
	        // BUGFIX: effectiveWordWidth =>> word.x + effectiveWordWidth
	        if (fixation.x >= word.x && fixation.x < (word.x + effectiveWordWidth)) {
	            minDistWordID = i;
	            minDist = 0;
	            break;
	        }
	        else {
	            const dist = Math.max( word.x - fixation.x, fixation.x - (word.x + effectiveWordWidth) );
	            if (dist < minDist) {
	                minDist = dist;
	                minDistWordID = i;
	            }
	        }
	    }
	
	    return minDistWordID;
	}
	
	function mapFixationsWithinLine( fixations, words ) {
	    log( '== mapping ==' );
	    for (let i = 0; i < fixations.length; i += 1) {
	        const fixation = fixations[i];
	
	        const closestWordID = getClosestWordID( fixation, words );
	        if (closestWordID < 0) {
	            log( `${fixation.id} => ---` );
	            continue;
	        }
	
	        const closestWord = words[ closestWordID ];
	        fixation.word = {
	            left: closestWord.x,
	            top: closestWord.y,
	            right: closestWord.x + closestWord.width,
	            bottom: closestWord.y + closestWord.height,
	            index: closestWordID,
	            text: closestWord.text,
	            id: closestWord.id
	        };
	
	        if (closestWord.fixations) {
	            closestWord.fixations.push( fixation );
	        }
	        else {
	            closestWord.fixations = [ fixation ];
	        }
	
	        log( `${fixation.id} => ${closestWord.id}` );
	    }
	}
	
	/***************
	    removeTransitions
	***************/
	
	function getPrevFixationOnLine( fixations, index ) {
	    let result = null;
	    for (; index > 0; index -= 1) {
	        const fix = fixations[ index ];
	        if (fix.line !== undefined) {
	            result = fix;
	            break;
	        }
	    }
	
	    return result;
	}
	
	function getLastChunkSaccade( fixations, index, direction ) {
	    let result = null;
	    for (; index > 0; index -= 1) {
	        const fix = fixations[ index ];
	        if (fix.line === undefined) {
	            continue;
	        }
	
	        const prevFix = getPrevFixationOnLine( fixations, index - 1 );
	        if (!prevFix) {
	            index = 0;
	            break;
	        }
	
	        if (direction < 0 ? fix.x < prevFix.x : fix.x >= prevFix.x) {
	            result = fix;
	            break;
	        }
	    }
	
	    return [ result, index ];
	}
	
	function removeFixation( fixations, id ) {
	    return fixations.filter( fixation => fixation.id !== id );
	}
	
	function removeTransitions( fixations, words ) {
	    let index = fixations.length - 1;
	
	    while (index) {
	        const [ firstProgressionFix, firstProgressionFixIndex ] = getLastChunkSaccade( fixations, index, -1 );
	        if (!firstProgressionFixIndex) {
	            break;
	        }
	
	        const [ lastProgressionFix, lastProgressionFixIndex ] = getLastChunkSaccade( fixations, firstProgressionFixIndex, 1 );
	        index = lastProgressionFixIndex;
	        if (!lastProgressionFix)  {
	            continue;
	        }
	
	        if (firstProgressionFix.line !== lastProgressionFix.line) {
	            for (let i = lastProgressionFixIndex + 1; i < firstProgressionFixIndex; i += 1) {
	                const fix = fixations[ i ];
	                if (fix.word) {
	                    const word = words[ fix.word.id ];
	                    if (word.fixations.length === 1) {
	                        delete word.fixations;
	                        log( 'removed @ word #', word.id );
	                    }
	                    else {
	                        word.fixations = removeFixation( word.fixations, fix.id );
	                        log( 'one removed @ word #', word.id );
	                    }
	
	                    delete fix.word;
	                    delete fix.line;
	
	                    log( 'removed @ fix #', fix.id );
	                }
	            }
	        }
	    }
	}
	
	module.exports = WordMapper;

/***/ },
/* 11 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';
	
	const Settings = __webpack_require__(3);
	
	class WordMapperSettings extends Settings {
		constructor() {
			super( 'wordMapperSettings' );
			this._wordCharSkipStart = 3;
			this._wordCharSkipEnd = 6;
			this._scalingDiffLimit = 0.9;
			this._rescaleFixationX = true;
			this._partialLengthMaxWordLength = 2;
			this._effectiveLengthFactor = 0.7;
			this._ignoreTransitions = true;
	
			super.load();
		}
	
		get wordCharSkipStart() { return this._wordCharSkipStart; }
		set wordCharSkipStart( value ) { this._wordCharSkipStart = value; }
		get wordCharSkipEnd() { return this._wordCharSkipEnd; }
		set wordCharSkipEnd( value ) { this._wordCharSkipEnd = value; }
		get scalingDiffLimit() { return this._scalingDiffLimit; }
		set scalingDiffLimit( value ) { this._scalingDiffLimit = value; }
		get rescaleFixationX() { return this._rescaleFixationX; }
		set rescaleFixationX( value ) { this._rescaleFixationX = value; }
		get partialLengthMaxWordLength() { return this._partialLengthMaxWordLength; }
		set partialLengthMaxWordLength( value ) { this._partialLengthMaxWordLength = value; }
		get effectiveLengthFactor() { return this._effectiveLengthFactor; }
		set effectiveLengthFactor( value ) { this._effectiveLengthFactor = value; }
		get ignoreTransitions() { return this._ignoreTransitions; }
		set ignoreTransitions( value ) { this._ignoreTransitions = value; }
	}
	
	module.exports = WordMapperSettings;

/***/ }
/******/ ]);
//# sourceMappingURL=sgwm.js.map