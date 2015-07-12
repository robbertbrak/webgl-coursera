"use strict";

var gl;
var points;

var angle = 0;
var twist = 0;
var depth = 5;
var program;
var vertices = [];
var colors = [];
var color = "random";
var mode = "outline";
var fractal = true;

// The shape is an array of triangles.
var shape = [];

window.onload = function init() {
    var canvas = document.getElementById("gl-canvas");
    angle = document.getElementById("angle").value;
    twist = document.getElementById("twist").value;
    depth = document.getElementById("tesselation").value;
    color = document.getElementById("color").value;
    mode = document.getElementById("mode").value;
    fractal = document.getElementById("fractal").checked;

    gl = WebGLUtils.setupWebGL(canvas);
    if (!gl) { alert("WebGL isn't available"); }

    gl.viewport(0, 0, canvas.width, canvas.height);

    var gray = 45 / 255.0;
    gl.clearColor(gray, gray, gray, 1.0);

    program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    setShape(document.getElementById("shape").value);
};

function drawShape() {
    var properties = gl.getAttribLocation(program, 'properties');
    gl.vertexAttrib3f(properties, twist, angle, 0.0);

    var cBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(colors), gl.STATIC_DRAW);

    var vColor = gl.getAttribLocation(program, "vColor");
    gl.vertexAttribPointer(vColor, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vColor);

    var vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(vertices), gl.STATIC_DRAW);

    var vPosition = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(vPosition, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    gl.clear(gl.COLOR_BUFFER_BIT);
    if (mode === 'outline') {
        gl.drawArrays(gl.LINES, 0, vertices.length);
    } else {
        gl.drawArrays(gl.TRIANGLES, 0, vertices.length);
    }
}

function setShape(val) {
    shape = [];

    var cos30 = Math.cos(Math.PI / 6);

    if (val === 'triangle') {
        shape.push([vec2(- cos30, - 0.5), vec2(0, 1), vec2(cos30, - 0.5)]);
    } else if (val === 'diamond') {
        var width = 0.5;
        var height = 2 * width * cos30;

        shape.push([vec2(- width, 0), vec2(0, height), vec2(width, 0)]);
        shape.push([vec2(- width, 0), vec2(0, - height), vec2(width, 0)]);
    } else if (val === 'radioactive') {
        var width = 0.5;
        var height = 2 * width * cos30;

        shape.push([vec2(- 2 * width, 0), vec2(- width, height), vec2(0, 0)]);
        shape.push([vec2(width, -height), vec2(- width, - height), vec2(0, 0)]);
        shape.push([vec2(2 * width, 0), vec2(width, height), vec2(0, 0)]);
    } else if (val === 'star') {
        var width = 0.25;
        var height = 2 * width * cos30;
        // Outline
        shape.push([vec2(- 3 * width, height), vec2(- width, height), vec2(-2 * width, 0)]);
        shape.push([vec2(- width, height), vec2(0, 2 * height), vec2(width, height)]);
        shape.push([vec2(width, height), vec2(3 * width, height), vec2(2 * width, 0)]);
        shape.push([vec2(- 3 * width, - height), vec2(- width, - height), vec2(- 2 * width, 0)]);
        shape.push([vec2(- width, - height), vec2(0, -2 * height), vec2(width, - height)]);
        shape.push([vec2(width, - height), vec2(3 * width, - height), vec2(2 * width, 0)]);

        // Hexagon in the center
        shape.push([vec2(- 2 * width, 0), vec2(- width, height), vec2(0, 0)]);
        shape.push([vec2(- 2 * width, 0), vec2(- width, - height), vec2(0, 0)]);
        shape.push([vec2(width, -height), vec2(- width, - height), vec2(0, 0)]);
        shape.push([vec2(width, height), vec2(- width, height), vec2(0, 0)]);
        shape.push([vec2(2 * width, 0), vec2(width, height), vec2(0, 0)]);
        shape.push([vec2(2 * width, 0), vec2(width, - height), vec2(0, 0)]);
    }

    createShapes();
    drawShape();
}

function setAngle(val) {
    angle = (val * Math.PI * 2) / 360;
    drawShape();
}

function setTwist(val) {
    twist = val;
    drawShape();
}

function setColor(val) {
    color = val;
    createShapes();
    drawShape();
}

function setTesselation(val) {
    depth = val;
    createShapes();
    drawShape();
}

function setMode(val) {
    mode = val;
    createShapes();
    drawShape();
}

function setFractal(val) {
    fractal = val;
    createShapes();
    drawShape();
}

function getColor() {
    if (color === 'random') {
        return vec3(Math.random(), Math.random(), Math.random())
    } else if (color === 'red') {
        return vec3(1.0, 0, 0);
    } else if (color === 'green') {
        return vec3(0, 1.0, 0);
    } else if (color === 'blue') {
        return vec3(0, 0, 1.0);
    } else {
        return vec3(1.0, 1.0, 1.0);
    }
}

function createShapes() {
    vertices = [];
    colors = [];

    function divideTriangles(a, b, c, depth) {
        if (depth == 0) {
            var color = getColor();
            colors.push(color, color, color);
            if (mode === 'outline') {
                colors.push(color, color, color);
                vertices.push(a, b, b, c, c, a);
            } else {
                vertices.push(a, b, c);
            }
        } else {
            var ab = mix(a, b, 0.5);
            var ac = mix(a, c, 0.5);
            var bc = mix(b, c, 0.5);
            divideTriangles(a, ab, ac, depth - 1);
            divideTriangles(ab, b, bc, depth - 1);
            if (!fractal) {
                divideTriangles(ab, bc, ac, depth - 1);
            }
            divideTriangles(ac, bc, c, depth - 1);
        }
    }

    for (var i = 0; i < shape.length; i++) {
        var triangle = shape[i];
        divideTriangles(triangle[0], triangle[1], triangle[2], depth);
    };
}
