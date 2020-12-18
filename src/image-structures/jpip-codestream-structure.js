'use strict';

var jGlobals = require('j2k-jpip-globals.js');

// 
module.exports = function JpipCodestreamStructure(
    jpipStructureParser,
    jpipFactory,
    progressionOrder) {

    var self = this;
    var params;
    var sizesCalculator;
    
    var defaultTileStructureByEdgeType;

    var cachedTileStructures = [];
    
    // Get sizes parameters
    this.getSizesParams = function getSizesParams() {
        validateParams();
        return params;
    };

    // Get number of X and Y tiles
    this.getNumTilesX = function getNumTilesX() {
        validateParams();
        
        var numTiles = sizesCalculator.getNumTilesX();
        return numTiles;
    };
    
    this.getNumTilesY = function getNumTilesY() {
        validateParams();
        
        var numTiles = sizesCalculator.getNumTilesY();
        return numTiles;
    };

    // Get number of components
    this.getNumComponents = function() {
        validateParams();
        return params.numComponents;
    };
    
    // Get image width and height
    this.getImageWidth = function() {
        validateParams();

        var size = sizesCalculator.getLevelWidth();
        return size;
    };
    
    this.getImageHeight = function() {
        validateParams();

        var size = sizesCalculator.getLevelHeight();
        return size;
    };
    
    // Get level width and height
    this.getLevelWidth = function(level) {
        validateParams();

        var size = sizesCalculator.getLevelWidth(level);
        return size;
    };
    
    this.getLevelHeight = function(level) {
        validateParams();

        var size = sizesCalculator.getLevelHeight(level);
        return size;
    };
    
    // Get tile width and height
    this.getTileWidth = function(level) {
        validateParams();

        var size = sizesCalculator.getTileWidth(level);
        return size;
    };
    
    this.getTileHeight = function(level) {
        validateParams();

        var size = sizesCalculator.getTileHeight(level);
        return size;
    };
    
    // Get first tile offset X and Y
    this.getFirstTileOffsetX = function() {
        validateParams();

        var offset = sizesCalculator.getFirstTileOffsetX();
        return offset;
    };
    
    this.getFirstTileOffsetY = function() {
        validateParams();

        var offset = sizesCalculator.getFirstTileOffsetY();
        return offset;
    };
    
    // Get left or top tile?
    this.getTileLeft = function getTileLeft(
        tileIndex, level) {
        
        validateParams();
        
        var tileX = tileIndex % sizesCalculator.getNumTilesX();
        if (tileX === 0) {
            return 0;
        }
        
        var tileLeft =
            (tileX - 1) * sizesCalculator.getTileWidth(level) +
            sizesCalculator.getFirstTileWidth(level);
        
        return tileLeft;
    };
    
    this.getTileTop = function getTileTop(tileIndex, level) {
        validateParams();
        
        var tileY = Math.floor(tileIndex / sizesCalculator.getNumTilesX());
        if (tileY === 0) {
            return 0;
        }
        
        var tileTop =
            (tileY - 1) * sizesCalculator.getTileHeight(level) +
            sizesCalculator.getFirstTileHeight(level);
        
        return tileTop;
    };
    
    // Get default tile structure?
    this.getDefaultTileStructure = function getDefaultTileStructure() {
        validateParams();
        var result = getDefaultTileStructureInternal({
            horizontalEdgeType: sizesCalculator.EDGE_TYPE_NO_EDGE,
            verticalEdgeType: sizesCalculator.EDGE_TYPE_NO_EDGE
            });
            
        return result;
    };
    
    // Get tile structure
    this.getTileStructure = getTileStructure;

    // Tile position to in class index?
    this.tilePositionToInClassIndex = function(tilePosition) {
        validateParams();
        var tilesX = sizesCalculator.getNumTilesX();
        var tilesY = sizesCalculator.getNumTilesY();
        
        validateArgumentInRange('tilePosition.tileX', tilePosition.tileX, tilesX);
        validateArgumentInRange('tilePosition.tileY', tilePosition.tileY, tilesY);

        var inClassIndex = tilePosition.tileX + tilePosition.tileY * tilesX;
        
        return inClassIndex;
    };

    // Tile in class index to position?
    this.tileInClassIndexToPosition = function(inClassIndex) {
        validateParams();
        var tilesX = sizesCalculator.getNumTilesX();
        var tilesY = sizesCalculator.getNumTilesY();
        var numTiles = tilesX * tilesY;

        validateArgumentInRange('inClassIndex', inClassIndex, tilesX * tilesY);
        
        var tileX = inClassIndex % tilesX;
        var tileY = (inClassIndex - tileX) / tilesX;
        
        var result = {
            tileX: tileX,
            tileY: tileY
            };
        
        return result;
    };
    
    // Get tiles from pixels?
    this.getTilesFromPixels = function getTilesFromPixels(
        codestreamPartParams) {
        
        validateParams();

        return sizesCalculator.getTilesFromPixels(codestreamPartParams);
    };

    // Get size of tiles
    this.getSizeOfTiles = function getSizeOfTiles(tileBounds) {
        validateParams();
        
        var size = sizesCalculator.getSizeOfTiles(tileBounds);
        return size;
    };
    
    function getTileStructure(tileId) {
        validateParams();
        
        var maxTileId =
            sizesCalculator.getNumTilesX() * sizesCalculator.getNumTilesY()- 1;
        
        if (tileId < 0 || tileId > maxTileId) {
            throw new jGlobals.jpipExceptions.ArgumentException(
                'tileId',
                tileId,
                'Expected value between 0 and ' + maxTileId);
        }
        
        var isEdge = sizesCalculator.isEdgeTileId(tileId);
        
        if (cachedTileStructures[tileId] === undefined) {
            var tileParams = jpipStructureParser.parseOverridenTileParams(tileId);
            
            if (!!tileParams) {
                cachedTileStructures[tileId] = createTileStructure(tileParams, isEdge);
            }
            else {
                cachedTileStructures[tileId] = null;
            }
        }
        
        if (cachedTileStructures[tileId]) {
            return cachedTileStructures[tileId];
        }
        
        var result = getDefaultTileStructureInternal(isEdge);
        return result;
    }

    function validateArgumentInRange(paramName, paramValue, suprimumParamValue) {
        if (paramValue < 0 || paramValue >= suprimumParamValue) {
            throw new jGlobals.jpipExceptions.ArgumentException(
                paramName,
                paramValue,
                paramName + ' is expected to be between 0 and ' + suprimumParamValue - 1);
        }
    }
    
    function getDefaultTileStructureInternal(edgeType) {
        if (!defaultTileStructureByEdgeType) {
            var defaultTileParams = jpipStructureParser.parseDefaultTileParams();
            
            defaultTileStructureByEdgeType = new Array(3);
            
            for (var horizontalEdge = 0; horizontalEdge < 3; ++horizontalEdge) {
                defaultTileStructureByEdgeType[horizontalEdge] = new Array(3);
                
                for (var verticalEdge = 0; verticalEdge < 3; ++verticalEdge) {
                    var edge = {
                        horizontalEdgeType: horizontalEdge,
                        verticalEdgeType: verticalEdge
                        };
                    
                    defaultTileStructureByEdgeType[horizontalEdge][verticalEdge] =
                        createTileStructure(defaultTileParams, edge);
                }
            }
        }
        
        var structureByVerticalType =
            defaultTileStructureByEdgeType[edgeType.horizontalEdgeType];
        
        var tileStructure = structureByVerticalType[edgeType.verticalEdgeType];
        
        return tileStructure;
    }
    
    function createTileStructure(tileParams, edgeType) {
        validateParams();
        
        var sizeParams = JSON.parse(JSON.stringify(tileParams));
        
        sizeParams.tileSize = sizesCalculator.getTileSize(edgeType);
        
        sizeParams.defaultComponentParams.scaleX = 1;
        sizeParams.defaultComponentParams.scaleY = 1;
        
        for (var i = 0; i < sizeParams.paramsPerComponent.length; ++i) {
            sizeParams.paramsPerComponent[i].scaleX = params.componentsScaleX[i];
            sizeParams.paramsPerComponent[i].scaleY = params.componentsScaleY[i];
        }
        
        var tileStructure = jpipFactory.createTileStructure(sizeParams, self, progressionOrder);
        
        return tileStructure;
    }
    
    function validateParams(self) {
        if (!params) {
            params = jpipStructureParser.parseCodestreamStructure();
            sizesCalculator = jpipFactory.createLevelCalculator(params);
        }
    }
    
    return this;
};