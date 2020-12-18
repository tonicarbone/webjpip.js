'use strict';

var jGlobals = require('j2k-jpip-globals.js');

/**
 * 
 * @param {number} maxChannelsInSession - max permissible channels in session
 * @param {number} maxRequestsWaitingForResponseInChannel - max requests waiting for response in channel
 * @param {*} knownTargetId 
 * @param {*} codestreamStructure 
 * @param {*} databinsSaver 
 * @param {*} setIntervalFunction 
 * @param {*} clearIntervalFunction 
 * @param {object} jpipFactory - jpipRuntimeFactory object
 */
module.exports = function JpipSession(
    maxChannelsInSession,
    maxRequestsWaitingForResponseInChannel,
    knownTargetId,
    codestreamStructure,
    databinsSaver,
    setIntervalFunction,
    clearIntervalFunction,
    jpipFactory) {

    // Time constants
    var SECOND = 1000;
    var KEEP_ALIVE_INTERVAL = 30 * SECOND;
    
    // URLs - recall URL = base URL + channel management URL + data request URL
    var channelManagementUrl; // Base channel management URL
    var dataRequestUrl; // Specific data request URL
    var closeSessionUrl; // URL to close session
    
    // ??
    var isCloseCalled = false;
    var closeCallbackPending = null;

    // ??
    var sessionHelper = null;
    var statusCallback = null;
    var requestEndedCallback = null;

    // Channel variables
    var nonDedicatedChannels = [];
    var channelsCreated = 0;
    var keepAliveIntervalHandle = null;
    
    /**
     * Open session
     * @param {string} baseUrl
     */
    this.open = function open(baseUrl) {
        
        // Throw exception if called twice
        if (sessionHelper !== null) {
            throw new jGlobals.jpipExceptions.InternalErrorException(
                'session.open() should be called only once');
        }

        // Set query joiners
        var queryParamsDelimiter = baseUrl.indexOf('?') < 0 ? '?' : '&';
        
        // Make channel management URL, whether by tile or precint
        channelManagementUrl = baseUrl + queryParamsDelimiter + 'type=' + 
            (databinsSaver.getIsJpipTilePartStream() ? 'jpt-stream' : 'jpp-stream');
        
        // Make final data request URL
        dataRequestUrl = channelManagementUrl + '&stream=0';
        
        // Create session helper
        sessionHelper = jpipFactory.createSessionHelper(
            dataRequestUrl, knownTargetId, codestreamStructure, databinsSaver);
        
        // If theres a status callback, set status callback??
        if (statusCallback !== null) {
            sessionHelper.setStatusCallback(statusCallback);
        }
        
        // If theres a request ended callback, set request ended callback??
        if (requestEndedCallback !== null) {
            sessionHelper.setRequestEndedCallback(requestEndedCallback);
        }
        
        var channel = createChannel(); // Create channel
        
        channel.sendMinimalRequest(sessionReadyCallback); // 
    };
    
    this.getTargetId = function getTargetId() {
        ensureReady();
        return sessionHelper.getTargetId();
    };
    
    this.getIsReady = function getIsReady() {
        var isReady = sessionHelper !== null && sessionHelper.getIsReady();
        return isReady;
    };
    
    this.setStatusCallback = function setStatusCallback(statusCallback_) {
        statusCallback = statusCallback_;
        
        if (sessionHelper !== null) {
            sessionHelper.setStatusCallback(statusCallback_);
        }
    };
    
    this.setRequestEndedCallback = function setRequestEndedCallback(
        requestEndedCallback_) {
        
        requestEndedCallback = requestEndedCallback_;
        
        if (sessionHelper !== null) {
            sessionHelper.setRequestEndedCallback(requestEndedCallback_);
        }
    };
    
    this.hasActiveRequests = function hasActiveRequests() {
        ensureReady();

        var isActiveRequests = sessionHelper.getActiveRequestsCount() > 0;
        return isActiveRequests;
    };
    
    this.tryGetChannel = function tryGetChannel(dedicateForMovableRequest) {
        ensureReady();
        
        var canCreateNewChannel = channelsCreated < maxChannelsInSession;
        var searchOnlyChannelWithEmptyQueue =
            canCreateNewChannel || dedicateForMovableRequest;
        
        var maxRequestsInChannel = searchOnlyChannelWithEmptyQueue ?
            0 : maxRequestsWaitingForResponseInChannel - 1;

        var channel = getChannelWithMinimalWaitingRequests(
            maxRequestsInChannel,
            /*isExtractFromNonDedicatedList=*/dedicateForMovableRequest);
        
        if (channel === null && canCreateNewChannel) {
            channel = createChannel(dedicateForMovableRequest);
        }
        
        if (dedicateForMovableRequest && channel !== null) {
            channel.dedicateForMovableRequest();
        }
        
        return channel;
    };
    
    this.close = function close(closedCallback) {
        if (channelsCreated === 0) {
            throw new jGlobals.jpipExceptions.InternalErrorException(
                'Cannot close session before open');
        }

        if (isCloseCalled) {
            throw new jGlobals.jpipExceptions.InternalErrorException(
                'Cannot close session twice');
        }
        
        isCloseCalled = true;
        closeCallbackPending = closedCallback;
        
        if (closeSessionUrl !== undefined) {
            closeInternal();
        }
    };
    
    // Close session (internals)
    function closeInternal() {
        // If channel is to be kept alive, clear interval function
        if (keepAliveIntervalHandle !== null) {
            clearIntervalFunction(keepAliveIntervalHandle);
        }
        
        sessionHelper.setIsReady(false); // Set session to not ready
        sessionHelper.sendAjax(closeSessionUrl, closeCallbackPending); // Send close session request
    }
    
    // Create and return new channel
    function createChannel(isDedicatedForMovableRequest) {
        ++channelsCreated;
        var channel = jpipFactory.createChannel(
            maxRequestsWaitingForResponseInChannel, sessionHelper);
        
        sessionHelper.channelCreated(channel);
        
        if (!isDedicatedForMovableRequest) {
            nonDedicatedChannels.push(channel);
        }

        return channel;
    }
    
    function getChannelWithMinimalWaitingRequests(
        maxRequestsInChannel, isExtractFromNonDedicatedList) {
        
        var channel = null;
        var index;
        var minimalWaitingRequests = maxRequestsInChannel + 1;
        
        for (var i = 0; i < nonDedicatedChannels.length; ++i) {
            var waitingRequests =
                nonDedicatedChannels[i].getAllQueuedRequestCount();
            
            if (waitingRequests < minimalWaitingRequests) {
                channel = nonDedicatedChannels[i];
                index = i;
                minimalWaitingRequests = waitingRequests;
            }
            
            if (waitingRequests === 0) {
                break;
            }
        }
        
        if (!isExtractFromNonDedicatedList || channel === null) {
            return channel;
        }
        
        nonDedicatedChannels[index] =
            nonDedicatedChannels[nonDedicatedChannels.length - 1];
        nonDedicatedChannels.length -= 1;
        
        return channel;
    }
    
    // Session ready callback function, runs after session is ready
    function sessionReadyCallback() {

        // Set main header databin and check main header is loading
        var mainHeaderDatabin = databinsSaver.getMainHeaderDatabin();
        if (!mainHeaderDatabin.isAllDatabinLoaded()) {
            throw new jGlobals.jpipExceptions.IllegalDataException(
                'Main header was not loaded on session creation');
        }
        
        // Set arbitrary channel and channel ID
        var arbitraryChannel = sessionHelper.getFirstChannel();
        var arbitraryChannelId = arbitraryChannel.getChannelId();
        
        // Set close session URL
        closeSessionUrl = channelManagementUrl +
            '&cclose=*' +
            '&cid=' + arbitraryChannelId;
        
        // If close() was called, close internal and send session close request
        if (isCloseCalled) {
            closeInternal();
            return;
        }
        
        if (arbitraryChannelId === null) {
            return; // Failure indication already returned in JpipRequest
        }
        
        // Keep alive handle
        keepAliveIntervalHandle = setIntervalFunction(
            keepAliveHandler, KEEP_ALIVE_INTERVAL);
        
        sessionHelper.setIsReady(true); // Set session ready to true
    }
    
    // If no active requests, send minimal request to keep alive
    function keepAliveHandler() {
        if (sessionHelper.getActiveRequestsCount() > 0) {
            return;
        }
        
        var arbitraryChannel = sessionHelper.getFirstChannel();
        arbitraryChannel.sendMinimalRequest(function dummyCallback() {});
    }
    
    // Throw exception if session is not ready
    function ensureReady() {
        if (sessionHelper === null || !sessionHelper.getIsReady()) {
            throw new jGlobals.jpipExceptions.InternalErrorException('Cannot perform ' +
                'this operation when the session is not ready');
        }
    }
};