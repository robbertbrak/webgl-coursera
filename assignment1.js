"use strict";

var gl;
var points;

var angle = 0;
var twist = 0;
var depth = 5;
var program;
var vertices = [];
var colors = [];

var size = 1;
var a = vec2(- size * Math.cos(Math.PI / 6), - 0.5 * size);
var b = vec2(0, size);
var c = vec2(size * Math.cos(Math.PI / 6), - 0.5 * size);

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

    changeTesselation(depth);
    drawTriangle();
};

function drawTriangle() {
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

    render(vertices.length);
}

function render(size) {
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, size);
}

function changeAngle(val) {
    angle = (val * Math.PI * 2) / 360;
    drawTriangle();
}

function changeTwist(val) {
    twist = val;
    drawTriangle();
}

function changeTesselation(val) {
    depth = val;

    vertices = [];
    colors = [];

    function rotateAndTwist(point) {
        var x = point[0];
        var y = point[1];
        // var d = Math.sqrt(x * x + y * y);
        // var cos = Math.cos(angle);
        // var sin = Math.sin(angle);
        // return vec2(x * cos - y * sin, x * sin + y * cos);
        return vec2(x, y);
    }

    function divideTriangles(a, b, c, depth) {
        if (depth == 0) {
            var color =vec3(Math.random(), Math.random(), Math.random());
            colors.push(color, color, color);
            vertices.push(rotateAndTwist(a), 
                rotateAndTwist(b),
                rotateAndTwist(c));
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

    divideTriangles(a, b, c, depth);

    drawTriangle();
}
