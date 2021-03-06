"use strict";

var canvas;
var gl;
var program;

var baseColor;

var SURFACE = 1;
var OUTLINE = 2;

var fixedObjects = [];
var objects = [];
var currentObject = {};
var numObjectsCreated = 0;

var mouseDown = false;

var modelViewMatrixLoc;
var normalMatrixLoc;

var shapes = {};
var shapeNames = [];
var camera = {};
camera.radius = 6;
camera.angle = 45;
camera.animated = true;
var eye = [4.158247202848457, 2.375470056608669, 3.6147091459975838];
var at = [0, 0, 0];
var up = [0, 1, 0];

var lights = [];
var currentLight = {};

var ambientColor = vec4( 1.0, 1.0, 1.0, 1.0 );
var diffuseColor = vec4( 0.8, 0.8, 0.8, 1.0);
var specularColor = vec4( 1.0, 1.0, 1.0, 1.0 );
var materialShininess = 10.0;

var ambientIntensity = 0.4;
var diffuseIntensity = 0.9;
var specularIntensity = 0.8;

var constantAttenuation = 0.01;
var linearAttenuation = 0.01;
var quadraticAttenuation = 0.02;

window.onload = function init() {
  initGlProgram();

  modelViewMatrixLoc = gl.getUniformLocation(program, "modelViewMatrix");
  normalMatrixLoc = gl.getUniformLocation(program, "normalMatrix");

  baseColor = gl.getUniformLocation(program, "baseColor");

  initShapes();

  currentObject.shapeName = "sphere";
  currentObject.shape = shapes[currentObject.shapeName];
  currentObject.surfaceColor = vec4(0.0, 1.0, 0.0, 1.0);
  currentObject.ambientColor = ambientColor;
  currentObject.diffuseColor = diffuseColor;
  currentObject.specularColor = specularColor;
  currentObject.materialShininess = materialShininess;
  currentObject.rotateX = 45;
  currentObject.rotateY = 45;
  currentObject.rotateZ = 45;

  initEventListeners();
  createAxes();
  initLights();

  addObject();
  changeShape("sphere");
  addObject();
  changeShape("cone");
  addObject();
  changeShape("cylinder");
  render();
};

function render() {
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  if (camera.animated) {
    camera.angle = (parseFloat(camera.angle) + 0.05) % 360;
    $("#cameraAngleY").val(camera.angle);
  }
  changeCameraY();
  moveLights();

  gl.uniform1f(gl.getUniformLocation(program, "constantAttenuation"), constantAttenuation);
  gl.uniform1f(gl.getUniformLocation(program, "linearAttenuation"), linearAttenuation);
  gl.uniform1f(gl.getUniformLocation(program, "quadraticAttenuation"), quadraticAttenuation);

  for (var i = 0; i < fixedObjects.length; i++) {
    renderObject(fixedObjects[i]);
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
          getScaleMatrix(object.scaleX, object.scaleY, object.scaleZ)));
  modelViewMatrix = mult(lookAt(eye, at, up), modelViewMatrix);
  gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(modelViewMatrix));
  gl.uniformMatrix3fv(normalMatrixLoc, false, flatten(normalMatrix(modelViewMatrix, true)));

  var projection = perspective(45, canvas.clientWidth / canvas.clientHeight, 1, 20);
  gl.uniformMatrix4fv(gl.getUniformLocation(program, "projectionMatrix"), false, flatten(projection));
  gl.uniform1f(gl.getUniformLocation(program, "materialShininess"), object.materialShininess);
  gl.uniform4fv(gl.getUniformLocation(program, "ambientColor"), flatten(object.ambientColor));
  gl.uniform4fv(gl.getUniformLocation(program, "diffuseColor"), flatten(object.diffuseColor));
  gl.uniform4fv(gl.getUniformLocation(program, "specularColor"), flatten(object.specularColor));
  gl.uniform1f(gl.getUniformLocation(program, "ambientIntensity"), ambientIntensity);
  gl.uniform1f(gl.getUniformLocation(program, "diffuseIntensity"), object.diffuseIntensity);
  gl.uniform1f(gl.getUniformLocation(program, "specularIntensity"), object.specularIntensity);

  var shape = object.shape;

  for (var j = 0; j < shape.buffers.length; j++) {

    // Set current buffer
    if (shape.normals) {
      var normalInfo = shape.normals[j];
      gl.bindBuffer(gl.ARRAY_BUFFER, normalInfo.buffer);
      var vNormal = gl.getAttribLocation(program, "vNormal");
      gl.vertexAttribPointer(vNormal, 3, gl.FLOAT, false, 0, 0);
      gl.enableVertexAttribArray(vNormal);
    }

    var bufferInfo = shape.buffers[j];
    gl.bindBuffer(gl.ARRAY_BUFFER, bufferInfo.buffer);
    var vPosition = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    // Set color
    if (bufferInfo.fillmode == OUTLINE) {
      gl.uniform4fv(baseColor, flatten(object.lineColor));
    } else if (bufferInfo.fillmode == SURFACE) {
      gl.uniform4fv(baseColor, flatten(object.surfaceColor));
    }

    // Draw current buffer in given color
    gl.drawArrays(bufferInfo.drawmode, 0, bufferInfo.numVertices);
  }
}

function createAxis(a, b, color) {
  return {
    shape: createLine(gl, a, b),
    x: 0, y: 0, z: 0,
    rotateX: 0, rotateY: 0, rotateZ: 0,
    scaleX: 1.0, scaleY: 1.0, scaleZ: 1.0,
    surfaceColor: color,
    ambientColor: ambientColor,
    diffuseColor: color,
    specularColor: specularColor,
    materialShininess: 10,
    ambientIntensity: ambientIntensity,
    diffuseIntensity: diffuseIntensity,
    specularIntensity: specularIntensity
  };
}

function createArrow(a, r, color) {
  return {
    shape: shapes["cone"],
    x: a[0], y: a[1], z: a[2],
    rotateX: r[0], rotateY: r[1], rotateZ: r[2],
    scaleX: 0.06, scaleY: 0.06, scaleZ: 0.06,
    surfaceColor: color,
    ambientColor: ambientColor,
    diffuseColor: color,
    specularColor: specularColor,
    materialShininess: 10,
    ambientIntensity: ambientIntensity,
    diffuseIntensity: diffuseIntensity,
    specularIntensity: specularIntensity
  };
}

function initLights() {
  for (var i = 0; i < 4; i++) {
    var light = {};
    light.diffuse = vec4(1.0, 1.0, 1.0, 1.0);
    light.specular = vec4(1.0, 1.0, 1.0, 1.0);
    light.animate = false;
    light.theta = random(0, 360);
    light.phi = random(0, 360);
    light.radius = random(10, 20);
    light.position = vec4(0, 0, 0, 0);
    light.speed = 1;
    calculateLightPosition(light);

    lights.push(light);
  }
  lights[0].position[3] = 1;
  lights[0].animate = true;
  lights[1].position[3] = 1;
  lights[1].animate = true;

  currentLight = lights[0];
  updateLightUI(currentLight);
}

function calculateLightPosition(currentLight) {
  var cosTheta = Math.cos(radians(currentLight.theta));
  var sinTheta = Math.sin(radians(currentLight.theta));
  var cosPhi = Math.cos(radians(currentLight.phi));
  var sinPhi = Math.sin(radians(currentLight.phi));
  var radius = parseFloat(currentLight.radius);
  currentLight.position[0] = radius * cosTheta * sinPhi;
  currentLight.position[1] = radius * sinTheta * sinPhi;
  currentLight.position[2] = radius * cosPhi;
}

function moveLights() {
  for (var i = 0; i < lights.length; i++) {
    var light = lights[i];
    if (light.animate) {
      var speed = parseFloat(light.speed);
      var theta = parseFloat(light.theta);
      var phi = parseFloat(light.phi);
      light.phi = (phi + 360 + speed) % 360;
      if (random(0, 100) < 5) {
        light.theta = (theta + 360 + speed) % 360;
      }
    }
    calculateLightPosition(light);
  }

  var lightPositions = [];
  for (var i = 0; i < lights.length; i++) {
    lightPositions.push(lights[i].position);
  }

  gl.uniform4fv(gl.getUniformLocation(program, "lightPosition"), flatten(lightPositions));

  updateLightUI(currentLight);
}


function initShapes() {
  var sphere = createSphere(gl);
  var cylinder = createCylinder(gl);
  var cone = createCone(gl);
  var cube = createCube(gl);
  shapes = {
    "sphere": sphere,
    "cylinder": cylinder,
    "cone": cone,
    "cube": cube
  };
  shapeNames = [ "sphere", "cylinder", "cone", "cube"];
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

function coord(event) {
  var rect = canvas.getBoundingClientRect();
  return vec2(2 * (event.clientX - rect.left) / canvas.width - 1,
      2 * (canvas.height - (event.clientY - rect.top)) / canvas.height - 1);
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
  // gl.enable(gl.CULL_FACE);
  gl.polygonOffset(0.2, 0);

  program = initShaders(gl, "vertex-shader", "fragment-shader");
  gl.useProgram(program);
}

function initEventListeners() {
  $("#constantAttenuation").val(constantAttenuation);
  $("#linearAttenuation").val(linearAttenuation);
  $("#quadraticAttenuation").val(quadraticAttenuation);
  $("#ambientIntensity").val(ambientIntensity);
  $("#diffuseIntensity").val(diffuseIntensity);
  $("#specularIntensity").val(specularIntensity);
  $("#scale").val(0);
  $("#translate-x").val(0);
  $("#translate-y").val(0);
  $("#translate-z").val(0);
  $("#rotate-x").val(45);
  $("#rotate-y").val(45);
  $("#rotate-z").val(45);
  $("#materialShininess").val(materialShininess);

  addColorPicker("surfaceColor", "surfaceColor");
  addColorPicker("ambientColor", "ambientColor");
  addColorPicker("diffuseColor", "diffuseColor");
  addColorPicker("specularColor", "specularColor");

  $("#shape").change(function() {
    var shape = $(this).val();
    changeShape(shape);
  });

  $("#scale").on("input", function() { changeScale($(this).val()) });
  $("#scale").on("change", function() { changeScale($(this).val()) });

  $("#materialShininess").on("input", function() { currentObject.materialShininess = $(this).val(); });
  $("#materialShininess").on("change", function() { currentObject.materialShininess = $(this).val(); });

  $("#translate-x").on("input", function() { changeTranslation($(this).val(), "x") });
  $("#translate-y").on("input", function() { changeTranslation($(this).val(), "y") });
  $("#translate-z").on("input", function() { changeTranslation($(this).val(), "z") });
  $("#translate-x").on("change", function() { changeTranslation($(this).val(), "x") });
  $("#translate-y").on("change", function() { changeTranslation($(this).val(), "y") });
  $("#translate-z").on("change", function() { changeTranslation($(this).val(), "z") });

  $("#rotate-x").on("input", function() { changeRotation($(this).val(), "X") });
  $("#rotate-y").on("input", function() { changeRotation($(this).val(), "Y") });
  $("#rotate-z").on("input", function() { changeRotation($(this).val(), "Z") });
  $("#rotate-x").on("change", function() { changeRotation($(this).val(), "X") });
  $("#rotate-y").on("change", function() { changeRotation($(this).val(), "Y") });
  $("#rotate-z").on("change", function() { changeRotation($(this).val(), "Z") });

  $("#cameraAngleY").on("input", function() { camera.angle = $(this).val() });
  $("#cameraAngleY").on("change", function() { camera.angle = $(this).val() });
  $("#cameraAnimated").click(function() { camera.animated = this.checked; });

  $("#constantAttenuation").on("input", function() { constantAttenuation = $(this).val(); });
  $("#constantAttenuation").on("change", function() { constantAttenuation = $(this).val(); });
  $("#linearAttenuation").on("input", function() { linearAttenuation = $(this).val(); });
  $("#linearAttenuation").on("change", function() { linearAttenuation = $(this).val(); });
  $("#quadraticAttenuation").on("input", function() { quadraticAttenuation = $(this).val(); });
  $("#quadraticAttenuation").on("change", function() { quadraticAttenuation = $(this).val(); });
  $("#ambientIntensity").on("input", function() { ambientIntensity = $(this).val(); });
  $("#ambientIntensity").on("change", function() { ambientIntensity = $(this).val(); });
  $("#diffuseIntensity").on("input", function() { currentObject.diffuseIntensity = $(this).val(); });
  $("#diffuseIntensity").on("change", function() { currentObject.diffuseIntensity = $(this).val(); });
  $("#specularIntensity").on("input", function() { currentObject.specularIntensity = $(this).val(); });
  $("#specularIntensity").on("change", function() { currentObject.specularIntensity = $(this).val(); });

  $("#currentLight").change(function() {
    currentLight = lights[$(this).val()];
    updateLightUI(currentLight);
  });

  $("#lightOnOff").click(function() {
    if (this.checked) currentLight.position[3] = 1;
    else currentLight.position[3] = 0;
  });

  $("#lightAnimated").click(function() {
    currentLight.animate = this.checked;
  });

  $("#lightSpeed").on("input", function() { currentLight.speed = $(this).val(); });
  $("#lightSpeed").on("change", function() { currentLight.speed = $(this).val(); });

  $("#lightTheta").on("input", function() { currentLight.theta = $(this).val(); });
  $("#lightTheta").on("change", function() { currentLight.theta = $(this).val(); });
  $("#lightPhi").on("input", function() { currentLight.phi = $(this).val(); });
  $("#lightPhi").on("change", function() { currentLight.phi = $(this).val(); });
  $("#lightRadius").on("input", function() { currentLight.radius = $(this).val(); });
  $("#lightRadius").on("change", function() { currentLight.radius = $(this).val(); });

  $("#gl-canvas").mousedown(function(event) {
    mouseDown = true;
    if(!event.ctrlKey) {
      moveObject(event);
    }
  });
  $("#gl-canvas").mouseup(function() { mouseDown=false; });
  $("#gl-canvas").mousemove(function(event) {
    if (mouseDown) {
      if (!event.ctrlKey) {
        moveObject(event);
      } else {
        rotateObject(event);
      }
    }
  });

  $("#add-object").click(addObject);

  $("#remove-object").click(function() {
    if (currentObject != null) {
      var currentObjectIndex = findObjectIndex(currentObject.id);
      objects.splice(currentObjectIndex, 1);
      $("#current-object option:selected").remove();
      if (objects.length > 0) {
        $("#current-object").val(objects[objects.length - 1].id).change();
      }
    }
  });

  $("#current-object").change(function() {
    currentObject = objects[findObjectIndex($(this).val())];
    $("#shape").val(currentObject.shapeName);
    $("#rotate-x").val(currentObject.rotateX);
    $("#rotate-y").val(currentObject.rotateY);
    $("#rotate-z").val(currentObject.rotateZ);
    $("#scale").val(currentObject.scaleX);
    $("#materialShininess").val(currentObject.materialShininess);
    $("#surfaceColor").spectrum("set", toColorPicker(currentObject.surfaceColor));
    $("#ambientColor").spectrum("set", toColorPicker(currentObject.ambientColor));
    $("#diffuseColor").spectrum("set", toColorPicker(currentObject.diffuseColor));
    $("#specularColor").spectrum("set", toColorPicker(currentObject.specularColor));

    // Animate the selected object.
    animateSelectedObject(currentObject);
  });

}

function updateLightUI(currentLight) {
  $("#lightTheta").val(currentLight.theta);
  $("#lightPhi").val(currentLight.phi);
  $("#lightRadius").val(currentLight.radius);
  $("#lightOnOff").prop('checked', currentLight.position[3] == 1);
  $("#lightAnimated").prop('checked', currentLight.animate);
  $("#lightSpeed").val(currentLight.speed);

}

function changeShape(shape) {
  currentObject.shapeName = shape;
  currentObject.shape = shapes[currentObject.shapeName];
  $("#current-object option:selected").text(objectName());
  $("#shape").val(currentObject.shapeName);
}

function addObject() {
  var nextScale = random(0.05, 0.6);
  var shapeName = shapeNames[Math.floor(random(0, 4))];

  currentObject = {
    shapeName: shapeName,
    shape: shapes[shapeName],
    x: random(-1.8, 1.8),
    y: random(-1.8, 1.8),
    z: random(-1.8, 1.8),
    rotateX: random(0, 360),
    rotateY: random(0, 360),
    rotateZ: random(0, 360),
    scaleX: nextScale,
    scaleY: nextScale,
    scaleZ: nextScale,
    surfaceColor: vec4(random(0, 1), random(0, 1), random(0, 1), 1.0),
    ambientColor: ambientColor,
    diffuseColor: vec4(random(0, 1), random(0, 1), random(0, 1), 1.0),
    specularColor: vec4(random(0, 1), random(0, 1), random(0, 1), 1.0),
    materialShininess: random(1, 50),
    ambientIntensity: random(0.05, 0.3),
    diffuseIntensity: random(0.05, 0.8),
    specularIntensity: random(0, 2)
  };

  $("#shape").val(currentObject.shapeName);
  $("#translate-x").val(currentObject.x);
  $("#translate-y").val(currentObject.y);
  $("#translate-z").val(currentObject.z);
  $("#rotate-x").val(currentObject.rotateX);
  $("#rotate-y").val(currentObject.rotateY);
  $("#rotate-z").val(currentObject.rotateZ);
  $("#scale").val(currentObject.scaleX);
  $("#materialShininess").val(currentObject.materialShininess);
  $("#surfaceColor").spectrum("set", toColorPicker(currentObject.surfaceColor));
  $("#ambientColor").spectrum("set", toColorPicker(currentObject.ambientColor));
  $("#diffuseColor").spectrum("set", toColorPicker(currentObject.diffuseColor));
  $("#specularColor").spectrum("set", toColorPicker(currentObject.specularColor));

  numObjectsCreated++;
  currentObject.id = numObjectsCreated;

  objects.push(currentObject);
  $("#current-object").append($("<option></option>")
      .attr("value", currentObject.id)
      .text(objectName()));
  $("#current-object").val(currentObject.id);
}

function addColorPicker(elementId, objectProperty) {
  $("#" + elementId).spectrum({
    color: toColorPicker(currentObject[objectProperty]),
    showPalette: true,
    palette: getPalette(),
    change: function(color) {
      var rgb = color.toRgb();
      currentObject[objectProperty] = vec4(rgb.r / 255, rgb.g / 255, rgb.b / 255, rgb.a);
    }
  });
}

function changeScale(scale, axis) {
  if (axis) {
    currentObject["scale" + axis] = scale;
  } else {
    currentObject.scaleX = scale;
    currentObject.scaleY = scale;
    currentObject.scaleZ = scale;
  }
}

function changeTranslation(val, axis) {
  currentObject[axis] = val;
}

function changeCameraY() {
  var r = parseFloat(camera.radius);
  var angle = parseFloat(camera.angle);
  var y = eye[1];
  var sin = Math.sin(radians(angle));
  var cos = Math.cos(radians(angle));
  var h = Math.sqrt((r * r - y * y));
  eye[0] = h * cos;
  eye[1] = y;
  eye[2] = h * sin;
  if (eye[0] == 0 && eye[2] == 0) {
    // To prevent division by zero
    eye[0] = 0.0001;
  }
}

function changeRotation(val, axis) {
  currentObject["rotate" + axis] = val;
}

function createAxes() {
  var xAxis = createAxis(vec4(-2, 0, 0, 1.0), vec4(2, 0, 0, 1.0), vec4(1.0, 0, 0, 1.0));
  var yAxis = createAxis(vec4(0, -2, 0, 1.0), vec4(0, 2, 0, 1.0), vec4(0, 1.0, 0, 1.0));
  var zAxis = createAxis(vec4(0, 0, -2, 1.0), vec4(0, 0, 2, 1.0), vec4(0, 0, 1.0, 1.0));
  fixedObjects.push(xAxis, yAxis, zAxis);
  fixedObjects.push(createArrow([2, 0, 0], [0, 90, 0], vec4(1.0, 0, 0, 1.0)));
  fixedObjects.push(createArrow([0, 2, 0], [270, 0, 0], vec4(0, 1.0, 0, 1.0)));
  fixedObjects.push(createArrow([0, 0, 2], [180, 0, 0], vec4(0, 0, 1.0, 1.0)));
}

function findObjectIndex(id) {
  for (var i = 0; i < objects.length; i++) {
    if (objects[i].id == id) {
      return i;
    }
  }
  return -1;
}

function objectName() {
  return "object " + currentObject.id + ": " + currentObject.shapeName;
}

function animateSelectedObject(object) {
  var property = "diffuseColor";
  var originalColor = object[property];
  var white = vec4(1, 1, 1, 1);
  var counter = 0;
  var animation = window.setInterval(function() {
    counter++;
    if (counter % 2 == 0) {
      object[property] = originalColor;
    } else {
      object[property] = white;
    }
  }, 100);
  window.setTimeout(function() {
    window.clearInterval(animation);
    object[property] = originalColor;
  }, 1500);

}

function toColorPicker(v) {
  return tinycolor.fromRatio({ r: v[0], g: v[1], b: v[2] });
}

function moveObject(mouseEvent) {
  var c = coord(mouseEvent);
  currentObject.x = c[0];
  currentObject.y = c[1];
  $("#translate-x").val(currentObject.x);
  $("#translate-y").val(currentObject.y);
  $("#translate-z").val(currentObject.z);
}

function rotateObject(mouseEvent) {
  var c = coord(mouseEvent);
  currentObject.rotateX = 360 * (c[1] + 1) / 2;
  currentObject.rotateY = 360 * (c[0] + 1) / 2;
  $("#rotate-x").val(currentObject.rotateX);
  $("#rotate-y").val(currentObject.rotateY);
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

