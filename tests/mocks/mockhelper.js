'use strict';

/**
 * Help create mock objects by creating mockObject log properties regarding its arguments
 * and returns the result of the function.
 * @constructor
 * @param {*} mockObject 
 * @returns {any} - result of function
 */
var MockHelper = function MockHelper(mockObject) {
    var FUNCTION_NOT_RETURNS_VALUE_PLACEHOLDER = {}; // Placeholder for function return if it does not return
    
    var argNamesByFunction = {}; // Argument names by function
    
    mockObject.namedArgsLogByFunctionForTest = {}; // Named argument logs
    mockObject.enumeratedArgsLogByFunctionForTest = {}; // Enumerated argument logs
    
    // Clear for test
    clearForTest();
    
    this.clearForTest = clearForTest;
    
    /**
     * Add function to mock object
     * @param {string} functionName - The name of the function
     * @param {[string]} argNames  - The names of the arguments
     * @param {boolean} allowNotReturnValue - Does the function to be tested allow no return
     */
    this.addFunction = function addFunction(
        functionName, argNames, allowNotReturnValue) {
        
        // If function allows no return, place placeholder as result
        if (allowNotReturnValue) {
            mockObject.resultByFunctionForTest[functionName] =
                FUNCTION_NOT_RETURNS_VALUE_PLACEHOLDER;
        }
        
        // If no arguments make empty lists
        argNamesByFunction[functionName] = argNames || [];
        mockObject.namedArgsLogByFunctionForTest[functionName] = [];
        mockObject.enumeratedArgsLogByFunctionForTest[functionName] = [];
        
        // Return result and push argument name and value to logs
        mockObject[functionName] = function mockedFunction(
            arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7) {
            
            return callMockFunctionAndLogArgs(
                functionName, arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7);
        };
    };
    
    /**
     * Define getter of last call of ???
     * @param {any} property 
     * @param {function} setterFunction 
     * @param {} argument 
     * @returns {object} 
     */
    this.defineGetterOfLastCall = function defineGetterOfLastCall(
        property, setterFunction, argument) {
        
        Object.defineProperty(mockObject, property, {
            get: function getCallback() {
                var allStatusCallbacksSet = this.namedArgsLogByFunctionForTest[
                    setterFunction];
                
                var length = allStatusCallbacksSet.length;
                if (length === 0) {
                    throw 'No ' + argument + ' set. Fix test or implementation';
                }
                
                return allStatusCallbacksSet[length - 1][argument];
            }
        });
    };
    
    /**
     * Call the mock function, log its arguments, return the function return value
     * @param {*} functionName - The name of the function
     * @param {*} arg0 
     * @param {*} arg1 
     * @param {*} arg2 
     * @param {*} arg3 
     * @param {*} arg4 
     * @param {*} arg5 
     * @param {*} arg6 
     * @param {*} arg7 
     */
    function callMockFunctionAndLogArgs(
        functionName, arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7) {
        
        var argsArray = [arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7]; // Form array of arguments
        var argNames = argNamesByFunction[functionName]; // Set array of argument names
        var argsByName = {};
        
        // Create object {argumentName: argumentValue}
        for (var i = 0; i < argNames.length; ++i) {
            argsByName[argNames[i]] = argsArray[i];
        }
        
        var result = mockObject.resultByFunctionForTest[functionName]; // Set result of function
        
        if (result === undefined) {
            throw 'No Mock.resultByFunctionForTest.' + functionName +
                ' set. Fix test';
        } else if (result === FUNCTION_NOT_RETURNS_VALUE_PLACEHOLDER) {
            result = undefined;
        }

        // Push argument names and values to logs
        mockObject.namedArgsLogByFunctionForTest[functionName].push(argsByName);
        mockObject.enumeratedArgsLogByFunctionForTest[functionName].push(argsArray.slice(0, argNames.length));
        
        return result;
    }
    
    // Clear for test, both argument logs and result
    function clearForTest() {
        clearDictionaryOfArrays(mockObject.namedArgsLogByFunctionForTest);
        clearDictionaryOfArrays(mockObject.enumeratedArgsLogByFunctionForTest);
        mockObject.resultByFunctionForTest = {};
    }
    
    // Clear dictionary/object of arrays
    function clearDictionaryOfArrays(dictionary) {
        for (var key in dictionary) {
            dictionary[key] = [];
        }
    }
};