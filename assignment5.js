"use strict";

var canvas;
var gl;
var program;

var SURFACE = 1;
var OUTLINE = 2;

var objects = [];
var textures = [];
var textureImages = [];
var textureTypes = [];
var moon = {};

var USE_CUBE_MAP = 1;
var USE_TEXTURE_2D = 0;

var currentObject = {};
var autorotateY = true;

var numChecks = 16;
var checkColor = [ 90, 90, 90 ];

var EARTH_TEXTURE = 0;
var CHECKERBOARD_TEXTURE = 1;
var CUBE_MAP = 2;

var textureMappings = [REGULAR_MAPPING, TYPE1_MAPPING, TYPE2_MAPPING, TYPE3_MAPPING];

var modelMatrixLoc;
var viewMatrixLoc;
var projectionMatrixLoc;
var normalMatrixLoc;
var lightPosition = [ -2.0, 2.0, 5.0 ];

var camera = {
  animated: true,
  theta: 1,
  phi: 10,
  radius: 5
};

var eye = [0, 0, 2];
var at = [0, 0, 0];
var up = [0, 1, 0];
var viewMatrix;

var shapes = {};

window.onload = function init() {
  initGlProgram();

  modelMatrixLoc = gl.getUniformLocation( program, "modelMatrix" );
  viewMatrixLoc = gl.getUniformLocation( program, "viewMatrix" );
  normalMatrixLoc = gl.getUniformLocation( program, "normalMatrix" );
  projectionMatrixLoc = gl.getUniformLocation( program, "projectionMatrix" );

  initShapes();
  loadTexture("earth", EARTH_TEXTURE);
  createCheckerboard(16);
  loadCubeMap(["cubemap-posx", "cubemap-negy", "cubemap-posz", "cubemap-negx", "cubemap-posy", "cubemap-negz"], CUBE_MAP);

  objects.push({
    shape: shapes.sphere[REGULAR_MAPPING],
    texture: EARTH_TEXTURE,
    scale: 0.7,
    x: 0, y: 0, z: 0,
    rotateX: 155, rotateY: 270, rotateZ: 0,
    visible: true
  });
  moon = {
    shape: shapes.sphere[REGULAR_MAPPING],
    texture: CHECKERBOARD_TEXTURE,
    scale: 0.2,
    x: 1.2, y: 0, z: 0,
    rotateX: 155, rotateY: 270, rotateZ: 0,
    visible: true
  };
  objects.push(moon);
  currentObject = objects[0];

  initEventListeners();
  render();
};

function render() {
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  var projectionMatrix = perspective(30, 1, 1, 20);

  moveCamera();
  moveObjects();

  calculateEyePosition();
  viewMatrix = lookAt(eye, at, up);
  gl.uniformMatrix4fv(projectionMatrixLoc, false, flatten(projectionMatrix));
  gl.uniformMatrix4fv(viewMatrixLoc, false, flatten(viewMatrix));
  gl.uniform3fv(gl.getUniformLocation(program, "lightPosition"), flatten(lightPosition));

  for (var i = 0; i < objects.length; i++) {
    renderObject(objects[i]);
  }

  requestAnimFrame(render);
}

function renderObject(object) {
  if (!object.visible) {
    return;
  }
  // Set transformation matrix for current object
  var modelViewMatrix = mult(getTranslationMatrix(object.x, object.y, object.z),
      mult(getRotationMatrix(object.rotateX, object.rotateY, object.rotateZ),
          getScaleMatrix(object.scale, object.scale, object.scale)));
  gl.uniformMatrix4fv(modelMatrixLoc, false, flatten(modelViewMatrix));
  gl.uniformMatrix3fv(normalMatrixLoc, false, flatten(normalMatrix(modelViewMatrix, true)));

  var shape = object.shape;

  for (var j = 0; j < shape.buffers.length; j++) {
    var normalInfo = shape.normals[j];
    gl.bindBuffer(gl.ARRAY_BUFFER, normalInfo.buffer);
    var vNormal = gl.getAttribLocation(program, "vNormal");
    gl.vertexAttribPointer(vNormal, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vNormal);

    var textureType = textureTypes[object.texture];
    gl.uniform1i(gl.getUniformLocation(program, "useCube"), textureType);
    if (textureType == USE_CUBE_MAP) {
      gl.uniform1i(gl.getUniformLocation(program, "uSamplerCube"), object.texture);
    } else {
      gl.uniform1i(gl.getUniformLocation(program, "uSampler"), object.texture);
      var vertexTexCoordAttribute = gl.getAttribLocation(program, "vTextureCoord");
      gl.bindBuffer(gl.ARRAY_BUFFER, shape.textures[j].buffer);
      gl.enableVertexAttribArray(vertexTexCoordAttribute);
      gl.vertexAttribPointer(vertexTexCoordAttribute, 2, gl.FLOAT, false, 0, 0);
    }

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

function moveCamera() {
  if (camera.animated) {
    camera.phi = (camera.phi + 360 - 1.0) % 360;
    $("#cameraPhi").val(camera.phi);
  }
}

function calculateEyePosition() {
  var cosTheta = Math.cos(radians(camera.theta));
  var sinTheta = Math.sin(radians(camera.theta));
  var cosPhi = Math.cos(radians(camera.phi));
  var sinPhi = Math.sin(radians(camera.phi));
  var radius = parseFloat(camera.radius);
  eye[0] = radius * cosTheta * sinPhi;
  eye[1] = radius * sinTheta * sinPhi;
  eye[2] = radius * cosPhi;
}

function moveObjects() {
  if (autorotateY) {
    currentObject.rotateY = (parseFloat(currentObject.rotateY) + 1) % 360;
    $("#rotateY").val(currentObject.rotateY);
    moon.rotateY = (parseFloat(objects[1].rotateY) + 360 - 3) % 360;
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

function loadCubeMap(ids, i) {
  var cubeMap = gl.createTexture();
  gl.activeTexture(gl.TEXTURE0 + i);
  gl.bindTexture(gl.TEXTURE_CUBE_MAP, cubeMap);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

  for (var j = 0; j < ids.length; j++) {
    textureImages[j + i] = document.getElementById(ids[j]);
  }
  gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_X, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, textureImages[i + 0]);
  gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_Y, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, textureImages[i + 1]);
  gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_Z, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, textureImages[i + 2]);
  gl.texImage2D(gl.TEXTURE_CUBE_MAP_NEGATIVE_X, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, textureImages[i + 3]);
  gl.texImage2D(gl.TEXTURE_CUBE_MAP_NEGATIVE_Y, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, textureImages[i + 4]);
  gl.texImage2D(gl.TEXTURE_CUBE_MAP_NEGATIVE_Z, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, textureImages[i + 5]);

  gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
  gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.NEAREST_MIPMAP_LINEAR);
  gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.REPEAT);

  textures[i] = cubeMap;
  textureTypes[i] = USE_CUBE_MAP;

  if (!gl.isTexture(textures[i])) {
    console.error("Error: Texture is invalid");
  }

}

function setupTexture(i, options) {
  options = options || {};
  gl.activeTexture(gl.TEXTURE0 + i);
  textures[i] = gl.createTexture();
  textureTypes[i] = USE_TEXTURE_2D;
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
  var image = new Uint8Array(4*texSize*texSize);
  var c = [0, 0, 0];

  // Create a checkerboard pattern
  for ( var i = 0; i < texSize; i++ ) {
    for ( var j = 0; j <texSize; j++ ) {
      var patchx = Math.floor(i/(texSize/numChecks));
      var patchy = Math.floor(j/(texSize/numChecks));
      if (patchx % 2 ^ patchy % 2) {
        c = [255, 255, 255]; // white
      } else {
        c = checkColor;
      }
      image[4*i*texSize+4*j] = c[0];
      image[4*i*texSize+4*j+1] = c[1];
      image[4*i*texSize+4*j+2] = c[2];
      image[4*i*texSize+4*j+3] = 255;
    }
  }

  textureImages[CHECKERBOARD_TEXTURE] = image;
  setupTexture(CHECKERBOARD_TEXTURE, { texSize: 1024 });
}

function initEventListeners() {
  $("#texture").change(function() {
    currentObject.texture = $(this).val();
    $("#textureMapping").prop("disabled", currentObject.texture == CUBE_MAP);
    if (currentObject.texture == CUBE_MAP && autorotateY) {
      $("#autorotateY").click();
    }
  });
  $("#textureMapping").change(function() { currentObject.shape = shapes.sphere[$(this).val()]; });
  $("#rotateX").on("input", function() { currentObject.rotateX = parseFloat(this.value) });
  $("#rotateX").on("change", function() { currentObject.rotateX = parseFloat(this.value) });
  $("#rotateY").on("input", function() { currentObject.rotateY = parseFloat(this.value) });
  $("#rotateY").on("change", function() { currentObject.rotateY = parseFloat(this.value) });
  $("#rotateZ").on("input", function() { currentObject.rotateZ = parseFloat(this.value) });
  $("#rotateZ").on("change", function() { currentObject.rotateZ = parseFloat(this.value) });
  $("#numChecks").on("input", function() { numChecks = parseInt($(this).val()); createCheckerboard() });
  $("#numChecks").on("change", function() { numChecks = parseInt($(this).val()); createCheckerboard() });
  addColorPicker("checkColor", "checkColor");

  $("#moonVisible").click(function() {
    moon.visible = this.checked;
  });

  $("#autorotateY").click(function() {
    autorotateY = this.checked;
  });

  $("#lightX").on("input", function() { lightPosition[0] = parseFloat(this.value); });
  $("#lightX").on("change", function() { lightPosition[0] = parseFloat(this.value); });
  $("#lightY").on("input", function() { lightPosition[1] = parseFloat(this.value); });
  $("#lightY").on("change", function() { lightPosition[1] = parseFloat(this.value); });
  $("#lightZ").on("input", function() { lightPosition[2] = parseFloat(this.value); });
  $("#lightZ").on("change", function() { lightPosition[2] = parseFloat(this.value); });

  $("#cameraAnimated").click(function() {
    camera.animated = this.checked;
  });

  $("#cameraPhi").on("input", function() { camera.phi = parseFloat(this.value); });
  $("#cameraPhi").on("change", function() { camera.phi = parseFloat(this.value); });
  $("#cameraTheta").on("input", function() { camera.theta = parseFloat(this.value); });
  $("#cameraTheta").on("change", function() { camera.theta = parseFloat(this.value); });
  $("#cameraRadius").on("input", function() { camera.radius = parseFloat(this.value); });
  $("#cameraRadius").on("change", function() { camera.radius = parseFloat(this.value); });

  // Initialize values in UI.
  $("#numChecks").val(numChecks);
  $("#rotateX").val(currentObject.rotateX);
  $("#rotateY").val(currentObject.rotateY);
  $("#rotateZ").val(currentObject.rotateZ);
  $("#lightX").val(lightPosition[0]);
  $("#lightY").val(lightPosition[1]);
  $("#lightZ").val(lightPosition[2]);
  $("#cameraAnimated").prop("checked", camera.animated);
  $("#cameraPhi").val(camera.phi);
  $("#cameraTheta").val(camera.theta);
  $("#cameraRadius").val(camera.radius);
}

function addColorPicker(elementId, objectProperty) {
  $("#" + elementId).spectrum({
    color: toColorPicker(checkColor),
    showPalette: true,
    palette: getPalette(),
    change: function(color) {
      var rgb = color.toRgb();
      checkColor = vec3(rgb.r, rgb.g, rgb.b);
      console.log(numChecks, checkColor);
      createCheckerboard();
    }
  });
}

function toColorPicker(v) {
  return tinycolor({ r: v[0], g: v[1], b: v[2] });
}

function getPalette() {
  return [
    ["rgb(0, 0, 0)", "rgb(67, 67, 67)", "rgb(102, 102, 102)",
      "rgb(204, 204, 204)", "rgb(217, 217, 217)","rgb(255, 255, 255)"],
    ["rgb(152, 0, 0)", "rgb(255, 0, 0)", "rgb(255, 153, 0)", "rgb(255, 255, 0)", "rgb(0, 255, 0)",
      "rgb(0, 255, 255)", "rgb(74, 134, 232)", "rgb(0, 0, 255)", "rgb(153, 0, 255)", "rgb(255, 0, 255)"],
    ["rgb(230, 184, 175)", "rgb(244, 204, 204)", "rgb(252, 229, 205)", "rgb(255, 242, 204)", "rgb(217, 234, 211)",
      "rgb(208, 224, 227)", "rgb(201, 218, 248)", "rgb(207, 226, 243)", "rgb(217, 210, 233)", "rgb(234, 209, 220)"],
    ["rgb(221, 126, 107)", "rgb(234, 153, 153)", "rgb(249, 203, 156)", "rgb(255, 229, 153)", "rgb(182, 215, 168)",
      "rgb(162, 196, 201)", "rgb(164, 194, 244)", "rgb(159, 197, 232)", "rgb(180, 167, 214)", "rgb(213, 166, 189)"],
    ["rgb(204, 65, 37)", "rgb(224, 102, 102)", "rgb(246, 178, 107)", "rgb(255, 217, 102)", "rgb(147, 196, 125)",
      "rgb(118, 165, 175)", "rgb(109, 158, 235)", "rgb(111, 168, 220)", "rgb(142, 124, 195)", "rgb(194, 123, 160)"],
    ["rgb(166, 28, 0)", "rgb(204, 0, 0)", "rgb(230, 145, 56)", "rgb(241, 194, 50)", "rgb(106, 168, 79)",
      "rgb(69, 129, 142)", "rgb(60, 120, 216)", "rgb(61, 133, 198)", "rgb(103, 78, 167)", "rgb(166, 77, 121)"],
    ["rgb(91, 15, 0)", "rgb(102, 0, 0)", "rgb(120, 63, 4)", "rgb(127, 96, 0)", "rgb(39, 78, 19)",
      "rgb(12, 52, 61)", "rgb(28, 69, 135)", "rgb(7, 55, 99)", "rgb(32, 18, 77)", "rgb(76, 17, 48)"]
  ];
}
