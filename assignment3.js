"use strict";

var canvas;
var gl;
var program;

var fColor;
var animate = true;

var SURFACE = 1;
var OUTLINE = 2;

var fixedObjects = [];
var objects = [];

var modelViewMatrixLoc;

var shapes = {};
var currentScale = 0.2;
var currentShape = "sphere";
var currentObject = {};
var surfaceColor = vec4(0.1, 0.6, 0.0, 1.0);
var lineColor = vec4(0.0, 1.0, 0.0, 1.0);
var currentRotateX = 45;
var currentRotateY = 45;
var currentRotateZ = 45;
var currentPosition = [0, 0, 0];
var currentRotation = [45, 45, 45];
var cameraAngleX = 0;
var cameraAngleY = 45;
var cameraAngleZ = 0;
var cameraRadius = 6;
var eye = [4.158247202848457, 2.375470056608669, 3.6147091459975838];
var up = [0, 1, 0];

window.onload = function init() {
  initGlProgram();

  fColor = gl.getUniformLocation(program, "fColor");
  modelViewMatrixLoc = gl.getUniformLocation( program, "modelViewMatrix" );

  initShapes();
  initEventListeners();

  var xAxis = createAxis(vec4(-1, 0, 0, 1.0), vec4(1, 0, 0, 1.0), vec4(1.0, 0, 0, 1.0));
  var yAxis = createAxis(vec4(0, -1, 0, 1.0), vec4(0, 1, 0, 1.0), vec4(0, 1.0, 0, 1.0));
  var zAxis = createAxis(vec4(0, 0, -1, 1.0), vec4(0, 0, 1, 1.0), vec4(0, 0, 1.0, 1.0));
  fixedObjects.push(xAxis, yAxis, zAxis);
  fixedObjects.push(createArrow([1, 0, 0], [0, 90, 0], vec4(1.0, 0, 0, 1.0)));
  fixedObjects.push(createArrow([0, 1, 0], [270, 0, 0], vec4(0, 1.0, 0, 1.0)));
  fixedObjects.push(createArrow([0, 0, 1], [180, 0, 0], vec4(0, 0, 1.0, 1.0)));
  render();
}

function createAxis(a, b, color) {
  return {
    shape: createLine(gl, a, b),
    x: 0, y: 0, z: 0,
    rotateX: 0, rotateY: 0, rotateZ: 0,
    scaleX: 1.0, scaleY: 1.0, scaleZ: 1.0,
    lineColor: color,
    surfaceColor: color
  };
}

function createArrow(a, r, color) {
  return {
    shape: shapes["cone"],
    x: a[0], y: a[1], z: a[2],
    rotateX: r[0], rotateY: r[1], rotateZ: r[2],
    scaleX: 0.03, scaleY: 0.03, scaleZ: 0.03,
    lineColor: color,
    surfaceColor: color
  };
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

function initEventListeners() {
  $("#translate-x").val(currentPosition[0]);
  $("#translate-y").val(currentPosition[1]);
  $("#translate-z").val(currentPosition[2]);
  $("#scale").val(currentScale);
  $("#rotate-x").val(currentRotation[0]);
  $("#rotate-y").val(currentRotation[1]);
  $("#rotate-z").val(currentRotation[2]);
  $("#camera-angle-x").val(cameraAngleX);
  $("#camera-angle-y").val(cameraAngleY);
  $("#camera-angle-z").val(cameraAngleZ);

  $("#surface-color").spectrum({
    color: toColorPicker(surfaceColor),
    showPalette: true,
    palette: getPalette(),
    change: function(color) {
      var rgb = color.toRgb();
      surfaceColor = vec4(rgb.r / 255, rgb.g / 255, rgb.b / 255, rgb.a)
      currentObject.surfaceColor = surfaceColor;
    }
  });
  $("#line-color").spectrum({
    color: toColorPicker(lineColor),
    showPalette: true,
    palette: getPalette(),
    change: function(color) {
      var rgb = color.toRgb();
      lineColor = vec4(rgb.r / 255, rgb.g / 255, rgb.b / 255, rgb.a);
      currentObject.lineColor = lineColor;
    }
  });
  $("#shape").change(function() {
    currentShape = $(this).val();
    currentObject.shape = shapes[currentShape];
    currentObject.shapeName = currentShape;
    $("#current-object option:selected").text(objectName(currentObject));
  });
  $("#add-object").click(function() {
    for (var i = 0; i < 3; i++) {
      currentPosition[i] = random(-0.8, 0.8);
    }
    currentScale = random(0.01, 0.4);
    $("#translate-x").val(currentPosition[0]);
    $("#translate-y").val(currentPosition[1]);
    $("#translate-z").val(currentPosition[2]);
    $("#scale").val(currentScale);

    currentObject = {
      shapeName: currentShape,
      shape: shapes[currentShape],
      x: currentPosition[0],
      y: currentPosition[1],
      z: currentPosition[2],
      rotateX: currentRotateX,
      rotateY: currentRotateY,
      rotateZ: currentRotateZ,
      scaleX: currentScale,
      scaleY: currentScale,
      scaleZ: currentScale,
      lineColor: lineColor,
      surfaceColor: surfaceColor
    };
    objects.push(currentObject);
    currentObject.id = objects.length;
    $("#current-object").append($("<option></option>")
        .attr("value", objects.length - 1)
        .text(objectName(currentObject)));
    $("#current-object").val(objects.length - 1);
  });
  $("#scale").on("input", function() {
    currentScale = $(this).val();
    currentObject.scaleX = currentScale;
    currentObject.scaleY = currentScale;
    currentObject.scaleZ = currentScale;
  });
  $("#translate-x").on("input", function() {
    var x = $(this).val();
    currentPosition[2] = x;
    currentObject.x = x;
  });
  $("#translate-y").on("input", function() {
    var y = $(this).val();
    currentPosition[2] = y;
    currentObject.y = y;
  });
  $("#translate-z").on("input", function() {
    var z = $(this).val();
    currentPosition[2] = z;
    currentObject.z = z;
  });
  $("#camera-angle-x").on("input", function() {
    var angle = radians($(this).val());
    up[1] = Math.cos(angle);
    up[2] = Math.sin(angle);
  });

  $("#camera-angle-y").on("input", function() {
    cameraAngleY = $(this).val();
    var r = cameraRadius;
    var x = eye[0];
    var y = eye[1];
    var z = eye[2];
    var sin = Math.sin(radians(cameraAngleY));
    var cos = Math.cos(radians(cameraAngleY));
    var h = Math.sqrt((r * r - y * y));
    eye[0] = h * cos;
    eye[1] = y;
    eye[2] = h * sin;
    if (eye[0] == 0 && eye[2] == 0) {
      eye[0] = 0.0001;
    }
  });
  $("#rotate-x").on("input", function() {
    currentObject.rotateX = $(this).val();
  });
  $("#rotate-y").on("input", function() {
    currentObject.rotateY = $(this).val();
  });
  $("#rotate-z").on("input", function() {
    currentObject.rotateZ = $(this).val();
  });
  $("#gl-canvas").mousedown(function(event) {
    if(!event.ctrlKey) {
      moveObject(event);
    }
  });
  $("#gl-canvas").mousemove(function(event) {
    if (event.which == 1 || event.buttons == 1) {
      if (!event.ctrlKey) {
        moveObject(event);
      } else {
        rotateObject(event);
      }
    }
  });

  $("#current-object").change(function() {
    var objectIndex = $(this).val();
    currentObject = objects[objectIndex];
    $("#shape").val(currentObject.shapeName);
    $("#rotate-x").val(currentObject.rotateX);
    $("#rotate-y").val(currentObject.rotateY);
    $("#rotate-z").val(currentObject.rotateZ);
    $("#scale").val(currentObject.scaleX);
    $("#z-depth").val(currentObject.z);
    $("#surface-color").spectrum("set", toColorPicker(currentObject.surfaceColor));
    $("#line-color").spectrum("set", toColorPicker(currentObject.lineColor));

    // Animate the selected object.
    animateSelectedObject(currentObject);
  });

}

function objectName(object) {
  return "object " + currentObject.id + ": " + currentObject.shapeName;
}

function animateSelectedObject(object) {
  var originalColor = object.lineColor;
  var white = vec4(1, 1, 1, 1)
  var counter = 0;
  var animation = window.setInterval(function() {
    counter++;
    if (counter % 2 == 0) {
      object.lineColor = originalColor;
    } else {
      object.lineColor = white;
    }
  }, 100);
  window.setTimeout(function() {
    window.clearInterval(animation);
    object.lineColor = originalColor;
  }, 1500);

}

function toColorPicker(v) {
  var color = tinycolor.fromRatio({ r: v[0], g: v[1], b: v[2] });
  return color;
}

function moveObject(mouseEvent) {
  var c = coord(mouseEvent);
  currentPosition[0] = c[0];
  currentPosition[1] = c[1];
  currentObject.x = c[0];
  currentObject.y = c[1];
  $("#translate-x").val(currentPosition[0]);
  $("#translate-y").val(currentPosition[1]);
  $("#translate-z").val(currentPosition[2]);
}

function rotateObject(mouseEvent) {
  var c = coord(mouseEvent);
  currentRotateX = 360 * (c[1] + 1) / 2;
  currentRotateY = 360 * (c[0] + 1) / 2;
  currentObject.rotateX = currentRotateX;
  currentObject.rotateY = currentRotateY;
  $("#rotate-x").val(currentObject.rotateX);
  $("#rotate-y").val(currentObject.rotateY);
}

function render() {
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  for (var i = 0; i < fixedObjects.length; i++) {
    renderObject(fixedObjects[i]);
  };
  for (var i = 0; i < objects.length; i++) {
    renderObject(objects[i]);
  };

  requestAnimFrame(render);
}

function renderObject(object) {

  // Set transformation matrix for current object
  var modelViewMatrix = mult(getTranslationMatrix(object.x, object.y, object.z),
      mult(getScaleMatrix(object.scaleX, object.scaleY, object.scaleZ),
          getRotationMatrix(object.rotateX, object.rotateY, object.rotateZ)));

  modelViewMatrix = mult(lookAt(eye, [0, 0, 0], up), modelViewMatrix);
  modelViewMatrix = mult(perspective(20, canvas.clientWidth / canvas.clientHeight, 1, 20), modelViewMatrix);
  gl.uniformMatrix4fv( modelViewMatrixLoc, false, flatten(modelViewMatrix) );
  var shape = object.shape;

  for (var j = 0; j < shape.buffers.length; j++) {

    // Set current buffer
    var bufferInfo = shape.buffers[j];
    gl.bindBuffer(gl.ARRAY_BUFFER, bufferInfo.buffer);
    var vPosition = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    // Set color
    if (bufferInfo.fillmode == OUTLINE) {
      gl.uniform4fv(fColor, flatten(object.lineColor));
    } else if (bufferInfo.fillmode == SURFACE) {
      gl.uniform4fv(fColor, flatten(object.surfaceColor));
    }

    // Draw current buffer in given color
    gl.drawArrays(bufferInfo.drawmode, 0, bufferInfo.numVertices);
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
  gl.polygonOffset(0.2, 0);

  program = initShaders(gl, "vertex-shader", "fragment-shader");
  gl.useProgram(program);
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
