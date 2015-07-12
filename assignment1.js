"use strict";

var gl;
var points;

var angle = 0;
var twist = 0;
var depth = 5;
var program;
var vertices = [];
var colors = [];

// The shape is an array of triangles.
var shape = [];

window.onload = function init() {
    var canvas = document.getElementById("gl-canvas");
    angle = document.getElementById("angle").value;
    twist = document.getElementById("twist").value;
    depth = document.getElementById("tesselation").value;

    gl = WebGLUtils.setupWebGL(canvas);
    if (!gl) { alert("WebGL isn't available"); }

    gl.viewport(0, 0, canvas.width, canvas.height);

    gl.clearColor(45 / 255.0, 45 / 255.0, 45 / 255.0, 1.0);

    program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    changeShape(document.getElementById("shape").value);
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
    gl.drawArrays(gl.TRIANGLES, 0, vertices.length);
}

function changeShape(val) {
    var deg30 = Math.PI / 6;
    var cos30 = Math.cos(deg30);
    shape = [];

    if (val === 'triangle') {
        shape.push([vec2(- cos30, - 0.5), vec2(0, 1), vec2(cos30, - 0.5)]);
    } else if (val === 'diamond') {
        shape.push([vec2(- 0.5, 0), vec2(0,   cos30), vec2(0.5, 0)]);
        shape.push([vec2(- 0.5, 0), vec2(0, - cos30), vec2(0.5, 0)]);
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
    changeTesselation(depth);
}

function changeAngle(val) {
    angle = (val * Math.PI * 2) / 360;
    drawShape();
}

function changeTwist(val) {
    twist = val;
    drawShape();
}

function changeTesselation(val) {
    depth = val;

    vertices = [];
    colors = [];

    function divideTriangles(a, b, c, depth) {
        if (depth == 0) {
            var color =vec3(Math.random(), Math.random(), Math.random());
            colors.push(color, color, color);
            vertices.push(a, b, c);
        } else {
            var ab = mix(a, b, 0.5);
            var ac = mix(a, c, 0.5);
            var bc = mix(b, c, 0.5);
            divideTriangles(a, ab, ac, depth - 1);
            divideTriangles(ab, b, bc, depth - 1);
            divideTriangles(ab, bc, ac, depth - 1);
            divideTriangles(ac, bc, c, depth - 1);
        }
    }

    for (var i = 0; i < shape.length; i++) {
        var triangle = shape[i];
        divideTriangles(triangle[0], triangle[1], triangle[2], depth);
    };

    drawShape();
}
