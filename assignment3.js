"use strict";

var canvas;
var gl;
var program;

var fColor;
var animate = false;

var SURFACE = 1;
var OUTLINE = 2;

var objects = [];

var modeViewMatrix;
var modelViewMatrixLoc;

window.onload = function init() {
    initGlProgram();

    fColor = gl.getUniformLocation(program, "fColor");
    modelViewMatrixLoc = gl.getUniformLocation( program, "modelViewMatrix" );

    // First we create various shapes.
    // Each shape is just an array of buffer objects, each of which has:
    // - an array of vertices 
    // - a color
    // - a type (TRIANGLE_FAN, TRIANGLE_STRIP, etc)
    var sphere = createSphere();
    var cylinder = createCylinder();
    var cone = createCone();
    var cube = createCube();

    // Now we create object instances by associating a shape with a transformation and color.
    objects.push({ 
        shape: cone,
        mvMatrix: mult(translate(-0.5, 0.5, 0), mult(scale(0.3, 0.3, 0.3), rotate(45, vec3(0.5, 0.5, 0.5)))),
        lineColor: vec4(1.0, 0.0, 0.0, 1.0),
        surfaceColor: vec4(0.6, 0.0, 0.0, 1.0)
    });
    objects.push({ 
        shape: sphere,
        mvMatrix: mult(translate(0.5, 0, 0), mult(scale(0.1, 0.1, 0.1), rotate(90, vec3(0.5, 0.5, 0.5)))),
        lineColor: vec4(0.0, 1.0, 0.0, 1.0),
        surfaceColor: vec4(0.1, 0.6, 0.0, 1.0)
    });
    objects.push({
        shape: cube,
        mvMatrix: mult(translate(0, -0.2, 0), mult(scale(0.2, 0.2, 0.2), rotate(30, vec3(-0.5, 0.5, 0.5)))),
        lineColor: vec4(0, 0.6, 0.6, 1.0),
        surfaceColor: vec4(0, 0.3, 0.3, 1.0)
    });
    objects.push({
        shape: cylinder,
        mvMatrix: mult(translate(-0.5, -0.5, 0), mult(scale(0.2, 0.2, 0.2), rotate(30, vec3(-0.5, 0.5, 0.5)))),
        lineColor: vec4(0.6, 0.6, 0.6, 1.0),
        surfaceColor: vec4(0.3, 0.3, 0.3, 1.0)
    });

    // Finally we start the rendering loop, which just loops over the object instances and renders them.
    render();
}

function render() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    for (var i = 0; i < objects.length; i++) {
        var modelViewMatrix = objects[i].mvMatrix;
        gl.uniformMatrix4fv( modelViewMatrixLoc, false, flatten(modelViewMatrix) );
        for (var j = 0; j < objects[i].shape.buffers.length; j++) {
            var object = objects[i];
            var bufferInfo = object.shape.buffers[j];
            gl.bindBuffer(gl.ARRAY_BUFFER, bufferInfo.buffer);
            var vPosition = gl.getAttribLocation(program, "vPosition");
            gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(vPosition);

            if (bufferInfo.fillmode == OUTLINE) {
                gl.uniform4fv(fColor, flatten(object.lineColor));
            } else if (bufferInfo.fillmode == SURFACE) {
                gl.uniform4fv(fColor, flatten(object.surfaceColor));
            }

            gl.drawArrays(bufferInfo.drawmode, 0, bufferInfo.numVertices);
        };
    };

    if (animate) {
        requestAnimFrame(render);
    }
}

function createCone() {
    // For a cone: create a 2D unit circle.
    // Create a triangle fan for the disc.
    // Create another triangle fan for the cone itself.
    // Create a line loop for the outline of the disc.
    // Create lines for the spokes of the disc and the spokes of the cone.

    var shape = { buffers: [] };
    var circle = createCircle();

    var z = [1.0 / Math.sqrt(2), -1.0 / Math.sqrt(2)];

    var disc = [];
    var cone = [];
    var lineloop = [];
    var lines = [];

    var center = vec4(0, 0, z[0], 1.0);
    var top = vec4(0, 0, z[1], 1.0);

    disc.push(center);
    cone.push(top);

    for (var i = 0; i < circle.length; i++) {
        var edge = vec4(circle[i][0], circle[i][1], z[0], 1.0);
        disc.push(edge);
        cone.push(edge);
        lineloop.push(edge);
        lines.push(center, edge); // spoke on disc
        lines.push(top, edge); // spoke on cone
    }

    shape.buffers.push(createBuffer(disc, gl.TRIANGLE_FAN, SURFACE));
    shape.buffers.push(createBuffer(cone, gl.TRIANGLE_FAN, SURFACE));
    shape.buffers.push(createBuffer(lineloop, gl.LINE_LOOP, OUTLINE));
    shape.buffers.push(createBuffer(lines, gl.LINES, OUTLINE));
    return shape;
}

function createCylinder() {
    // A cylinder is two discs and a hollow tube connecting them.

    // First, create a 2D unit circle.
    // We use a triangle fan for each of discs.
    // We use a triangle strip for the tube.
    // We use a line loop for the outline of the circle
    // We use lines for the spokes of the discs.
    // We use lines for the links between the discs.

    var shape = { buffers: [] };
    var circle = createCircle();

    var z = [1.0 / Math.sqrt(2), -1.0 / Math.sqrt(2)];

    var lines = [];

    for (var j = 0; j < z.length; j++) {
        var disc = [];
        var lineloop = [];

        var center = vec4(0, 0, z[j], 1.0);
        disc.push(center);

        for (var i = 0; i < circle.length; i++) {
            var edge = vec4(circle[i][0], circle[i][1], z[j], 1.0);
            disc.push(edge);
            lineloop.push(edge);
            lines.push(center, edge); // spoke
        }

        shape.buffers.push(createBuffer(disc, gl.TRIANGLE_FAN, SURFACE));
        shape.buffers.push(createBuffer(lineloop, gl.LINE_LOOP, OUTLINE));
    }

    var tube = [];
    for (var i = 0; i < circle.length; i++) {
        var top = vec4(circle[i][0], circle[i][1], z[0], 1.0);
        var bottom = vec4(circle[i][0], circle[i][1], z[1], 1.0);
        tube.push(top, bottom);
        lines.push(top, bottom); // links between discs
    }

    shape.buffers.push(createBuffer(tube, gl.TRIANGLE_STRIP, SURFACE));
    shape.buffers.push(createBuffer(lines, gl.LINES, OUTLINE));
    return shape;
}

function createCircle() {
    var edges = 30;
    var circle = [];
    for (var i = 0; i < edges; i++) {
        var edge = vec2(Math.cos(2*Math.PI*i/edges) / Math.sqrt(2), Math.sin(2*Math.PI*i/edges) / Math.sqrt(2));
        circle.push(edge);
    }
    circle.push(circle[0]);
    return circle;
}


function createSphere() {
    var x = 0.525731112119133606;
    var z = 0.850650808352039932;

    var vertices = [
       vec4(-x, 0.0, z, 1.0), vec4(x, 0.0, z, 1.0), vec4(-x, 0.0, -z, 1.0), vec4(x, 0.0, -z, 1.0),    
       vec4(0.0, z, x, 1.0), vec4(0.0, z, -x, 1.0), vec4(0.0, -z, x, 1.0), vec4(0.0, -z, -x, 1.0),    
       vec4(z, x, 0.0, 1.0), vec4(-z, x, 0.0, 1.0), vec4(z, -x, 0.0, 1.0), vec4(-z, -x, 0.0, 1.0) 
    ]

    // A sphere is a icosahedron where each of the triangles is subdivided
    // and the vertices normalized (so they are pushed outwards towards the sphere surface).
    var points = [];
    triangle(vertices, points, 0, 4, 1);
    triangle(vertices, points, 0, 9, 4);
    triangle(vertices, points, 9, 5, 4);
    triangle(vertices, points, 4, 5, 8);
    triangle(vertices, points, 4, 8, 1);

    triangle(vertices, points, 8, 10, 1);
    triangle(vertices, points, 8, 3, 10);
    triangle(vertices, points, 5, 3, 8);
    triangle(vertices, points, 5, 2, 3);
    triangle(vertices, points, 2, 7, 3);

    triangle(vertices, points, 7, 10, 3);
    triangle(vertices, points, 7, 6, 10);
    triangle(vertices, points, 7, 11, 6);
    triangle(vertices, points, 11, 0, 6);
    triangle(vertices, points, 0, 1, 6);

    triangle(vertices, points, 6, 1, 10);
    triangle(vertices, points, 9, 0, 11);
    triangle(vertices, points, 9, 11, 2);
    triangle(vertices, points, 9, 2, 5);
    triangle(vertices, points, 7, 2, 11);

    var shape = { buffers: [] };
    shape.buffers.push(createBuffer(points, gl.TRIANGLES, SURFACE));
    shape.buffers.push(createBuffer(points, gl.LINE_STRIP, OUTLINE));
    return shape;
}

function createBuffer(points, drawmode, fillmode) {
    var vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(points), gl.STATIC_DRAW);
    return {
        buffer: vBuffer,
        drawmode: drawmode,
        numVertices: points.length,
        fillmode: fillmode
    }
}

function triangle(vertices, points, a, b, c) {
    var tesselationDepth = 2;
    divideTriangles(points, vertices[a], vertices[b], vertices[c], tesselationDepth);
}

function divideTriangles(points, a, b, c, depth) {
    if (depth == 0) {
        points.push(a, b, c);
    } else {
        var ab = normalize(mix(a, b, 0.5), true);
        var ac = normalize(mix(a, c, 0.5), true);
        var bc = normalize(mix(b, c, 0.5), true);
        divideTriangles(points, a, ab, ac, depth - 1);
        divideTriangles(points, ab, b, bc, depth - 1);
        divideTriangles(points, ab, bc, ac, depth - 1);
        divideTriangles(points, ac, bc, c, depth - 1);
    }
}


function createCube() {
    var vertices = [
        vec4(-0.5, -0.5,  0.5, 1.0),
        vec4(-0.5,  0.5,  0.5, 1.0),
        vec4( 0.5,  0.5,  0.5, 1.0),
        vec4( 0.5, -0.5,  0.5, 1.0),
        vec4(-0.5, -0.5, -0.5, 1.0),
        vec4(-0.5,  0.5, -0.5, 1.0),
        vec4( 0.5,  0.5, -0.5, 1.0),
        vec4( 0.5, -0.5, -0.5, 1.0)
    ];

    var triangles = [];
    var lines = [];

    var quads = [[1, 0, 3, 2], [2, 3, 7, 6], [3, 0, 4, 7], [6, 5, 1, 2], [4, 5, 6, 7], [5, 4, 0, 1]];
    for (var i = 0; i < quads.length; i++) {
        var quad = quads[i];
        var indices = [ quad[0], quad[1], quad[2], quad[0], quad[2], quad[3] ];
        for (var j = 0; j < indices.length; j++) {
            triangles.push(vertices[indices[j]]);
        };
        for (var j = 0; j < quad.length; j++) {
            lines.push(vertices[quad[j]], vertices[quad[(j+1) % 4]]);
        };
    };
    var shape = { buffers: [] };
    shape.buffers.push(createBuffer(triangles, gl.TRIANGLES, SURFACE));
    shape.buffers.push(createBuffer(lines, gl.LINES, OUTLINE));
    return shape;
}

function initGlProgram() {
    canvas = document.getElementById("gl-canvas");

    gl = WebGLUtils.setupWebGL(canvas);
    if (!gl) {
        alert("WebGL isn't available");
    }

    gl.viewport(0, 0, canvas.width, canvas.height);

    var gray = 45 / 255.0;
    gl.clearColor(gray, gray, gray, 1.0);

    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.POLYGON_OFFSET_FILL);
    gl.polygonOffset(0.2, 0);

    program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);
}