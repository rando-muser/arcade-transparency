//% color=#1B9AAA weight=1 icon="\uf2a8"  block="Transparency"
namespace transparency {
    const transparencyPlaceholder = image.create(1, 1);
    let transparentSprites = [sprites.create(transparencyPlaceholder)];
    let transparentImages = [transparencyPlaceholder];
    const hexNums = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "A", "B", "C", "D", "E", "F"];
    sprites.destroy(transparentSprites[0]);
    transparentSprites.pop();
    transparentImages.pop();

    let pal = palleteToRGB(color.currentPalette());

    function decToHex(dec: number) {
        let tempString = "";
        let num = dec;
        while (true) {
            tempString = hexNums[num % 16] + tempString;
            num = Math.floor(num / 16);
            if (num == 0) {
                break;
            };
        }
        return (tempString);
    }

    function hexToRgb(hex: string) {
        while (true) {
            if (hex.length < 6) {
                hex = "0" + hex;
            }
            else {
                break;
            }
        }
        let tempArray = [0, 0, 0];
        for (let i = 0; i < 3; i++) {
            tempArray[i] = hexNums.indexOf(hex[i * 2]) * 16 + hexNums.indexOf(hex[i * 2 + 1]);
        }
        return (tempArray);
    }

    function palleteToRGB(p: color.Palette) {
        let tempArray = [[0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0]];
        for (let x = 1; x < 16; x++) {
            let color = p.color(x);
            tempArray[x - 1] = hexToRgb(decToHex(color));
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

    function updateTransparency() {
        for (let i = 0; i < transparentSprites.length; i++) {
            if (transparentSprites[i]) {
                let s = transparentSprites[i];
                let co = (2 * s.data[OPACITY_KEY]) / 100;

                //now loop through image
                for (let y = 0; y < s.image.height; y++) {
                    for (let x = 0; x < s.image.width; x++) {
                        if (transparentImages[i].getPixel(x, y) != 0) {

                            let color = pal[transparentImages[i].getPixel(x, y) - 1];
                            let tempNum2 = getColor(Math.round(s.x) + x - (Math.ceil(s.image.width / 2)), Math.round(s.y) + y - Math.ceil(s.image.height / 2)) - 1;
                            let to = pal[tempNum2];

                            let mix = [(co*color[0] + (2 - co) * to[0])/2, (co*color[1] + (2 - co) * to[1])/2, (co*color[2] + (2 - co) * to[2])/2];
                            let distance = 1023;
                            let index = 0;
                            let tempNum = 0;
                            let step = [0, 0, 0];

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

                            //now set the pixel to that getColor
                            s.image.setPixel(x, y, index + 1);
                        }
                    }
                }
                s.data[CACHED_IMAGE_KEY] = s.image;
                s.data[CACHED_REVISION_KEY] = s.image.revision();
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
            make(sprite, 50);
        }
        else {
            remove(sprite);
        }
    }

    spriteutils.addEventHandler(spriteutils.UpdatePriorityModifier.Before, spriteutils.UpdatePriority.RenderSprites, function () {
        updateTransparency();
    })

    const CACHED_IMAGE_KEY = "CACHED_IMAGE";
    const CACHED_REVISION_KEY = "CACHED_REVISION";
    const OPACITY_KEY = "OPACITY";

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
