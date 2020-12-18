'use strict';

JpipSessionMock.dedicatedChannelToReturnForTest = 'Dummy dedicatedChannel';

function JpipSessionMock(targetId) {
    var mock = new MockHelper(this);
    
    // Add JpipSession functions to mock object
    mock.addFunction(
        'setStatusCallback', ['statusCallback'], /*allowNotReturnValue=*/true);
    
    mock.addFunction(
        'setRequestEndedCallback',
        ['requestEndedCallback'],
        /*allowNotReturnValue=*/true);
    
    mock.addFunction('open', ['url'], /*allowNotReturnValue=*/true);
    
    mock.addFunction('close', /*argNames=*/[], /*allowNotReturnValue=*/true);
    
    mock.addFunction(
        'getIsReady', /*argNames=*/[], /*allowNotReturnValue=*/true);
    
    mock.addFunction('hasActiveRequests');
    
    mock.addFunction('tryGetChannel', ['dedicateForMovableRequest']);
    
    mock.addFunction('stopRequestAsync', /*argNames=*/['request']);
    
    // Define getter of last call
    mock.defineGetterOfLastCall(
        'statusCallbackForTest', 'setStatusCallback', 'statusCallback');
    
    mock.defineGetterOfLastCall(
        'requestEndedCallbackForTest',
        'setRequestEndedCallback',
        'requestEndedCallback');
    
    this.getTargetId = function getTargetId() {
        return targetId;
    };
}