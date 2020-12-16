'use strict';

// Modules required
// var jpipCodestreamClient = require('jpipcodestreamclient_ca87c73.js'); 

// Arbritrary tile size
var tileWidth = 256;
var tileHeight = 256;

// Initialising html elements
var statusDiv = document.getElementById('status');
var tilesViewerDiv = document.getElementById('tilesViewer');
var codestreamBytesDiv = document.getElementById('codestreamBytesDiv');
var errorDiv = document.getElementById('errorDiv');

// User inputs
var numResolutionLevelsToCutTxt = document.getElementById('numResolutionLevelsToCutTxt');
var maxNumQualityLayersTxt = document.getElementById('maxNumQualityLayersTxt');
var jpipUrlTxt = document.getElementById('jpipUrlTxt');
// var minTileXTxt = document.getElementById('minTileXTxt');
// var maxTileXTxt = document.getElementById('maxTileXTxt');
// var minTileYTxt = document.getElementById('minTileYTxt');
// var maxTileYTxt = document.getElementById('maxTileYTxt');
var enableProgressiveChk = document.getElementById('enableProgressiveChk');

// Image elements
var closeImageLink = document.getElementById('closeImageLink');
var loadAllTilesLink = document.getElementById('loadAllTilesLink');

// Max resolution levels
var maxNumResolutionLevelsSpan = document.getElementById('maxNumResolutionLevelsSpan');

// Tiles to be calculated
var numTilesX = null;
var numTilesY = null;

// Image variables
var image = null;
var codestreamPerTile;
var isImageReady = false;

// TODO
function statusCallback(status) {
  // If there is a status exception, display it
  if (status.exception !== null) {
		errorDiv.innerHTML = 'Exception occurred: ' + status.exception;
	} else {
		errorDiv.innerHTML = '';
	}
  
  // If image is ready return
	if (isImageReady === status.isReady) {
		return;
  }
  
  // If image is not ready yet, set equal to status.isReady
	isImageReady = status.isReady;

  // If status not ready, disable all links and return
	if (!status.isReady) {
		disableAllLinks();
		return;
	}

  // Get sizes
  var sizeParams = image.getSizesParams();
  // Create new codestream size calculator object
	var sizesCalculator = new JpipCodestreamSizesCalculator(sizeParams);
  
  // Get number of tiles
	numTilesX = Math.ceil(sizesCalculator.getLevelWidth() / tileWidth);
	numTilesY = Math.ceil(sizesCalculator.getLevelHeight() / tileHeight);
  
  // Set html elements to be ready
	statusDiv.innerHTML = 'Ready.';
	closeImageLink.innerHTML = 'Close image';
  loadAllTilesLink.innerHTML = 'Load all tiles';
  // Get default number of quality layers from object
	maxNumQualityLayersTxt.value = sizesCalculator.getDefaultNumQualityLayers();
	// Get default number of resolution levels from object
	maxNumResolutionLevelsSpan.innerHTML = sizesCalculator.getDefaultNumResolutionLevels() - 1;

	buildHTMLTileStructure();  // Build HTML tiles
}


function buildHTMLTileStructure() {
	var tableHTML = '<table border=1><tr><td></td>';  // Make html table string

	codestreamPerTile = new Array();  // Make array of x tile codestreams
  
  // Set x table headers and make array in each element for y tiles
	for (var x = 0; x < numTilesX; ++x) {
		tableHTML += '<th>' + x + '</th>';
		codestreamPerTile[x] = new Array(numTilesY);
	}
  
  // Set y table rows
	for (var y = 0; y < numTilesY; ++y) {
		tableHTML += '</tr><tr><th>' + y + '</th>';
    
    // Add tile elements
		for (var x = 0; x < numTilesX; ++x) {
			var name = x + '_' + y ;
			var params = '' + x + ', ' + y;
			tableHTML +=
				'<td>' + 
					'<span id="span' + name + '"></span><br>' +
					'<a id="linkLoadTile' + name + '" href="javascript:loadTile(' + params + ')" >Load tile</a><br>' +
					'<div><canvas id="canvas' + name + '"></canvas></div><br>' +
					'<a id="linkShowCodestream' + name + '" href="javascript:showCodestream(' + params + ')" ></a>' +
				'</td>';
		}
		
		tableHTML += '</tr>'; // End html table
	}
  
  // Set html table element
	tilesViewerDiv.innerHTML = tableHTML;
}

// Clear all image links
function disableAllLinks() {
  // Set statusDiv to not ready and clear image links
  statusDiv.innerHTML = 'Not ready';
	closeImageLink.innerHTML = '';
	loadAllTilesLink.innerHTML = '';

  // Add tile number to element id?
	for (var y = 0; y < numTilesY; ++y) {
		for (var x = 0; x < numTilesX; ++x) {
      var name = x + '_' + y ;
      // linkLoadTile is created in nuildHTMLStructure()
			var linkLoadTileElement = document.getElementById('linkLoadTile' + name);
			
			linkLoadTileElement.innerHTML = '';
		}
	}
}

// Call loadTile over all tiles
function loadAllTiles() {
	for (var x = 0; x < numTilesX; ++x) {
		for (var y = 0; y < numTilesY; ++y) {
			loadTile(x, y);
		}
	}
}

// Decode and load tile into html table
function loadTile(tileX, tileY) {
	var name = tileX + '_' + tileY; // Tile name
  var spanElement = document.getElementById('span' + name); // Get span element for tile
  var canvasElement = document.getElementById('canvas' + name); // Get canvas element for drawing
  // Get tile element link for showing tile image/codestream
	var linkLoadTileElement = document.getElementById('linkLoadTile' + name);
	var linkShowCodestreamElement = document.getElementById('linkShowCodestream' + name);
  
  spanElement.innerHTML = 'webjpip.js...';   // Set span element to webjpip.js...
  // Rename load tile element links
	linkLoadTileElement.innerHTML = 'Reload tile';
	linkShowCodestreamElement.innerHTML = 'Show codestream bytes';
  
	var pendingCodestreamToDecode = null; // Set codestream decode pending variable
	var isPendingCodestreamEndOfProgressiveRendering = false; // Set end of progressive rendering variable

	var isJpxWorking = false; // Set jpx working variable
	var decodeWorker = new Worker('decode.js'); // Create decode worker
	decodeWorker.onmessage = tileDecodedCallback; // On decodeWorker message, call tile decoded callback
  
  // Finish up tile decoding and display rgb image
	function tileDecodedCallback(event) {
		var rgbImage = event.data.arbitraryTile; // Set rgb image
		jpxToCanvas(rgbImage, canvasElement); // Put image on canvas
		
		isJpxWorking = false; // Jpx finished working
    
    // Keep decoding if more progressive rendering
		if (isPendingCodestreamEndOfProgressiveRendering) {
			spanElement.innerHTML = 'Done.';
		} else {
			tryDecodePendingCodestream();
		}
	}
  
  // TODO
	function dataCallback(requestContext, userContextVars) {
		var isDone = !requestContext.tryContinueRequest();
		
		if (!requestContext.hasData()) {
			return;
		}
		
		var useParsedPacketOffsets = true;
		
		var packetsData;
		var codestream = requestContext.createCodestream(
			/*onlyHeaders=*/useParsedPacketOffsets).codestream;
		spanElement.innerHTML = 'jpx.js...';
		
		if (useParsedPacketOffsets) {
			packetsData = requestContext.getAllCodeblocksData();
		} else {
			codestreamPerTile[tileX][tileY] = codestream;
		}
		
		pendingCodestreamToDecode = {
			isPendingCodestreamEndOfProgressiveRendering : isDone,
			codestream : codestream,
			packetsData : packetsData
			};
		tryDecodePendingCodestream();
		
		if (isDone) {
			requestContext.endAsync();
		}
	}
	
	function tryDecodePendingCodestream() {
		if (pendingCodestreamToDecode === null || isJpxWorking) {
			return;
		}
		
		isPendingCodestreamEndOfProgressiveRendering =
			pendingCodestreamToDecode
				.isPendingCodestreamEndOfProgressiveRendering;
		
		decodeWorker.postMessage( {
			bytes: pendingCodestreamToDecode.codestream,
			packetsData : pendingCodestreamToDecode.packetsData
			} );
			
		pendingCodestreamToDecode = null;
	}
	
	var codestreamPartParams = {
		minX : tileX * tileWidth,
		minY : tileY * tileHeight,
		maxXExclusive : (tileX + 1) * tileWidth,
		maxYExclusive : (tileY + 1) * tileHeight,
		numResolutionLevelsToCut : +numResolutionLevelsToCutTxt.value,
		maxNumQualityLayers : +maxNumQualityLayersTxt.value
	};
	
	var requestContext = image.createDataRequest(
		codestreamPartParams,
		dataCallback,
		/*userContextVars=*/null);
	
	dataCallback(requestContext);
}

// Show codestream
function showCodestream(tileX, tileY) {
	var text = '';
	var codestream = codestreamPerTile[tileX][tileY];
	
	for (var i = 0; i < codestream.length; ++i) {
		if (codestream[i] < 16) {
			text += '0';
		}
		text += codestream[i].toString(16) + ' ';
		
		if ((i + 1) % 500 === 0) {
			text += '<br>';
		}
	}
	
	codestreamBytesDiv.innerHTML = text;
}

// Show image
function loadImage() {
	if (image !== null) {
		image.close();
	}
	
	statusDiv.innerHTML = 'Waiting for server...';

	var url = jpipUrlTxt.value;
	var urlFixed = url.replace(/\\/g, '%5C');
	
	image = new jpipCodestreamClient.JpipCodestreamClient();
	image.setStatusCallback(statusCallback);
    image.open(urlFixed);
}

loadImage();