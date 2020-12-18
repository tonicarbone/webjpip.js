var jpipUrlText = document.getElementById('jpipUrlText');
var button = document.getElementById('button');
var errorDiv = document.getElementById('errorDiv');
var output = document.getElementById('output');

button.onclick = function() {
  errorDiv.innerHTML = 'Button has been clicked!';
  output.innerHTML = 'Button has been clicked!';
};