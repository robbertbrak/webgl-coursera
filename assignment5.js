"use strict";

var canvas;
var gl;
var program;

var SURFACE = 1;
var OUTLINE = 2;

var objects = [];
var textures = [];
var textureImages = [];
var currentObject = {};

var EARTH_TEXTURE = 0;

var modelViewMatrixLoc;

var shapes = {};

window.onload = function init() {
  initGlProgram();

  modelViewMatrixLoc = gl.getUniformLocation( program, "modelViewMatrix" );

  initShapes();
  initEventListeners();

  loadTexture("earth-image", EARTH_TEXTURE);
  objects.push({
    shape: shapes.sphere,
    texture: EARTH_TEXTURE,
    scale: 0.5,
    x: -0, y: 0, z: 0,
    rotateX: 0, rotateY: 0, rotateZ: 0
  });
  currentObject = objects[0];

  render();
};

function render() {
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  for (var i = 0; i < objects.length; i++) {
    renderObject(objects[i]);
  }

  requestAnimFrame(render);
}

function renderObject(object) {
  // Set transformation matrix for current object
  var modelViewMatrix = mult(getTranslationMatrix(object.x, object.y, object.z),
      mult(getRotationMatrix(object.rotateX, object.rotateY, object.rotateZ),
          getScaleMatrix(object.scale, object.scale, object.scale)));
  gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(modelViewMatrix));

  var shape = object.shape;

  for (var j = 0; j < shape.buffers.length; j++) {

    gl.uniform1i(gl.getUniformLocation(program, "uSampler"), object.texture);
    var vertexTexCoordAttribute = gl.getAttribLocation(program, "vTextureCoord");
    gl.bindBuffer(gl.ARRAY_BUFFER, shape.textures[j].buffer);
    gl.enableVertexAttribArray(vertexTexCoordAttribute);
    gl.vertexAttribPointer(vertexTexCoordAttribute, 2, gl.FLOAT, false, 0, 0);

    var bufferInfo = shape.buffers[j];
    gl.bindBuffer(gl.ARRAY_BUFFER, bufferInfo.buffer);
    var vPosition = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    gl.drawArrays(bufferInfo.drawmode, 0, bufferInfo.numVertices);
  }
}

function initShapes() {
  var sphere = createSphere(gl);
  shapes = {
    "sphere": sphere
  };
}

function getRotationMatrix(x, y, z) {
  return mult(mult(rotateX(x), rotateY(y)), rotateZ(z));
}

function getTranslationMatrix(x, y, z) {
  return translate(x, y, z);
}

function getScaleMatrix(x, y, z) {
  return scale(x, y, z);
}

function random(min, max) {
  return Math.random() * (max - min) + min;
}

function initGlProgram() {
  canvas = document.getElementById("gl-canvas");

  gl = WebGLUtils.setupWebGL(canvas);
  if (!gl) {
    alert("WebGL isn't available");
  }

  gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);

  var gray = 45 / 255.0;
  gl.clearColor(gray, gray, gray, 1.0);

  gl.enable(gl.DEPTH_TEST);
  gl.enable(gl.POLYGON_OFFSET_FILL);
  gl.polygonOffset(0.2, 0);

  program = initShaders(gl, "vertex-shader", "fragment-shader");
  gl.useProgram(program);
}

function loadTexture(id, i) {
  textureImages[i] = document.getElementById("earth-image");
  setupTexture(i);
}

function setupTexture(i) {
  gl.activeTexture(gl.TEXTURE0 + i);
  textures[i] = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, textures[i]);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, textureImages[i]);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  if (!gl.isTexture(textures[i])) {
    console.error("Error: Texture is invalid");
  }
}

function initEventListeners() {
  $("#rotateX").on("input", function() { changeRotation($(this).val(), "X") });
  $("#rotateY").on("input", function() { changeRotation($(this).val(), "Y") });
  $("#rotateZ").on("input", function() { changeRotation($(this).val(), "Z") });
  $("#rotateX").on("change", function() { changeRotation($(this).val(), "X") });
  $("#rotateY").on("change", function() { changeRotation($(this).val(), "Y") });
  $("#rotateZ").on("change", function() { changeRotation($(this).val(), "Z") });
}

function changeRotation(val, axis) {
  currentObject["rotate" + axis] = val;
}
