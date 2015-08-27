"use strict";

var REGULAR_MAPPING = 0;
var TYPE1_MAPPING = 1;
var TYPE2_MAPPING = 2;
var TYPE3_MAPPING = 3;

function createSphere(gl, typeOfMapping) {
  var latitudeBands = 40;
  var longitudeBands = 40;
  var points = [];
  var points1 = [];
  var normals = [];
  var normals1 = [];
  var texCoords = [];
  var texCoords1 = [];

  for (var latNumber = 0; latNumber <= latitudeBands; latNumber++) {
    var theta = latNumber * Math.PI / latitudeBands;
    var sinTheta = Math.sin(theta);
    var cosTheta = Math.cos(theta);

    for (var longNumber = 0; longNumber <= longitudeBands; longNumber++) {
      var phi = longNumber * 2.0 * Math.PI / longitudeBands;
      var sinPhi = Math.sin(phi);
      var cosPhi = Math.cos(phi);

      var x = cosPhi * sinTheta;
      var y = cosTheta;
      var z = sinPhi * sinTheta;

      if (typeOfMapping == REGULAR_MAPPING) {
        var tx = (phi + Math.PI) / (2 * Math.PI);
        var ty = theta / Math.PI;
        texCoords1.push(vec2(tx, ty));
      } else if (typeOfMapping == TYPE1_MAPPING) {
        texCoords1.push(vec2((x + 1.0) / 2, - (y + 1.0) / 2));
      } else if (typeOfMapping == TYPE2_MAPPING) {
        var tx = (phi + Math.PI) / (2 * Math.PI);
        texCoords1.push(vec2(tx, - (y + 1.0) / 2));
      } else if (typeOfMapping == TYPE3_MAPPING) {
        var tx = Math.random();
        var ty = Math.random();
        texCoords1.push(vec2(tx, ty));
      }
      normals1.push(vec3(x, y, z));
      points1.push(vec4(x, y, z, 1.0));
    }
  }

  for (var latNumber = 0; latNumber < latitudeBands; latNumber++) {
    for (var longNumber = 0; longNumber < longitudeBands; longNumber++) {
      var first = (latNumber * (longitudeBands + 1)) + longNumber;
      var second = first + longitudeBands + 1;
      points.push(points1[first], points1[second], points1[first + 1]);
      points.push(points1[second], points1[second + 1], points1[first + 1]);
      normals.push(normals1[first], normals1[second], normals1[first + 1]);
      normals.push(normals1[second], normals1[second + 1], normals1[first + 1]);
      texCoords.push(texCoords1[first], texCoords1[second], texCoords1[first + 1]);
      texCoords.push(texCoords1[second], texCoords1[second + 1], texCoords1[first + 1]);
    }
  }
  var shape = { buffers: [], normals: [], textures: [] };
  shape.buffers.push(createBuffer(gl, points, gl.TRIANGLES, SURFACE));
  shape.normals.push(createNormalBuffer(gl, normals));
  shape.textures.push(createNormalBuffer(gl, texCoords));
  return shape;
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
  var normals = [];
  var texCoords = [];

  var quads = [[1, 0, 3, 2], [2, 3, 7, 6], [3, 0, 4, 7], [6, 5, 1, 2], [4, 5, 6, 7], [5, 4, 0, 1]];
  for (var i = 0; i < quads.length; i++) {
    var quad = quads[i];
    var indices = [ quad[0], quad[1], quad[2], quad[0], quad[2], quad[3] ];
    var normal = computeNormal(vertices[indices[0]], vertices[indices[1]], vertices[indices[2]]);
    for (var j = 0; j < indices.length; j++) {
      triangles.push(vertices[indices[j]]);
      normals.push(normal);
    };
    texCoords.push(0, 1, 0, 0, 1, 1, 0, 1, 1, 1, 1, 0);
  };
  var shape = { buffers: [], normals: [] };
  shape.buffers.push(createBuffer(gl, triangles, gl.TRIANGLES, SURFACE));
  shape.normals.push(createNormalBuffer(gl, normals));
  shape.textures.push(createNormalBuffer(gl, texCoords));
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

function toTexCoord(point) {
  return vec2((point[0] + 1.0) / 2.0, (point[1] + 1.0) / 2.0);
}