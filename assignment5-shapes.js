"use strict";

function createSphere(gl) {
  var x = 0.525731112119133606;
  var z = 0.850650808352039932;

  var vertices = [
    vec4(-x, 0.0, z, 1.0), vec4(x, 0.0, z, 1.0), vec4(-x, 0.0, -z, 1.0), vec4(x, 0.0, -z, 1.0),
    vec4(0.0, z, x, 1.0), vec4(0.0, z, -x, 1.0), vec4(0.0, -z, x, 1.0), vec4(0.0, -z, -x, 1.0),
    vec4(z, x, 0.0, 1.0), vec4(-z, x, 0.0, 1.0), vec4(z, -x, 0.0, 1.0), vec4(-z, -x, 0.0, 1.0)
  ];


  // A sphere is a icosahedron where each of the triangles is subdivided
  // and the vertices normalized (so they are pushed outwards towards the sphere surface).
  var points = [];
  var normals = [];
  var texCoords = [];
  triangle(vertices, points, normals, texCoords, 0, 4, 1);
  triangle(vertices, points, normals, texCoords, 0, 9, 4);
  triangle(vertices, points, normals, texCoords, 9, 5, 4);
  triangle(vertices, points, normals, texCoords, 4, 5, 8);
  triangle(vertices, points, normals, texCoords, 4, 8, 1);

  triangle(vertices, points, normals, texCoords, 8, 10, 1);
  triangle(vertices, points, normals, texCoords, 8, 3, 10);
  triangle(vertices, points, normals, texCoords, 5, 3, 8);
  triangle(vertices, points, normals, texCoords, 5, 2, 3);
  triangle(vertices, points, normals, texCoords, 2, 7, 3);

  triangle(vertices, points, normals, texCoords, 7, 10, 3);
  triangle(vertices, points, normals, texCoords, 7, 6, 10);
  triangle(vertices, points, normals, texCoords, 7, 11, 6);
  triangle(vertices, points, normals, texCoords, 11, 0, 6);
  triangle(vertices, points, normals, texCoords, 0, 1, 6);

  triangle(vertices, points, normals, texCoords, 6, 1, 10);
  triangle(vertices, points, normals, texCoords, 9, 0, 11);
  triangle(vertices, points, normals, texCoords, 9, 11, 2);
  triangle(vertices, points, normals, texCoords, 9, 2, 5);
  triangle(vertices, points, normals, texCoords, 7, 2, 11);

  var shape = { buffers: [], normals: [], textures: [] };
  shape.buffers.push(createBuffer(gl, points, gl.TRIANGLES, SURFACE));
  shape.normals.push(createNormalBuffer(gl, normals));
  shape.textures.push(createNormalBuffer(gl, texCoords));
  return shape;
}

function triangle(vertices, points, normals, texCoords, a, b, c) {
  var tesselationDepth = 4;
  divideTriangles(points, normals, texCoords, vertices[a], vertices[b], vertices[c], tesselationDepth);
}

function divideTriangles(points, normals, texCoords, a, b, c, depth) {
  if (depth == 0) {
    points.push(a, b, c);
    normals.push(vec3(a), vec3(b), vec3(c));
    texCoords.push(toTexCoord(a), toTexCoord(b), toTexCoord(c));
  } else {
    var ab = normalize(mix(a, b, 0.5), true);
    var ac = normalize(mix(a, c, 0.5), true);
    var bc = normalize(mix(b, c, 0.5), true);
    divideTriangles(points, normals, texCoords, a, ab, ac, depth - 1);
    divideTriangles(points, normals, texCoords, ab, b, bc, depth - 1);
    divideTriangles(points, normals, texCoords, ab, bc, ac, depth - 1);
    divideTriangles(points, normals, texCoords, ac, bc, c, depth - 1);
  }
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

function toTexCoord(point) {
  return vec2((point[0] + 1.0) / 2.0, (point[1] + 1.0) / 2.0);
}