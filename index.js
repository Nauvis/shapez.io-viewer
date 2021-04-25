/*
 * Lots of code here is copied 1:1 from actual game files
 */

const maxLayer = 4;

/** @enum {string} */
const enumSubShape = {
    rect: "rect",
    circle: "circle",
    star: "star",
    windmill: "windmill",
};

/** @enum {string} */
const enumSubShapeToShortcode = {
    [enumSubShape.rect]: "R",
    [enumSubShape.circle]: "C",
    [enumSubShape.star]: "S",
    [enumSubShape.windmill]: "W",
};

/** @enum {enumSubShape} */
const enumShortcodeToSubShape = {};
for (const key in enumSubShapeToShortcode) {
    enumShortcodeToSubShape[enumSubShapeToShortcode[key]] = key;
}

const arrayQuadrantIndexToOffset = [
    { x: 1, y: -1 }, // tr
    { x: 1, y: 1 }, // br
    { x: -1, y: 1 }, // bl
    { x: -1, y: -1 }, // tl
];

// From colors.js
/** @enum {string} */
const enumColors = {
    red: "red",
    green: "green",
    blue: "blue",

    yellow: "yellow",
    purple: "purple",
    cyan: "cyan",

    white: "white",
    uncolored: "uncolored",
};

/** @enum {string} */
const enumColorToShortcode = {
    [enumColors.red]: "r",
    [enumColors.green]: "g",
    [enumColors.blue]: "b",

    [enumColors.yellow]: "y",
    [enumColors.purple]: "p",
    [enumColors.cyan]: "c",

    [enumColors.white]: "w",
    [enumColors.uncolored]: "u",
};

/** @enum {string} */
const enumColorsToHexCode = {
    [enumColors.red]: "#ff666a",
    [enumColors.green]: "#78ff66",
    [enumColors.blue]: "#66a7ff",

    // red + green
    [enumColors.yellow]: "#fcf52a",

    // red + blue
    [enumColors.purple]: "#dd66ff",

    // blue + green
    [enumColors.cyan]: "#87fff5",

    // blue + green + red
    [enumColors.white]: "#ffffff",

    [enumColors.uncolored]: "#aaaaaa",
};

/** @enum {enumColors} */
const enumShortcodeToColor = {};
for (const key in enumColorToShortcode) {
    enumShortcodeToColor[enumColorToShortcode[key]] = key;
}

CanvasRenderingContext2D.prototype.beginCircle = function (x, y, r) {
    if (r < 0.05) {
        this.beginPath();
        this.rect(x, y, 1, 1);
        return;
    }
    this.beginPath();
    this.arc(x, y, r, 0, 2.0 * Math.PI);
};

const possibleShapesString = Object.keys(enumShortcodeToSubShape).join("");
const possibleColorsString = Object.keys(enumShortcodeToColor).join("");
const layerRegex = new RegExp("([" + possibleShapesString + "][" + possibleColorsString + "]|-{2}){4}");

/////////////////////////////////////////////////////

function radians(degrees) {
    return (degrees * Math.PI) / 180.0;
}

/**
 * Generates the definition from the given short key
 */
 function fromShortKey(key) {
    const sourceLayers = key.split(":");
    if (sourceLayers.length > maxLayer) {
        throw new Error("Only " + maxLayer + " layers allowed");
    }

    let layers = [];
    for (let i = 0; i < sourceLayers.length; ++i) {
        var text = sourceLayers[i];

        if (text.length < 8) { // Invalid shape code, but potentially previewable after padding
            showError("Invalid layer: '" + text + "' -> must be 8 characters");
        }
        if (text.length > 8) {
            throw new Error("Invalid layer: '" + text + "' -> must be 8 characters");
        }

        if (text.length % 2){
            text += 'u';
        }
        text = text.padEnd(8,'-');

        if (text === "--".repeat(4)) {
            throw new Error("Empty layers are not allowed");
        }

        if (!layerRegex.test(text)) {
            throw new Error("Invalid syntax in layer " + (i + 1));
        }

        const quads = [null, null, null, null];
        for (let quad = 0; quad < 4; ++quad) {
            const shapeText = text[quad * 2 + 0];
            const subShape = enumShortcodeToSubShape[shapeText];
            const color = enumShortcodeToColor[text[quad * 2 + 1]];
            if (subShape) {
                if (!color) {
                    throw new Error("Invalid shape color key: " + key);
                }
                quads[quad] = {
                    subShape,
                    color,
                };
            } else if (shapeText !== "-") {
                throw new Error("Invalid shape key: " + shapeText);
            }
        }
        layers.push(quads);
    }

    return layers;
}

function renderShape(layers) {
    const ctxArray = [...document.querySelectorAll('[id^="canvas"]')].map(cvs => cvs.getContext("2d"));

    for (let ctxIndex = 0; ctxIndex < ctxArray.length; ++ctxIndex) {
        let context = ctxArray[ctxIndex];
        context.save();
        context.fillStyle = "#fff";

        const w = ctxIndex == 0 ? 512 : 128;
        const h = ctxIndex == 0 ? 512 : 128;

        const dpi = 1;
        context.clearRect(0, 0, w, h);

        context.translate((w * dpi) / 2, (h * dpi) / 2);
        context.scale((dpi * w) / 28, (dpi * h) / 28);

        context.fillStyle = "#e9ecf7";

        const quadrantSize = 10;
        const quadrantHalfSize = quadrantSize / 2;

        context.fillStyle = "rgba(40, 50, 65, 0.1)";
        context.beginCircle(0, 0, quadrantSize * 1.15);
        context.fill();

        for (let layerIndex = 0; layerIndex < layers.length; ++layerIndex) {
            if (ctxIndex == 0 || layerIndex + 1 == ctxIndex) {
                const quadrants = layers[layerIndex];

                const layerScale = Math.max(0.1, 0.9 - layerIndex * 0.22);

                for (let quadrantIndex = 0; quadrantIndex < 4; ++quadrantIndex) {
                    if (!quadrants[quadrantIndex]) {
                        continue;
                    }
                    const { subShape, color } = quadrants[quadrantIndex];

                    const quadrantPos = arrayQuadrantIndexToOffset[quadrantIndex];
                    const centerQuadrantX = quadrantPos.x * quadrantHalfSize;
                    const centerQuadrantY = quadrantPos.y * quadrantHalfSize;

                    const rotation = radians(quadrantIndex * 90);

                    context.translate(centerQuadrantX, centerQuadrantY);
                    context.rotate(rotation);

                    context.fillStyle = enumColorsToHexCode[color];
                    context.strokeStyle = "#555";
                    context.lineWidth = 1;

                    const insetPadding = 0.0;

                    switch (subShape) {
                        case enumSubShape.rect: {
                            context.beginPath();
                            const dims = quadrantSize * layerScale;
                            context.rect(
                                insetPadding + -quadrantHalfSize,
                                -insetPadding + quadrantHalfSize - dims,
                                dims,
                                dims
                            );

                            break;
                        }
                        case enumSubShape.star: {
                            context.beginPath();
                            const dims = quadrantSize * layerScale;

                            let originX = insetPadding - quadrantHalfSize;
                            let originY = -insetPadding + quadrantHalfSize - dims;

                            const moveInwards = dims * 0.4;
                            context.moveTo(originX, originY + moveInwards);
                            context.lineTo(originX + dims, originY);
                            context.lineTo(originX + dims - moveInwards, originY + dims);
                            context.lineTo(originX, originY + dims);
                            context.closePath();
                            break;
                        }

                        case enumSubShape.windmill: {
                            context.beginPath();
                            const dims = quadrantSize * layerScale;

                            let originX = insetPadding - quadrantHalfSize;
                            let originY = -insetPadding + quadrantHalfSize - dims;
                            const moveInwards = dims * 0.4;
                            context.moveTo(originX, originY + moveInwards);
                            context.lineTo(originX + dims, originY);
                            context.lineTo(originX + dims, originY + dims);
                            context.lineTo(originX, originY + dims);
                            context.closePath();
                            break;
                        }

                        case enumSubShape.circle: {
                            context.beginPath();
                            context.moveTo(
                                insetPadding + -quadrantHalfSize,
                                -insetPadding + quadrantHalfSize
                            );
                            context.arc(
                                insetPadding + -quadrantHalfSize,
                                -insetPadding + quadrantHalfSize,
                                quadrantSize * layerScale,
                                -Math.PI * 0.5,
                                0
                            );
                            context.closePath();
                            break;
                        }

                        default: {
                            console.logAlways(false, "Unknown sub shape: " + subShape);
                        }
                    }

                    context.fill();
                    context.stroke();

                    context.rotate(-rotation);
                    context.translate(-centerQuadrantX, -centerQuadrantY);
                }
            }
        }
        context.restore();
    }
}

/**
 * Picks random colors which are close to each other
 */
function generateRandomColorSet(allowUncolored = false) {
    const colorWheel = [
        enumColors.red,
        enumColors.yellow,
        enumColors.green,
        enumColors.cyan,
        enumColors.blue,
        enumColors.purple,
        enumColors.red,
        enumColors.yellow,
    ];

    const universalColors = [enumColors.white];
    if (allowUncolored) {
        universalColors.push(enumColors.uncolored);
    };
    const index = getRandomArbitrary(0, colorWheel.length - 2);
    const pickedColors = colorWheel.slice(index, index + 3);
    pickedColors.push(choice(universalColors));
    return pickedColors;
}

function getRandomArbitrary(min, max) {
    return Math.floor(Math.random() * (max - min) + min);
}

function choice(array) {
    const index = getRandomArbitrary(0, array.length);
    return array[index];
}

function clamp(number, min, max) {
    return Math.max(min, Math.min(number, max));
}

/**
 * Creates a random shape
 */
function computeFreeplayShape(level) {
    const layerCount = clamp(level / 25, 2, 4);

    let layers = [];

    const colors = this.generateRandomColorSet(level > 35);

    let pickedSymmetry = null; // pairs of quadrants that must be the same
    if (Math.random() < 0.5) {
        pickedSymmetry = [
            // radial symmetry
            [0, 2],
            [1, 3],
        ];
    } else {
        const symmetries = [
            [
                // horizontal axis
                [0, 3],
                [1, 2],
            ],
            [
                // vertical axis
                [0, 1],
                [2, 3],
            ],
            [
                // diagonal axis
                [0, 2],
                [1],
                [3],
            ],
            [
                // other diagonal axis
                [1, 3],
                [0],
                [2],
            ],
        ];
        pickedSymmetry = choice(symmetries);
    }

    const localRandomColor = () => choice(colors);
    const localRandomShape = () => choice(Object.values(enumSubShape));
    
    let isMissingCorner = false;

    for (let i = 0; i < layerCount; ++i) {
        const layer = [null, null, null, null];

        for (let j = 0; j < pickedSymmetry.length; ++j) {
            const group = pickedSymmetry[j];
            const shape = localRandomShape();
            const color = localRandomColor();
            for (let k = 0; k < group.length; ++k) {
                const quad = group[k];
                layer[quad] = {
                    subShape: shape,
                    color,
                };
            }
        }
        if (level > 75 && Math.random() > 0.95 && !isMissingCorner) {
            layer[getRandomArbitrary(0, 4)] = null;
            isMissingCorner = true;
        }
        layers.push(layer);
    }
    return layers;
}

/**
 * Generates the short key from the given definition
 */
function toShortKey(layers) {
    let shortCode = "";
    for (let i = 0; i < layers.length; ++i) { // for each layer
        for (let j = 0; j < 4; ++j) { // for each corner in a layer
            if (layers[i][j] == null) {
                shortCode += "--";
                continue
            }
            shortCode += (enumSubShapeToShortcode) [layers[i][j].subShape];
            shortCode += (enumColorToShortcode) [layers[i][j].color];
        }
        shortCode += ":";
    }
    shortCode = shortCode.replace(/:+$/, "");
    return shortCode;
}

/////////////////////////////////////////////////////

function showError(msg) {
    const errorDiv = document.getElementById("error");
    errorDiv.classList.toggle("hasError", !!msg);
    if (msg) {
        errorDiv.innerText = msg;
    } else {
        errorDiv.innerText = "Shape generated";
    }
}

// @ts-ignore
window.generate = () => {
    showError(null);
    // @ts-ignore
    const code = document.getElementById("code").value.trim();

    let parsed = null;
    try {
        parsed = fromShortKey(code);
    } catch (ex) {
        showError(ex);
        return;
    }

    renderShape(parsed);
};

// @ts-ignore
window.debounce = fn => {
    setTimeout(fn, 0);
};

// @ts-ignore
window.addEventListener("load", () => {
    if (window.location.search) {
        var key = window.location.search.substr(1);
        if (key.indexOf(".") >= 0) {
            key = key.replace(/\./gi, ":");
        }
        document.getElementById("code").value = key;
    }
    generate();
});

window.exportShape = () => {
    const canvas = document.getElementById("result");
    const imageURL = canvas.toDataURL("image/png");

    const dummyLink = document.createElement("a");
    dummyLink.download = "shape.png";
    dummyLink.href = imageURL;
    dummyLink.dataset.downloadurl = ["image/png", dummyLink.download, dummyLink.href].join(":");

    document.body.appendChild(dummyLink);
    dummyLink.click();
    document.body.removeChild(dummyLink);
};

window.viewShape = key => {
    document.getElementById("code").value = key;
    generate();
};

window.shareShape = () => {
    const code = document.getElementById("code").value.trim();
    const url = "https://viewer.shapez.io?" + code.replace(/:/gi, ".");
    alert("You can share this url: " + url);
};

window.randomShape = () => {
    let level = getRandomArbitrary(1, 200);
    let code = computeFreeplayShape(level);
    
    code = toShortKey(code);
    
    document.getElementById("code").value = code;
    generate();
};