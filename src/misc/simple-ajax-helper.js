'use strict';

var jGlobals = require('j2k-jpip-globals.js');

module.exports = {
    /**
     * Sends Ajax request and returns Ajax response
     * @param {string} url 
     * @param {function} callbackForAsynchronousRequest - successful callback
     * @param {function} failureCallbackForAsynchronousRequest - failure callback
     * @param {number} progressiveRequestQuantBytes - quantity of bytes in progressive response
     */
    request: function request(
        url,
        callbackForAsynchronousRequest,
        failureCallbackForAsynchronousRequest,
        progressiveRequestQuantBytes) {
        
        var ajaxResponse = new XMLHttpRequest(); // Create XMLHttp request
        var isSynchronous = callbackForAsynchronousRequest === undefined; // Is synchronous

        var isFinishedRequest = false; // Is the request finished?
        var bytesRecievedOnLastQuant = 0; // Bytes received on last quant??
        
        function internalAjaxCallback(e) {
            if (isFinishedRequest) {
                return;
            }
            
            if (ajaxResponse.readyState !== 4) {
                if (progressiveRequestQuantBytes === undefined ||
                    ajaxResponse.response === null ||
                    ajaxResponse.readyState < 3) {
                    
                    return;
                }
                
                var bytesRecieved = ajaxResponse.response.byteLength;
                var bytesTillLastQuant = bytesRecieved - bytesRecievedOnLastQuant;
                
                if (bytesTillLastQuant < progressiveRequestQuantBytes) {
                    return;
                }
                
                bytesRecievedOnLastQuant = bytesRecieved;
            } else {
                isFinishedRequest = true;
                
                if (ajaxResponse.status !== 200 ||
                    ajaxResponse.response === null) {
                    
                    failureCallbackForAsynchronousRequest(ajaxResponse);
                    return;
                }
            }
            
            if (!isSynchronous) {
                callbackForAsynchronousRequest(ajaxResponse, isFinishedRequest);
            }
        }
        
        ajaxResponse.open('GET', url, !isSynchronous);
        ajaxResponse.onreadystatechange = internalAjaxCallback;
        
        if (!isSynchronous) {
            // Not supported for synchronous requests
            ajaxResponse.mozResponseType = ajaxResponse.responseType = 'arraybuffer';
        }

        if (progressiveRequestQuantBytes !== undefined) {
            ajaxResponse.setRequestHeader('X-Content-Type-Options', 'nosniff');
            ajaxResponse.onprogress = internalAjaxCallback;
        }
        
        ajaxResponse.send(null);

        if (isSynchronous && !isFinishedRequest) {
            throw new jGlobals.jpipExceptions.InternalErrorException(
                'synchronous ajax call was not finished synchronously');
        }
        
        return ajaxResponse;
    }
};