// Html elements
var jpipUrlText = document.getElementById('jpipUrlText');
var button = document.getElementById('button');
var errorDiv = document.getElementById('errorDiv');
var output = document.getElementById('output');

var jpipFactory = require('jpip-runtime-factory');

// Constants
const MAX_CHANNELS_IN_SESSION = 1;
const MAX_REQUESTS_WAITING_FOR_RESPONSE_IN_CHANNEL = 20;

// Create necassary classes
var databinsSaver = jpipFactory.createDatabinsSaver(true);
var offsetsCalculator = jpipFactory.createOffsetsCalculator()
var headerModifier = jpipFactory.createHeaderModifier()
var codestreamStructure = jpipFactory.createCodestreamStructure(databinsSaver, )
var reconnectableRequester = jpipFactory.createReconnectableRequester(
  MAX_CHANNELS_IN_SESSION,
  MAX_REQUESTS_WAITING_FOR_RESPONSE_IN_CHANNEL,

)