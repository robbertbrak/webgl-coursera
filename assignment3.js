"use strict";

var canvas;
var gl;
var program;

var fColor;
var animate = true;

var SURFACE = 1;
var OUTLINE = 2;

var objects = [];

var modeViewMatrix;
var modelViewMatrixLoc;

var shapes = [];
var currentScale = 0.5;
var currentShape = 0;
var currentObject = {};
var surfaceColor = vec4(0.1, 0.6, 0.0, 1.0);
var lineColor = vec4(0.0, 1.0, 0.0, 1.0);
var currentRotation = [45, 145, 45];
var currentPosition = [0, 0, 0];
var cameraAngle = 0;
var eye = [0, 0, 12];

var mousedown = false;

window.onload = function init() {
    initGlProgram();

    fColor = gl.getUniformLocation(program, "fColor");
    modelViewMatrixLoc = gl.getUniformLocation( program, "modelViewMatrix" );

    initShapes();
    initEventListeners();
    render();
}

function initShapes() {
    var sphere = createSphere(gl);
    var cylinder = createCylinder(gl);
    var cone = createCone(gl);
    var cube = createCube(gl);
    shapes.push(sphere, cylinder, cone, cube);
}

function initEventListeners() {
    $("#scale").val(currentScale);
    $("#rotate-x").val(currentRotation[0]);
    $("#rotate-y").val(currentRotation[1]);
    $("#rotate-z").val(currentRotation[2]);
    $("#surface-color").spectrum({
        color: tinycolor.fromRatio({ r: surfaceColor[0], g: surfaceColor[1], b: surfaceColor[2] }),
        showPalette: true,
        palette: getPalette(),
        change: function(color) {
            var rgb = color.toRgb();
            surfaceColor = vec4(rgb.r / 255, rgb.g / 255, rgb.b / 255, rgb.a)
            currentObject.surfaceColor = surfaceColor;
        }
    });
    $("#line-color").spectrum({
        color: tinycolor.fromRatio({ r: lineColor[0], g: lineColor[1], b: lineColor[2] }),
        showPalette: true,
        palette: getPalette(),
        change: function(color) {
            var rgb = color.toRgb();
            lineColor = vec4(rgb.r / 255, rgb.g / 255, rgb.b / 255, rgb.a);
            currentObject.lineColor = lineColor;
        }
    });
    $("#shape").change(function() { 
        currentShape = $(this).val(); 
        currentObject.shape = shapes[currentShape];
    });
    $("#add-shape").click(function() {
        currentObject = {
            shape: shapes[currentShape],
            rotation: getRotationMatrix(),
            scale: scale(currentScale, currentScale, currentScale),
            translation: getTranslationMatrix(),
            lineColor: lineColor,
            surfaceColor: surfaceColor
        };
        objects.push(currentObject);
    });
    $("#scale").on("input", function() {
        currentScale = $(this).val();
        currentObject.scale = scale(currentScale, currentScale, currentScale);
    });
    $("#z-depth").on("input", function() {
        var depth = $(this).val();
        currentPosition[2] = depth;
        currentObject.translation = getTranslationMatrix();
    });
    $("#camera-angle").on("input", function() {
        cameraAngle = $(this).val();
        var rotationMatrix = mult(scale(12, 12, 12), rotateY(cameraAngle));
        eye = vec3(rotationMatrix[2][0], rotationMatrix[2][1], rotationMatrix[2][2]);
        console.log(eye);
    });
    $("#rotate-x").on("input", function() {
        currentRotation[0] = $(this).val();
        currentObject.rotation = getRotationMatrix();
    });
    $("#rotate-y").on("input", function() {
        currentRotation[1] = $(this).val();
        currentObject.rotation = getRotationMatrix();
    });
    $("#rotate-z").on("input", function() {
        currentRotation[2] = $(this).val();
        currentObject.rotation = getRotationMatrix();
    });
    $("#gl-canvas").mousedown(function(event) { 
        if(!event.ctrlKey) {
            moveObject(event);
        }
    });
    $("#gl-canvas").mousemove(function(event) { 
        if (event.which == 1 || event.buttons == 1) {
            if (!event.ctrlKey) {
                moveObject(event);
            } else {
                rotateObject(event);
            }
        } 
    });

}

function moveObject(mouseEvent) {
    var c = coord(mouseEvent);
    currentPosition[0] = c[0];
    currentPosition[1] = c[1];
    currentObject.translation = getTranslationMatrix();
}

function rotateObject(mouseEvent) {
    var c = coord(mouseEvent);
    currentRotation[0] = 360 * (- c[1] + 1) / 2;
    currentRotation[1] = 360 * (- c[0] + 1) / 2;
    currentObject.rotation = getRotationMatrix();
}

function getRotationMatrix() {
    return mult(mult(rotateX(currentRotation[0]), rotateY(currentRotation[1])), rotateZ(currentRotation[2]));
}

function getTranslationMatrix() {
    return translate(currentPosition[0], currentPosition[1], currentPosition[2]);
}

function render() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);


    for (var i = 0; i < objects.length; i++) {
        var object = objects[i];

        // Set transformation matrix for current object
        var modelViewMatrix = mult(object.translation, mult(object.scale, object.rotation));

        modelViewMatrix = mult(lookAt(eye, [0, 0, 0], [0, 1, 0]), modelViewMatrix);
        modelViewMatrix = mult(perspective(20, canvas.clientWidth / canvas.clientHeight, 1, 24), modelViewMatrix);
        gl.uniformMatrix4fv( modelViewMatrixLoc, false, flatten(modelViewMatrix) );

        for (var j = 0; j < objects[i].shape.buffers.length; j++) {

            // Set current buffer
            var bufferInfo = object.shape.buffers[j];
            gl.bindBuffer(gl.ARRAY_BUFFER, bufferInfo.buffer);
            var vPosition = gl.getAttribLocation(program, "vPosition");
            gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(vPosition);

            // Set color
            if (bufferInfo.fillmode == OUTLINE) {
                gl.uniform4fv(fColor, flatten(object.lineColor));
            } else if (bufferInfo.fillmode == SURFACE) {
                gl.uniform4fv(fColor, flatten(object.surfaceColor));
            }

            // Draw current buffer in given color
            gl.drawArrays(bufferInfo.drawmode, 0, bufferInfo.numVertices);
        };
    };

    requestAnimFrame(render);
}

function initGlProgram() {
    canvas = document.getElementById("gl-canvas");

    gl = WebGLUtils.setupWebGL(canvas);
    if (!gl) {
        alert("WebGL isn't available");
    }

    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);

    var gray = 45 / 255.0;
    gl.clearColor(gray, gray, gray, 1.0);

    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.POLYGON_OFFSET_FILL);
    gl.polygonOffset(0.2, 0);

    program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);
}

function coord(event) {
    var rect = canvas.getBoundingClientRect();
    return vec2(2 * (event.clientX - rect.left) / canvas.width - 1, 
                2 * (canvas.height - (event.clientY - rect.top)) / canvas.height - 1);
}

function getPalette() {
    return [
        ["rgb(0, 0, 0)", "rgb(67, 67, 67)", "rgb(102, 102, 102)",
        "rgb(204, 204, 204)", "rgb(217, 217, 217)","rgb(255, 255, 255)"],
        ["rgb(152, 0, 0)", "rgb(255, 0, 0)", "rgb(255, 153, 0)", "rgb(255, 255, 0)", "rgb(0, 255, 0)",
        "rgb(0, 255, 255)", "rgb(74, 134, 232)", "rgb(0, 0, 255)", "rgb(153, 0, 255)", "rgb(255, 0, 255)"], 
        ["rgb(230, 184, 175)", "rgb(244, 204, 204)", "rgb(252, 229, 205)", "rgb(255, 242, 204)", "rgb(217, 234, 211)", 
        "rgb(208, 224, 227)", "rgb(201, 218, 248)", "rgb(207, 226, 243)", "rgb(217, 210, 233)", "rgb(234, 209, 220)"], 
        ["rgb(221, 126, 107)", "rgb(234, 153, 153)", "rgb(249, 203, 156)", "rgb(255, 229, 153)", "rgb(182, 215, 168)", 
        "rgb(162, 196, 201)", "rgb(164, 194, 244)", "rgb(159, 197, 232)", "rgb(180, 167, 214)", "rgb(213, 166, 189)"], 
        ["rgb(204, 65, 37)", "rgb(224, 102, 102)", "rgb(246, 178, 107)", "rgb(255, 217, 102)", "rgb(147, 196, 125)", 
        "rgb(118, 165, 175)", "rgb(109, 158, 235)", "rgb(111, 168, 220)", "rgb(142, 124, 195)", "rgb(194, 123, 160)"],
        ["rgb(166, 28, 0)", "rgb(204, 0, 0)", "rgb(230, 145, 56)", "rgb(241, 194, 50)", "rgb(106, 168, 79)",
        "rgb(69, 129, 142)", "rgb(60, 120, 216)", "rgb(61, 133, 198)", "rgb(103, 78, 167)", "rgb(166, 77, 121)"],
        ["rgb(91, 15, 0)", "rgb(102, 0, 0)", "rgb(120, 63, 4)", "rgb(127, 96, 0)", "rgb(39, 78, 19)", 
        "rgb(12, 52, 61)", "rgb(28, 69, 135)", "rgb(7, 55, 99)", "rgb(32, 18, 77)", "rgb(76, 17, 48)"]
    ];
}
