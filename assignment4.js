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
var camera = {};
camera.radius = 6;
camera.angle = 45;
camera.animated = true;
var eye = [4.158247202848457, 2.375470056608669, 3.6147091459975838];
var up = [0, 1, 0];

var lights = [];
var currentLight = {};

var lightAmbient = vec4(0.4, 0.4, 0.4, 1.0 );
var lightDiffuse = vec4( 1.0, 1.0, 1.0, 1.0 );
var lightSpecular = vec4( 1.0, 1.0, 1.0, 1.0 );

var materialAmbient = vec4( 1.0, 1.0, 1.0, 1.0 );
var materialDiffuse = vec4( 0.8, 0.8, 0.8, 1.0);
var materialSpecular = vec4( 1.0, 1.0, 1.0, 1.0 );
var materialShininess = 50.0;

var ambientIntensity = 0.6
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
  currentObject.materialAmbient = materialAmbient;
  currentObject.materialDiffuse = materialDiffuse;
  currentObject.materialSpecular = materialSpecular;
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
    camera.angle += 0.05;
    camera.angle %= 360;
    $("#cameraAngleY").val(camera.angle);
  }
  changeCameraY();
  moveLights();

  gl.uniform1f(gl.getUniformLocation(program, "constantAttenuation"), constantAttenuation);
  gl.uniform1f(gl.getUniformLocation(program, "linearAttenuation"), linearAttenuation);
  gl.uniform1f(gl.getUniformLocation(program, "quadraticAttenuation"), quadraticAttenuation);
  gl.uniform1f(gl.getUniformLocation(program, "ambientIntensity"), ambientIntensity);

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
  gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(modelViewMatrix));
  gl.uniformMatrix3fv(normalMatrixLoc, false, flatten(normalMatrix(modelViewMatrix, true)));

  var at = [0, 0, 0];
  var projection = mult(perspective(20, canvas.clientWidth / canvas.clientHeight, 1, 20), lookAt(eye, at, up));
  //var o = 1;
  //var projection = ortho(-o, o, -o, o, -2, 2);
  gl.uniformMatrix4fv(gl.getUniformLocation(program, "projectionMatrix"), false, flatten(projection));

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

    var ambientProduct = mult(lightAmbient, object.materialAmbient);
    var diffuseProduct = mult(lightDiffuse, object.materialDiffuse);
    var specularProduct = mult(lightSpecular, object.materialSpecular);
    gl.uniform1f(gl.getUniformLocation(program, "materialShininess"), object.materialShininess);
    gl.uniform4fv(gl.getUniformLocation(program, "ambientProduct"), flatten(ambientProduct));
    gl.uniform4fv(gl.getUniformLocation(program, "diffuseProduct"), flatten(diffuseProduct));
    gl.uniform4fv(gl.getUniformLocation(program, "specularProduct"), flatten(specularProduct));

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
    lineColor: color,
    materialAmbient: color,
    materialDiffuse: color,
    materialSpecular: materialSpecular,
    materialShininess: 128
  };
}

function createArrow(a, r, color) {
  return {
    shape: shapes["cone"],
    x: a[0], y: a[1], z: a[2],
    rotateX: r[0], rotateY: r[1], rotateZ: r[2],
    scaleX: 0.03, scaleY: 0.03, scaleZ: 0.03,
    surfaceColor: color,
    materialAmbient: color,
    materialDiffuse: color,
    materialSpecular: materialSpecular,
    materialShininess: 40
  };
}

function initLights() {
  for (var i = 0; i < 4; i++) {
    var light = {};
    light.position = vec4(random(0, 3), random(0, 3), random(0, 3), 0);
    light.angle = [0, 0, 0];
    light.diffuse = vec4(1.0, 1.0, 1.0, 1.0);
    light.specular = vec4(1.0, 1.0, 1.0, 1.0);
    light.animate = false;
    light.lightBulb = {
      shape: shapes["sphere"],
      x: light.position[0], y: light.position[1], z: light.position[2],
      rotateX: 0, rotateY: 0, rotateZ: 0,
      scaleX: 0.03, scaleY: 0.03, scaleZ: 0.03,
      surfaceColor: vec4(1, 1, 1, 1),
      materialAmbient: materialAmbient,
      materialDiffuse: materialDiffuse,
      materialSpecular: materialSpecular,
      materialShininess: 128
    };

    lights.push(light);
  }
  lights[0].position[3] = 1;
  lights[0].angle = [45, 90, 270];
  lights[0].animate = true;

  lights[1].position[3] = 1;
  lights[1].angle = [180, 180, 0];
  lights[1].animate = true;

  currentLight = lights[0];
  changeCurrentLight();
}

function moveLights() {
  for (var i = 0; i < lights.length; i++) {
    if (!lights[i].animate) {
      continue;
    }
    for (var j = 0; j < 3; j++) {
      lights[i].angle[j] += random(0, 1);
      lights[i].position[j] = 10 * Math.sin(radians(lights[i].angle[j]));
    }
  }

  var lightPositions = [];
  for (var i = 0; i < lights.length; i++) {
    lightPositions.push(lights[i].position);
  }

  $("#lightX").val(currentLight.position[0]);
  $("#lightY").val(currentLight.position[1]);
  $("#lightZ").val(currentLight.position[2]);

  gl.uniform4fv(gl.getUniformLocation(program, "lightPosition"), flatten(lightPositions));
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
  $("#scale").val(0);
  $("#translate-x").val(0);
  $("#translate-y").val(0);
  $("#translate-z").val(0);
  $("#rotate-x").val(45);
  $("#rotate-y").val(45);
  $("#rotate-z").val(45);
  $("#materialShininess").val(materialShininess);

  addColorPicker("surfaceColor", "surfaceColor");
  addColorPicker("materialAmbient", "materialAmbient");
  addColorPicker("materialDiffuse", "materialDiffuse");
  addColorPicker("materialSpecular", "materialSpecular");

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

  $("#currentLight").change(function() {
    currentLight = lights[$(this).val()];
    changeCurrentLight();
  });

  $("#lightOnOff").click(function() {
    if (this.checked) currentLight.position[3] = 1;
    else currentLight.position[3] = 0;
  });

  $("#lightAnimated").click(function() { currentLight.animate = this.checked; });

  $("#lightX").on("input", function() { currentLight.position[0] = $(this).val(); });
  $("#lightX").on("change", function() { currentLight.position[0] = $(this).val(); });
  $("#lightY").on("input", function() { currentLight.position[1] = $(this).val(); });
  $("#lightY").on("change", function() { currentLight.position[1] = $(this).val(); });
  $("#lightZ").on("input", function() { currentLight.position[2] = $(this).val(); });
  $("#lightZ").on("change", function() { currentLight.position[2] = $(this).val(); });

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
    $("#materialAmbient").spectrum("set", toColorPicker(currentObject.materialAmbient));
    $("#materialDiffuse").spectrum("set", toColorPicker(currentObject.materialDiffuse));
    $("#materialSpecular").spectrum("set", toColorPicker(currentObject.materialSpecular));

    // Animate the selected object.
    animateSelectedObject(currentObject);
  });

}

function changeCurrentLight() {
  $("#lightX").val(currentLight.position[0]);
  $("#lightY").val(currentLight.position[1]);
  $("#lightZ").val(currentLight.position[2]);
  $("#lightOnOff").prop('checked', currentLight.position[3] == 1);
  $("#lightAnimated").prop('checked', currentLight.animate);
}

function changeShape(shape) {
  currentObject.shapeName = shape;
  currentObject.shape = shapes[currentObject.shapeName];
  $("#current-object option:selected").text(objectName());
}

function addObject() {
  var prev = currentObject;
  var nextScale = random(0.01, 0.3);

  currentObject = {
    shapeName: prev.shapeName,
    shape: shapes[prev.shapeName],
    x: random(-0.8, 0.8),
    y: random(-0.8, 0.8),
    z: random(-0.8, 0.8),
    rotateX: random(0, 360),
    rotateY: random(0, 360),
    rotateZ: random(0, 360),
    scaleX: nextScale,
    scaleY: nextScale,
    scaleZ: nextScale,
    surfaceColor: vec4(random(0, 1), random(0, 1), random(0, 1), 1.0),
    materialAmbient: vec4(random(0, 1), random(0, 1), random(0, 1), 1.0),
    materialDiffuse: materialDiffuse,
    materialSpecular: materialSpecular,
    materialShininess: random(0, 128)
  };

  $("#translate-x").val(currentObject.x);
  $("#translate-y").val(currentObject.y);
  $("#translate-z").val(currentObject.z);
  $("#rotate-x").val(currentObject.rotateX);
  $("#rotate-y").val(currentObject.rotateY);
  $("#rotate-z").val(currentObject.rotateZ);
  $("#scale").val(currentObject.scaleX);
  $("#materialShininess").val(currentObject.materialShininess);
  $("#surfaceColor").spectrum("set", toColorPicker(currentObject.surfaceColor));
  $("#materialAmbient").spectrum("set", toColorPicker(currentObject.materialAmbient));
  $("#materialDiffuse").spectrum("set", toColorPicker(currentObject.materialDiffuse));
  $("#materialSpecular").spectrum("set", toColorPicker(currentObject.materialSpecular));

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
  var r = camera.radius;
  var y = eye[1];
  var sin = Math.sin(radians(camera.angle));
  var cos = Math.cos(radians(camera.angle));
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
  var xAxis = createAxis(vec4(-1, 0, 0, 1.0), vec4(1, 0, 0, 1.0), vec4(1.0, 0, 0, 1.0));
  var yAxis = createAxis(vec4(0, -1, 0, 1.0), vec4(0, 1, 0, 1.0), vec4(0, 1.0, 0, 1.0));
  var zAxis = createAxis(vec4(0, 0, -1, 1.0), vec4(0, 0, 1, 1.0), vec4(0, 0, 1.0, 1.0));
  fixedObjects.push(xAxis, yAxis, zAxis);
  fixedObjects.push(createArrow([1, 0, 0], [0, 90, 0], vec4(1.0, 0, 0, 1.0)));
  fixedObjects.push(createArrow([0, 1, 0], [270, 0, 0], vec4(0, 1.0, 0, 1.0)));
  fixedObjects.push(createArrow([0, 0, 1], [180, 0, 0], vec4(0, 0, 1.0, 1.0)));
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
  var property = "materialAmbient";
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

