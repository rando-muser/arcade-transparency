//% color=#1B9AAA weight=1 icon="\uf2a8"  block="Transparency"
namespace transparency {
    //% whenUsed
    const transparencyPlaceholder = image.create(1, 1);
    //% whenUsed
    let transparentSprites = [sprites.create(transparencyPlaceholder)];
    //% whenUsed
    let transparentImages = [transparencyPlaceholder];
    //% whenUsed
    const hexNums = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "A", "B", "C", "D", "E", "F"];
    //% whenUsed
    let colorCache = control.createBuffer(256);
    //% whenUsed
    let colorCacheList = [colorCache];
    //% whenUsed
    let colorCacheOpacities = [50];

    sprites.destroy(transparentSprites[0]);
    transparentSprites.pop();
    transparentImages.pop();

    //% whenUsed
    let pal = palleteToRGB(color.currentPalette());
    
    //Code credit to @richard!
    function unpackColor(color: number) {
        const blue = color & 0xff
        const green = (color >> 8) & 0xff
        const red = color >> 16;
        return [red, green, blue]
    }

    function palleteToRGB(p: color.Palette) {
        let tempArray = [[0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0]];
        for (let x = 1; x < 16; x++) {
            let color = p.color(x);
            tempArray[x - 1] = unpackColor(color);
        }
        return (tempArray);
    }

    function getColor(x: number, y: number) {
        let newx = x % 16;
        let newy = y % 16;
        let tile = tiles.getTileAt(x / 16, y / 16);
        if (tile) {
            if (tile.getPixel(newx, newy) != 0) {
                return (tile.getPixel(newx, newy));
            }
        }
        if (scene.backgroundImage() && scene.backgroundImage().getPixel(newx, newy) != 0) {
            return (scene.backgroundImage().getPixel(newx, newy));
        }
        if (scene.backgroundColor() && scene.backgroundColor() != 0) {
            return (scene.backgroundColor());
        }
        return (15);
    }

    //Code credit to @richard!
    //% block="Cache the opacity $opacity" 
    export function cacheOpacity(opacity: number) {
        colorCacheOpacities.push(opacity);
        colorCacheList.push(control.createBuffer(256));
    }

    //Code credit to @richard!
    //takes indeces as 16-pallete, outputs in 16-pallete
    function lookupColor(spriteColorIndex: number, backgroundColorIndex: number, opacityIndex: number) {
        let pos = colorCacheOpacities.indexOf(opacityIndex);
        let currentCache = colorCacheList[pos];
        const cacheIndex = (spriteColorIndex * 16) + backgroundColorIndex;

        if (currentCache[cacheIndex] === 0) {
            currentCache[cacheIndex] = calculateLowestDistanceColor(spriteColorIndex, backgroundColorIndex, opacityIndex)
        }

        return currentCache[cacheIndex]
    }

    //takes inputs as 16-pallete, outputs in 16-pallete
    function calculateLowestDistanceColor(colorNum: number, toNum: number, opacity: number) {
        let color = pal[colorNum - 1];
        let to = pal[toNum - 1];
        let co = 2 * opacity / 100

        let mix = [(co * color[0] + (2 - co) * to[0]) / 2, (co * color[1] + (2 - co) * to[1]) / 2, (co * color[2] + (2 - co) * to[2]) / 2];
        let distance = 1023;
        let index = 0;
        let tempNum = 0;

        //now find the color matching that rbg closest 
        for (let j = 0; j < 15; j++) {
            tempNum = Math.sqrt(Math.pow(mix[0] - pal[j][0], 2) + Math.pow(mix[1] - pal[j][1], 2) + Math.pow(mix[2] - pal[j][2], 2));
            if (tempNum < distance) {
                distance = tempNum;
                index = j;
                if (distance == 0) {
                    break;
                }
            }
        }

        return (index + 1);
    }

    function updateTransparency() {
        for (let i = 0; i < transparentSprites.length; i++) {
            if (transparentSprites[i]) {
                let s = transparentSprites[i];
                let o = s.data[OPACITY_KEY];
                let c = colorCacheOpacities.indexOf(o);

                //now loop through image
                drawing.renderOnSprite(s, drawing.RenderOrder.Below, () => {
                    for (let y = 0; y < s.image.height; y++) {
                        for (let x = 0; x < s.image.width; x++) {
                            if (transparentImages[i].getPixel(x, y) != 0) {
                                let tempNum = transparentImages[i].getPixel(x, y);
                                //let tempNum2 = getColor(Math.round(s.x) + x - (Math.ceil(s.image.width / 2)), Math.round(s.y) + y - Math.ceil(s.image.height / 2));
                                let tempNum2 = screen.getPixel(Math.round(s.x) + x - (Math.ceil(s.image.width / 2)), Math.round(s.y) + y - Math.ceil(s.image.height / 2))

                                let index = 0;
                                if (c != -1) {
                                    index = lookupColor(tempNum, tempNum2, o);
                                }
                                else {
                                    index = calculateLowestDistanceColor(tempNum, tempNum2, o)
                                }

                                //now set the pixel to that getColor
                                s.image.setPixel(x, y, index);
                            }
                        }
                    }
                    s.data[CACHED_IMAGE_KEY] = s.image;
                    s.data[CACHED_REVISION_KEY] = s.image.revision();
                })
            }
            else {
                // It doesn't exist anymore, get rid of it
                transparentSprites.removeAt(i);
            }
        }
    }

    //% block="Make $sprite transparent || with opacity $opacity"
    //% opacity.min=0 opacity.max=100
    //% opacity.defl=50
    //% sprite.defl=mySprite
    //% sprite.shadow=variables_get
    export function make(sprite: Sprite, opacity?: number) {
        if (transparentSprites.indexOf(sprite) != -1) {
            remove(sprite);
        }
        transparentImages.push(sprite.image.clone());
        transparentSprites.push(sprite);
        sprite.data[CACHED_IMAGE_KEY] = sprite.image;
        sprite.data[CACHED_REVISION_KEY] = sprite.image.revision();
        sprite.data[OPACITY_KEY] = opacity;
    }

    //% block="Remove transparency on $sprite"
    //% sprite.defl=mySprite
    //% sprite.shadow=variables_get
    export function remove(sprite: Sprite) {
        if (transparentSprites.indexOf(sprite) != -1) {
            let index = transparentSprites.indexOf(sprite);
            sprite.setImage(transparentImages[index]);
            transparentImages.removeAt(index);
            transparentSprites.removeAt(index);
        }
    }

    //% block="Toggle transparency on $sprite"
    //% sprite.defl=mySprite
    //% sprite.shadow=variables_get
    export function toggle(sprite: Sprite) {
        let index = transparentSprites.indexOf(sprite);
        if (index == -1) {
            if (sprite.data[OPACITY_KEY]) {
                make(sprite, sprite.data[OPACITY_KEY]);
            }
            else {
                make(sprite, 50);
            }
        }
        else {
            remove(sprite);
        }
    }

    //% block="Is $sprite transparent"
    export function isTransparent(sprite: Sprite) {
        let index = transparentSprites.indexOf(sprite);
        if (index == -1) {
            return(false);
        }
        else {
            return(true);
        }
    }

    /*spriteutils.addEventHandler(spriteutils.UpdatePriorityModifier.Before, spriteutils.UpdatePriority.RenderSprites, function () {
        updateTransparency();
    })*/

    //% whenUsed
    const CACHED_IMAGE_KEY = "CACHED_IMAGE";
    //% whenUsed
    const CACHED_REVISION_KEY = "CACHED_REVISION";
    //% whenUsed
    const OPACITY_KEY = "OPACITY";

    for (let i = 0; i < transparentSprites.length; i++) {
        if (transparentSprites[i]) {
            let s = transparentSprites[i];
            let o = s.data[OPACITY_KEY];
            let c = colorCacheOpacities.indexOf(o);

            //now loop through image
            drawing.renderOnSprite(s, drawing.RenderOrder.Below, () => {
                for (let y = 0; y < s.image.height; y++) {
                    for (let x = 0; x < s.image.width; x++) {
                        if (transparentImages[i].getPixel(x, y) != 0) {
                            let tempNum = transparentImages[i].getPixel(x, y);
                            //let tempNum2 = getColor(Math.round(s.x) + x - (Math.ceil(s.image.width / 2)), Math.round(s.y) + y - Math.ceil(s.image.height / 2));
                            let tempNum2 = screen.getPixel(Math.round(s.x) + x - (Math.ceil(s.image.width / 2)), Math.round(s.y) + y - Math.ceil(s.image.height / 2))

                            let index = 0;
                            if (c != -1) {
                                index = lookupColor(tempNum, tempNum2, o);
                            }
                            else {
                                index = calculateLowestDistanceColor(tempNum, tempNum2, o)
                            }

                            //now set the pixel to that getColor
                            s.image.setPixel(x, y, index);
                        }
                    }
                }
                s.data[CACHED_IMAGE_KEY] = s.image;
                s.data[CACHED_REVISION_KEY] = s.image.revision();
            })
        }
        else {
            // It doesn't exist anymore, get rid of it
            transparentSprites.removeAt(i);
        }
    }

    //Code credit to @richard!
    game.onUpdate(function () {
        for (let a = 0; a < transparentSprites.length; a++) {
            let z = transparentSprites[a];
            if (
                z.image !== z.data[CACHED_IMAGE_KEY] ||
                z.image.revision() !== z.data[CACHED_REVISION_KEY]
            ) {
                z.data[CACHED_IMAGE_KEY] = z.image;
                z.data[CACHED_REVISION_KEY] = z.image.revision();
                transparentImages[a] = z.image.clone();
                z.setImage(z.image.clone());
            }
        }
    })
}

