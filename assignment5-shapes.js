"use strict";

function createSphere(gl) {
  var latitudeBands = 30;
  var longitudeBands = 30;
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

      var tx1 = (phi + Math.PI) / (2 * Math.PI);
      var ty1 = - theta / Math.PI;

      texCoords1.push(vec2(tx1, ty1));
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