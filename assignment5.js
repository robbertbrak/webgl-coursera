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
var autorotateY = true;

var EARTH_TEXTURE = 0;
var CHECKERBOARD_TEXTURE = 1;

var textureMappings = [REGULAR_MAPPING, TYPE1_MAPPING, TYPE2_MAPPING, TYPE3_MAPPING];

var modelViewMatrixLoc;

var shapes = {};

window.onload = function init() {
  initGlProgram();

  modelViewMatrixLoc = gl.getUniformLocation( program, "modelViewMatrix" );

  initShapes();
  loadTexture("earth", EARTH_TEXTURE);
  createCheckerboard();
  objects.push({
    shape: shapes.sphere[REGULAR_MAPPING],
    texture: EARTH_TEXTURE,
    scale: 0.7,
    x: -0, y: 0, z: 0,
    rotateX: 25, rotateY: 270, rotateZ: 0
  });
  currentObject = objects[0];

  initEventListeners();
  render();
};

function render() {
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  if (autorotateY) {
    $("#rotateY").val(currentObject.rotateY);
    changeRotation((currentObject.rotateY + 1) % 360, "Y");
  }

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
  shapes = {
    "sphere": {}
  };

  for (var i = 0; i < textureMappings.length; i++) {
    var sphere = createSphere(gl, textureMappings[i]);
    shapes.sphere[textureMappings[i]] = sphere;
  }

}

function getRotationMatrix(x, y, z) {
  return mult(mult(rotateX(x), rotateY(y)), rotateZ(z));
}

function getTranslationMatrix(x, y, z) {
  return translate(x, y, z);
}

function getScaleMatrix(x, y, z) {
  return scalem(x, y, z);
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
  textureImages[i] = document.getElementById(id);
  setupTexture(i);
}

function setupTexture(i, options) {
  options = options || {};
  gl.activeTexture(gl.TEXTURE0 + i);
  textures[i] = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, textures[i]);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  if (options.texSize) {
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, options.texSize, options.texSize, 0, gl.RGBA, gl.UNSIGNED_BYTE, textureImages[i]);
  } else {
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, textureImages[i]);
  }
  gl.generateMipmap(gl.TEXTURE_2D);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST_MIPMAP_LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);

  if (!gl.isTexture(textures[i])) {
    console.error("Error: Texture is invalid");
  }
}

function createCheckerboard() {
  var texSize = 1024;
  var numChecks = 16;
  var image = new Uint8Array(4*texSize*texSize);
  var c = 0;

  // Create a checkerboard pattern
  for ( var i = 0; i < texSize; i++ ) {
    for ( var j = 0; j <texSize; j++ ) {
      var patchx = Math.floor(i/(texSize/numChecks));
      var patchy = Math.floor(j/(texSize/numChecks));
      if (patchx % 2 ^ patchy % 2) c = 255;
      else c = 0;
      //c = 255*(((i & 0x8) == 0) ^ ((j & 0x8)  == 0))
      image[4*i*texSize+4*j] = c;
      image[4*i*texSize+4*j+1] = c;
      image[4*i*texSize+4*j+2] = c;
      image[4*i*texSize+4*j+3] = 255;
    }
  }

  textureImages[CHECKERBOARD_TEXTURE] = image;
  setupTexture(CHECKERBOARD_TEXTURE, { texSize: 1024 });
}

function initEventListeners() {
  $("#texture").change(function() { currentObject.texture = $(this).val(); });
  $("#textureMapping").change(function() { currentObject.shape = shapes.sphere[$(this).val()]; });
  $("#rotateX").on("input", function() { changeRotation($(this).val(), "X") });
  $("#rotateY").on("input", function() { changeRotation($(this).val(), "Y") });
  $("#rotateZ").on("input", function() { changeRotation($(this).val(), "Z") });
  $("#rotateX").on("change", function() { changeRotation($(this).val(), "X") });
  $("#rotateY").on("change", function() { changeRotation($(this).val(), "Y") });
  $("#rotateZ").on("change", function() { changeRotation($(this).val(), "Z") });
  $("#autorotateY").click(function() {
    autorotateY = this.checked;
    $("#rotateY").prop("disabled", this.checked);
  });

  $("#rotateX").val(currentObject.rotateX);
  $("#rotateY").val(currentObject.rotateY);
  $("#rotateZ").val(currentObject.rotateZ);
}

function changeRotation(val, axis) {
  currentObject["rotate" + axis] = val;
}
