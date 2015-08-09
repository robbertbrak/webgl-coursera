"use strict";

var canvas;
var gl;
var program;

var points = [];
var colors = [];

var fans = [];
var strips = [];
var fanbuffers = [];
var stripbuffers = [];

var xAxis = 0;
var yAxis = 1;
var zAxis = 2;

var axis = 0;
var theta = [ 8.0, 16.0, 0 ];

var thetaLoc;

var linecolor = [1.0, 0.0, 0.0, 1.0];
var surfacecolor = [0.4, 0.0, 0.0, 1.0];
var surfacecolor2 = [0.6, 0.0, 0.0, 1.0];

var fColor;
var animate = false;

var SURFACE = 1;
var OUTLINE = 2;

var objects = [];

window.onload = function init() {
    canvas = document.getElementById("gl-canvas");

    gl = WebGLUtils.setupWebGL(canvas);
    if (!gl) {
        alert("WebGL isn't available");
        return;
    }

    gl.viewport(0, 0, canvas.width, canvas.height);

    var gray = 45 / 255.0;
    gl.clearColor(gray, gray, gray, 1.0);

    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.POLYGON_OFFSET_FILL);
    gl.polygonOffset(0.2, 0);

    //
    //  Load shaders and initialize attribute buffers
    //
    program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    fColor = gl.getUniformLocation(program, "fColor");
    thetaLoc = gl.getUniformLocation(program, "theta");

    // Create various shapes.
    // Each shape is just an array of buffer objects, each of which has:
    // - an array of vertices 
    // - a color
    // - a type (TRIANGLE_FAN, TRIANGLE_STRIP, etc)
    var sphere = createSphere();
    var cylinder = createCylinder();
    var cone = createCone();
    // var cube = createCube();

    objects.push({ shape: cone });

    // Now we create object instances by associating them with a transformation.
    // Finally we start the rendering loop, which just loops over the object instances
    // and renders them.

    //event listeners for buttons

    document.getElementById("xButton").onclick = function() {
        axis = xAxis;
        if (!animate) render();
    };
    document.getElementById("yButton").onclick = function() {
        axis = yAxis;
        if (!animate) render();
    };
    document.getElementById("zButton").onclick = function() {
        axis = zAxis;
        if (!animate) render();
    };
    document.getElementById("animate").onclick = function() {
        animate = !animate;
        if (animate) render();
    };

    render();
}

function render() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    theta[axis] += 2.0;
    gl.uniform3fv(thetaLoc, theta);

    for (var i = 0; i < objects.length; i++) {
        for (var j = 0; j < objects[i].shape.buffers.length; j++) {
            var bufferInfo = objects[i].shape.buffers[j];
            gl.bindBuffer(gl.ARRAY_BUFFER, bufferInfo.buffer);
            var vPosition = gl.getAttribLocation(program, "vPosition");
            gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(vPosition);

            if (bufferInfo.fillmode == OUTLINE) {
                gl.uniform4fv(fColor, flatten(linecolor));
            } else if (bufferInfo.fillmode == SURFACE) {
                gl.uniform4fv(fColor, flatten(surfacecolor));
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
        lines.push(center, edge); // spoke
        lines.push(top, edge);
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

    // A sphere is a icosahedron where each of the triangles is subdivided and the vertices normalized.
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
    divideTriangles(points, vertices[a], vertices[b], vertices[c], 3);
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


function colorCube() {
    quad( 1, 0, 3, 2 );
    quad( 2, 3, 7, 6 );
    quad( 3, 0, 4, 7 );
    quad( 6, 5, 1, 2 );
    quad( 4, 5, 6, 7 );
    quad( 5, 4, 0, 1 );
}

function quad(a, b, c, d) {
    var vertices = [
        vec4( -0.5, -0.5,  0.5, 1.0 ),
        vec4( -0.5,  0.5,  0.5, 1.0 ),
        vec4(  0.5,  0.5,  0.5, 1.0 ),
        vec4(  0.5, -0.5,  0.5, 1.0 ),
        vec4( -0.5, -0.5, -0.5, 1.0 ),
        vec4( -0.5,  0.5, -0.5, 1.0 ),
        vec4(  0.5,  0.5, -0.5, 1.0 ),
        vec4(  0.5, -0.5, -0.5, 1.0 )
    ];

    var vertexColors = [
        [ 0.0, 0.0, 0.0, 1.0 ],  // black
        [ 1.0, 0.0, 0.0, 1.0 ],  // red
        [ 1.0, 1.0, 0.0, 1.0 ],  // yellow
        [ 0.0, 1.0, 0.0, 1.0 ],  // green
        [ 0.0, 0.0, 1.0, 1.0 ],  // blue
        [ 1.0, 0.0, 1.0, 1.0 ],  // magenta
        [ 0.0, 1.0, 1.0, 1.0 ],  // cyan
        [ 1.0, 1.0, 1.0, 1.0 ]   // white
    ];

    // We need to parition the quad into two triangles in order for
    // WebGL to be able to render it.  In this case, we create two
    // triangles from the quad indices

    //vertex color assigned by the index of the vertex

    var indices = [ a, b, c, a, c, d ];

    for ( var i = 0; i < indices.length; ++i ) {
        points.push( vertices[indices[i]] );
        //colors.push( vertexColors[indices[i]] );

        // for solid colored faces use
        colors.push(vertexColors[a]);

    }
}
