var jpipUrlText = document.getElementById('jpipUrlText');
var button = document.getElementById('button');
var errorDiv = document.getElementById('errorDiv');
var output = document.getElementById('output');

// var JpipSession = require('jpip-session');
var jpipFactory = require('jpip-runtime-factory');

var databinsSaver = jpipFactory.createDatabinsSaver(true);
var session = jpipFactory.createSession(1, 10, 0, {}, databinsSaver);

session.open('http://localhost:8888/notebooks/w3schools_notes.ipynb');