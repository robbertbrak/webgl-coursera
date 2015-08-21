"use strict";

function createCone(gl) {
  // For a cone: create a 2D unit circle.
  // Create a triangle fan for the disc.
  // Create another triangle fan for the cone itself.
  // Create a line loop for the outline of the disc.
  // Create lines for the spokes of the disc and the spokes of the cone.

  var shape = { buffers: [], normals: [] };
  var circle = createCircle();

  var z = [1.0 / Math.sqrt(2), -1.0 / Math.sqrt(2)];

  var disc = [];
  var cone = [];

  var center = vec4(0, 0, z[0], 1.0);
  var top = vec4(0, 0, z[1], 1.0);

  var discNormal = [];
  var coneNormal = [];

  for (var i = 0; i < circle.length; i++) {
    var edge = vec4(circle[i][0], circle[i][1], z[0], 1.0);
    disc.push(center);
    disc.push(vec4(circle[(i+1) % circle.length][0], circle[(i+1) % circle.length][1], z[0], 1.0));
    disc.push(edge);

    cone.push(top)
    cone.push(edge);
    cone.push(vec4(circle[(i+1) % circle.length][0], circle[(i+1) % circle.length][1], z[0], 1.0));
  }

  for (var i = 0; i < disc.length; i += 3) {
    var normal = computeNormal(disc[i], disc[i+1], disc[i+2]);
    discNormal.push(normal);
    discNormal.push(normal);
    discNormal.push(normal);
  }
  for (var i = 0; i < cone.length; i += 3) {
    var normal = computeNormal(cone[i], cone[i+1], cone[i+2]);
    coneNormal.push(normal);
    coneNormal.push(normal);
    coneNormal.push(normal);
  }

  shape.buffers.push(createBuffer(gl, disc, gl.TRIANGLES, SURFACE));
  shape.buffers.push(createBuffer(gl, cone, gl.TRIANGLES, SURFACE));
  shape.normals.push(createNormalBuffer(gl, discNormal));
  shape.normals.push(createNormalBuffer(gl, coneNormal));
  return shape;
}

function computeNormal(a, b, c) {
  var t1 = subtract(b, a);
  var t2 = subtract(c, b);
  return normalize(vec3(cross(t1, t2)));
}

function createCylinder(gl) {
  // A cylinder is two discs and a hollow tube connecting them.

  // First, create a 2D unit circle.
  // We use a triangle fan for each of discs.
  // We use a triangle strip for the tube.
  // We use a line loop for the outline of the circle
  // We use lines for the spokes of the discs.
  // We use lines for the links between the discs.

  var shape = { buffers: [], normals: [] };
  var circle = createCircle();

  var z = [1.0 / Math.sqrt(2), -1.0 / Math.sqrt(2)];

  var lines = [];

  for (var j = 0; j < z.length; j++) {
    var disc = [];
    var discNormal = []
    var lineloop = [];

    var center = vec4(0, 0, z[j], 1.0);

    for (var i = 0; i < circle.length; i++) {
      var edge = vec4(circle[i][0], circle[i][1], z[j], 1.0);
      disc.push(center);
      disc.push(vec4(circle[(i+1) % circle.length][0], circle[(i+1) % circle.length][1], z[j], 1.0));
      disc.push(edge);

      //lineloop.push(edge);
      //lines.push(center, edge); // spoke
    }

    for (var i = 0; i < disc.length; i += 3) {
      var normal;
      if (j == 0) {
        normal = computeNormal(disc[i], disc[i+1], disc[i+2]);
      } else {
        normal = computeNormal(disc[i], disc[i+2], disc[i+1]);
      }
      discNormal.push(normal);
      discNormal.push(normal);
      discNormal.push(normal);
    }

    shape.buffers.push(createBuffer(gl, disc, gl.TRIANGLES, SURFACE));
    shape.normals.push(createNormalBuffer(gl, discNormal));
  }

  var tube = [];
  var tubeNormal = [];
  for (var i = 0; i < circle.length; i++) {
    var top = vec4(circle[i][0], circle[i][1], z[0], 1.0);
    var top2 = vec4(circle[(i+1) % circle.length][0], circle[(i+1) % circle.length][1], z[0], 1.0);
    var bottom = vec4(circle[i][0], circle[i][1], z[1], 1.0);
    var bottom2 = vec4(circle[(i+1) % circle.length][0], circle[(i+1) % circle.length][1], z[1], 1.0);
    tube.push(top, bottom, bottom2, top, bottom2, top2);
    var normal = computeNormal(top, bottom2, bottom);
    tubeNormal.push(normal, normal, normal, normal, normal, normal);
    //lines.push(top, bottom); // links between discs
  }

  shape.buffers.push(createBuffer(gl, tube, gl.TRIANGLES, SURFACE));
  shape.normals.push(createNormalBuffer(gl, tubeNormal));
  return shape;
}

function createCircle(gl) {
  var edges = 180;
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
  var normals = [];
  triangle(vertices, points, normals, 0, 4, 1);
  triangle(vertices, points, normals, 0, 9, 4);
  triangle(vertices, points, normals, 9, 5, 4);
  triangle(vertices, points, normals, 4, 5, 8);
  triangle(vertices, points, normals, 4, 8, 1);

  triangle(vertices, points, normals, 8, 10, 1);
  triangle(vertices, points, normals, 8, 3, 10);
  triangle(vertices, points, normals, 5, 3, 8);
  triangle(vertices, points, normals, 5, 2, 3);
  triangle(vertices, points, normals, 2, 7, 3);

  triangle(vertices, points, normals, 7, 10, 3);
  triangle(vertices, points, normals, 7, 6, 10);
  triangle(vertices, points, normals, 7, 11, 6);
  triangle(vertices, points, normals, 11, 0, 6);
  triangle(vertices, points, normals, 0, 1, 6);

  triangle(vertices, points, normals, 6, 1, 10);
  triangle(vertices, points, normals, 9, 0, 11);
  triangle(vertices, points, normals, 9, 11, 2);
  triangle(vertices, points, normals, 9, 2, 5);
  triangle(vertices, points, normals, 7, 2, 11);

  var shape = { buffers: [], normals: [] };
  shape.buffers.push(createBuffer(gl, points, gl.TRIANGLES, SURFACE));
  shape.normals.push(createNormalBuffer(gl, normals));
  return shape;
}

function triangle(vertices, points, normals, a, b, c) {
  var tesselationDepth = 4;
  divideTriangles(points, normals, vertices[a], vertices[b], vertices[c], tesselationDepth);
}

function divideTriangles(points, normals, a, b, c, depth) {
  if (depth == 0) {
    points.push(a, b, c);
    var normal = computeNormal(a, b, c);
    normals.push(vec3(a), vec3(b), vec3(c));
  } else {
    var ab = normalize(mix(a, b, 0.5), true);
    var ac = normalize(mix(a, c, 0.5), true);
    var bc = normalize(mix(b, c, 0.5), true);
    divideTriangles(points, normals, a, ab, ac, depth - 1);
    divideTriangles(points, normals, ab, b, bc, depth - 1);
    divideTriangles(points, normals, ab, bc, ac, depth - 1);
    divideTriangles(points, normals, ac, bc, c, depth - 1);
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
  var normals = [];

  var quads = [[1, 0, 3, 2], [2, 3, 7, 6], [3, 0, 4, 7], [6, 5, 1, 2], [4, 5, 6, 7], [5, 4, 0, 1]];
  for (var i = 0; i < quads.length; i++) {
    var quad = quads[i];
    var indices = [ quad[0], quad[1], quad[2], quad[0], quad[2], quad[3] ];
    var normal = computeNormal(vertices[indices[0]], vertices[indices[2]], vertices[indices[1]]);
    for (var j = 0; j < indices.length; j++) {
      triangles.push(vertices[indices[j]]);
      normals.push(normal);
    };
    for (var j = 0; j < quad.length; j++) {
      lines.push(vertices[quad[j]], vertices[quad[(j+1) % 4]]);
    };
  };
  var shape = { buffers: [], normals: [] };
  shape.buffers.push(createBuffer(gl, triangles, gl.TRIANGLES, SURFACE));
  shape.normals.push(createNormalBuffer(gl, normals));
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

function createNormalBuffer(gl, points) {
  var vBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, flatten(points), gl.STATIC_DRAW);
  return {
    buffer: vBuffer,
    numVertices: points.length
  }
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