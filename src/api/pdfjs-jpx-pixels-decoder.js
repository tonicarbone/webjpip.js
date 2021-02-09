'use strict';

module.exports = PdfjsJpxPixelsDecoder;

var PdfjsJpxContextPool = require('pdfjs-jpx-context-pool.js');

function PdfjsJpxPixelsDecoder() {
    this._contextPool = new PdfjsJpxContextPool();
}

/**
 * 
 * @param {object} data 
 */
PdfjsJpxPixelsDecoder.prototype.start = function start(data) {
    var self = this;
    return new Promise(function(resolve, reject) {
        var image = self._contextPool.image;
        var currentContext = self._contextPool.getContext(data.headersCodestream);

        var regionToParse = {
            left  : data.offsetInRegion.offsetX,
            top   : data.offsetInRegion.offsetY,
            right : data.offsetInRegion.offsetX + data.offsetInRegion.width,
            bottom: data.offsetInRegion.offsetY + data.offsetInRegion.height
        };
        
        var imageTilesX = data.imageTilesX;
        var boundsTilesX = data.tilesBounds.maxTileXExclusive - data.tilesBounds.minTileX;
        var minTileX = data.tilesBounds.minTileX;
        var minTileY = data.tilesBounds.minTileY;
        
        for (var i = 0; i < data.precinctCoefficients.length; ++i) {
            var coeffs = data.precinctCoefficients[i];
            
            var imageTileIndex = coeffs.key.tileIndex;
            var imageTileX = imageTileIndex % imageTilesX;
            var imageTileY = Math.floor(imageTileIndex / imageTilesX);
            var inBoundsTileX = imageTileX - minTileX;
            var inBoundsTileY = imageTileY - minTileY;
            var inBoundsTileIndex = inBoundsTileX + (inBoundsTileY * boundsTilesX);
            
            image.setPrecinctCoefficients(
                currentContext,
                coeffs.coefficients,
                inBoundsTileIndex,
                coeffs.key.component,
                coeffs.key.resolutionLevel,
                coeffs.key.precinctIndexInComponentResolution);
        }
        
        image.decode(currentContext, { regionToParse: regionToParse });

        var result = self._copyTilesPixelsToOnePixelsArray(image.tiles, regionToParse, image.componentsCount);
        resolve(result);
    });
};

/**
 * Copy tiles pixels to one pixels array.
 * @param {Array} tiles 
 * @param {object} resultRegion Left, top, right and bottom indices.
 * @param {number} componentsCount Number of components.
 */
PdfjsJpxPixelsDecoder.prototype._copyTilesPixelsToOnePixelsArray =
    function copyTilesPixelsToOnePixelsArray(tiles, resultRegion, componentsCount) {
        
    var firstTile = tiles[0];
    var width = resultRegion.right - resultRegion.left;
    var height = resultRegion.bottom - resultRegion.top;
    
    //if (firstTile.left === resultRegion.left &&
    //    firstTile.top === resultRegion.top &&
    //    firstTile.width === width &&
    //    firstTile.height === height &&
    //    componentsCount === 4) {
    //    
    //    return firstTile;
    //}
    
    var result = new ImageData(width, height);
      
    var bytesPerPixel = 4; // 4 components per pixel - RGBA
    var rgbaImageStride = width * bytesPerPixel; // Image 'stride'
    
    var tileIndex = 0;
    
    //for (var x = 0; x < numTilesX; ++x) {

    for (var i = 0; i < tiles.length; ++i) {
        var tileRight = tiles[i].left + tiles[i].width;
        var tileBottom = tiles[i].top + tiles[i].height;
        
        var intersectionLeft = Math.max(resultRegion.left, tiles[i].left);
        var intersectionTop = Math.max(resultRegion.top, tiles[i].top);
        var intersectionRight = Math.min(resultRegion.right, tileRight);
        var intersectionBottom = Math.min(resultRegion.bottom, tileBottom);
        
        var intersectionWidth = intersectionRight - intersectionLeft;
        var intersectionHeight = intersectionBottom - intersectionTop;
        
        if (intersectionLeft !== tiles[i].left ||
            intersectionTop !== tiles[i].top ||
            intersectionWidth !== tiles[i].width ||
            intersectionHeight !== tiles[i].height) {
            
            throw 'Unsupported tiles to copy';
        }
        
        var tileOffsetXPixels = intersectionLeft - resultRegion.left;
        var tileOffsetYPixels = intersectionTop - resultRegion.top;
            
        var tileOffsetBytes =
            tileOffsetXPixels * bytesPerPixel +
            tileOffsetYPixels * rgbaImageStride;

        this._copyTile(
            result.data, tiles[i], tileOffsetBytes, rgbaImageStride, componentsCount);
    }
    
    return result;
};

/**
 * Horizontally stride through pixels to form targetImage over region.
 * @param {number[]} targetImage 
 * @param {object} tile 
 * @param {number} targetImageStartOffset Where to start copying tiles in the target image.
 * @param {number} targetImageStride 
 * @param {*} componentsCount Number of components in tile.
 */
PdfjsJpxPixelsDecoder.prototype._copyTile = function copyTile(
    targetImage, tile, targetImageStartOffset, targetImageStride, componentsCount) {
    
    // RGB offsets
    var rOffset = 0;
    var gOffset = 1;
    var bOffset = 2;
    var pixelsOffset = 1; // ??
    
    // Let pixels be tile.pixels if defined, otherwise tile.items
    var pixels = tile.pixels || tile.items;
    
    // Calculate components if undefined
    if (componentsCount === undefined) {
        componentsCount = pixels.length / (tile.width * tile.height);
    }
    
    // Perform offsets depending on number of components
    switch (componentsCount) {
        case 1:
            gOffset = 0; // Greyscale
            bOffset = 0;
            break;
        
        case 3:
            pixelsOffset = 3; // RGB
            break;
            
        case 4:
            pixelsOffset = 4; // RGBa
            break;
            
        default:
            throw 'Unsupported components count ' + componentsCount; // This is throwing for Dingo files w/ 1000 components
    }
    
    var targetImageIndex = targetImageStartOffset; // ??
    var pixel = 0; // Which pixel??
    for (var y = 0; y < tile.height; ++y) {
        var targetImageStartLine = targetImageIndex; // ??
        
        for (var x = 0; x < tile.width; ++x) {
            targetImage[targetImageIndex + 0] = pixels[pixel + rOffset];
            targetImage[targetImageIndex + 1] = pixels[pixel + gOffset];
            targetImage[targetImageIndex + 2] = pixels[pixel + bOffset];
            targetImage[targetImageIndex + 3] = 255;
            
            pixel += pixelsOffset;
            targetImageIndex += 4;
        }
        
        targetImageIndex = targetImageStartLine + targetImageStride;
    }
};