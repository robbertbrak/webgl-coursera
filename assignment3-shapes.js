"use strict";

function createCone(gl) {
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

  shape.buffers.push(createBuffer(gl, disc, gl.TRIANGLE_FAN, SURFACE));
  shape.buffers.push(createBuffer(gl, cone, gl.TRIANGLE_FAN, SURFACE));
  shape.buffers.push(createBuffer(gl, lineloop, gl.LINE_LOOP, OUTLINE));
  shape.buffers.push(createBuffer(gl, lines, gl.LINES, OUTLINE));
  return shape;
}

function createCylinder(gl) {
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

    shape.buffers.push(createBuffer(gl, disc, gl.TRIANGLE_FAN, SURFACE));
    shape.buffers.push(createBuffer(gl, lineloop, gl.LINE_LOOP, OUTLINE));
  }

  var tube = [];
  for (var i = 0; i < circle.length; i++) {
    var top = vec4(circle[i][0], circle[i][1], z[0], 1.0);
    var bottom = vec4(circle[i][0], circle[i][1], z[1], 1.0);
    tube.push(top, bottom);
    lines.push(top, bottom); // links between discs
  }

  shape.buffers.push(createBuffer(gl, tube, gl.TRIANGLE_STRIP, SURFACE));
  shape.buffers.push(createBuffer(gl, lines, gl.LINES, OUTLINE));
  return shape;
}

function createCircle(gl) {
  var edges = 30;
  var circle = [];
  for (var i = 0; i < edges; i++) {
    var edge = vec2(Math.cos(2*Math.PI*i/edges) / Math.sqrt(2), Math.sin(2*Math.PI*i/edges) / Math.sqrt(2));
    circle.push(edge);
  }
  circle.push(circle[0]);
  return circle;
}


function createSphere(gl) {
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
  shape.buffers.push(createBuffer(gl, points, gl.TRIANGLES, SURFACE));
  shape.buffers.push(createBuffer(gl, points, gl.LINE_STRIP, OUTLINE));
  return shape;
}

function triangle(vertices, points, a, b, c) {
  var tesselationDepth = 3;
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

function createCube(gl) {
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
  shape.buffers.push(createBuffer(gl, triangles, gl.TRIANGLES, SURFACE));
  shape.buffers.push(createBuffer(gl, lines, gl.LINES, OUTLINE));
  return shape;
}

function createLine(gl, a, b) {
  var shape = { buffers: [] };
  shape.buffers.push(createBuffer(gl, [a, b], gl.LINES, OUTLINE));
  return shape;
}

function createGrid(gl) {
  var numlines = 20;
  var lines = [];
  for (var i = 0; i <= numlines; i++) {
    var a = (2.0 * i / numlines) - 1;

    // Grid with constant y
    lines.push(vec4(a, -1.0, 1.0, 1.0), vec4(a, -1.0, -1.0, 1.0));
    lines.push(vec4(-1.0, -1.0, a, 1.0), vec4(1.0, -1.0, a, 1.0));

    // Grid with constant x
    lines.push(vec4(-1.0, a, 1.0, 1.0), vec4(-1.0, a, -1.0, 1.0));
    lines.push(vec4(-1.0, -1.0, a, 1.0), vec4(-1.0, 1.0, a, 1.0));
  }
  var shape = { buffers: [] };
  shape.buffers.push(createBuffer(gl, lines, gl.LINES, OUTLINE));
  return shape;
}

function createBuffer(gl, points, drawmode, fillmode) {
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