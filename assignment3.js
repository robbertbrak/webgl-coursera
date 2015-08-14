"use strict";

var canvas;
var gl;
var program;

var fColor;

var SURFACE = 1;
var OUTLINE = 2;

var fixedObjects = [];
var objects = [];
var currentObject = {};
var numObjectsCreated = 0;

var mouseDown = false;

var modelViewMatrixLoc;

var shapes = {};
var cameraRadius = 6;
var eye = [4.158247202848457, 2.375470056608669, 3.6147091459975838];
var up = [0, 1, 0];

window.onload = function init() {
  initGlProgram();

  fColor = gl.getUniformLocation(program, "fColor");
  modelViewMatrixLoc = gl.getUniformLocation( program, "modelViewMatrix" );

  initShapes();

  currentObject.shapeName = "sphere";
  currentObject.shape = shapes[currentObject.shapeName];
  currentObject.lineColor = vec4(0.1, 0.6, 0.0, 1.0);
  currentObject.surfaceColor = vec4(0.0, 1.0, 0.0, 1.0);
  currentObject.rotateX = 45;
  currentObject.rotateY = 45;
  currentObject.rotateZ = 45;

  initEventListeners();

  var xAxis = createAxis(vec4(-1, 0, 0, 1.0), vec4(1, 0, 0, 1.0), vec4(1.0, 0, 0, 1.0));
  var yAxis = createAxis(vec4(0, -1, 0, 1.0), vec4(0, 1, 0, 1.0), vec4(0, 1.0, 0, 1.0));
  var zAxis = createAxis(vec4(0, 0, -1, 1.0), vec4(0, 0, 1, 1.0), vec4(0, 0, 1.0, 1.0));
  fixedObjects.push(xAxis, yAxis, zAxis);
  fixedObjects.push(createArrow([1, 0, 0], [0, 90, 0], vec4(1.0, 0, 0, 1.0)));
  fixedObjects.push(createArrow([0, 1, 0], [270, 0, 0], vec4(0, 1.0, 0, 1.0)));
  fixedObjects.push(createArrow([0, 0, 1], [180, 0, 0], vec4(0, 0, 1.0, 1.0)));
  render();
};

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
  $("#translate-x").val(0);
  $("#translate-y").val(0);
  $("#translate-z").val(0);
  $("#scale").val(0.2);
  $("#rotate-x").val(45);
  $("#rotate-y").val(45);
  $("#rotate-z").val(45);
  $("#camera-angle-x").val(0);
  $("#camera-angle-y").val(45);

  $("#surface-color").spectrum({
    color: toColorPicker(currentObject.lineColor),
    showPalette: true,
    palette: getPalette(),
    change: function(color) {
      var rgb = color.toRgb();
      currentObject.surfaceColor = vec4(rgb.r / 255, rgb.g / 255, rgb.b / 255, rgb.a);
    }
  });
  $("#line-color").spectrum({
    color: toColorPicker(currentObject.surfaceColor),
    showPalette: true,
    palette: getPalette(),
    change: function(color) {
      var rgb = color.toRgb();
      currentObject.lineColor = vec4(rgb.r / 255, rgb.g / 255, rgb.b / 255, rgb.a);
    }
  });
  $("#shape").change(function() {
    var shape = $(this).val();
    currentObject.shape = shapes[shape];
    currentObject.shapeName = shape;
    $("#current-object option:selected").text(objectName(currentObject));
  });

  $("#scale").on("input", function() { changeScale($(this).val()) });
  $("#scale").on("change", function() { changeScale($(this).val()) });

  $("#translate-x").on("input", function() { changeTranslation($(this).val(), "x") });
  $("#translate-y").on("input", function() { changeTranslation($(this).val(), "y") });
  $("#translate-z").on("input", function() { changeTranslation($(this).val(), "z") });
  $("#translate-x").on("change", function() { changeTranslation($(this).val(), "x") });
  $("#translate-y").on("change", function() { changeTranslation($(this).val(), "y") });
  $("#translate-z").on("change", function() { changeTranslation($(this).val(), "z") });


  $("#camera-angle-x").on("input", function() { changeCameraX($(this).val()) });
  $("#camera-angle-x").on("change", function() { changeCameraX($(this).val()) });

  $("#camera-angle-y").on("input", function() { changeCameraY($(this).val()) });
  $("#camera-angle-y").on("change", function() { changeCameraY($(this).val()) });

  $("#rotate-x").on("input", function() { changeRotation($(this).val(), "X") });
  $("#rotate-y").on("input", function() { changeRotation($(this).val(), "Y") });
  $("#rotate-z").on("input", function() { changeRotation($(this).val(), "Z") });
  $("#rotate-x").on("change", function() { changeRotation($(this).val(), "X") });
  $("#rotate-y").on("change", function() { changeRotation($(this).val(), "Y") });
  $("#rotate-z").on("change", function() { changeRotation($(this).val(), "Z") });


  $("#gl-canvas").mousedown(function(event) {
    mouseDown = true;
    if(!event.ctrlKey) {
      moveObject(event);
    }
  });
  $("#gl-canvas").mouseup(function(event) { mouseDown=false; });
  $("#gl-canvas").mousemove(function(event) {
    if (mouseDown) {
      if (!event.ctrlKey) {
        moveObject(event);
      } else {
        rotateObject(event);
      }
    }
  });

  $("#add-object").click(function() {
    var prev = currentObject;
    var nextScale = random(0.01, 0.3);

    currentObject = {
      shapeName: prev.shapeName,
      shape: shapes[prev.shapeName],
      x: random(-0.8, 0.8),
      y: random(-0.8, 0.8),
      z: random(-0.8, 0.8),
      rotateX: prev.rotateX,
      rotateY: prev.rotateY,
      rotateZ: prev.rotateZ,
      scaleX: nextScale,
      scaleY: nextScale,
      scaleZ: nextScale,
      lineColor: prev.lineColor,
      surfaceColor: prev.surfaceColor
    };

    $("#translate-x").val(currentObject.x);
    $("#translate-y").val(currentObject.y);
    $("#translate-z").val(currentObject.z);
    $("#scale").val(currentObject.scaleX);

    numObjectsCreated++;
    currentObject.id = numObjectsCreated;

    objects.push(currentObject);
    $("#current-object").append($("<option></option>")
        .attr("value", currentObject.id)
        .text(objectName(currentObject)));
    $("#current-object").val(currentObject.id);
  });

  $("#remove-object").click(function() {
    if (currentObject != null) {
      var currentObjectIndex = findObjectIndex(currentObject.id);
      objects.splice(currentObjectIndex, 1);
      $("#current-object option:selected").remove();
      if (objects.length > 0) {
        $("#current-object").val(objects[objects.length - 1].id).change();
      }
    }
  })

  $("#current-object").change(function() {
    currentObject = objects[findObjectIndex($(this).val())];
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

function changeScale(scale) {
  currentObject.scaleX = scale;
  currentObject.scaleY = scale;
  currentObject.scaleZ = scale;
}

function changeTranslation(val, axis) {
  currentObject[axis] = val;
}

function changeCameraX(angle) {
  angle = radians(angle);
  up[1] = Math.cos(angle);
  up[2] = Math.sin(angle);
}

function changeCameraY(cameraAngleY) {
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
    // To prevent division by zero
    eye[0] = 0.0001;
  }
}

function changeRotation(val, axis) {
  currentObject["rotate" + axis] = val;
}

function findObjectIndex(id) {
  for (var i = 0; i < objects.length; i++) {
    if (objects[i].id == id) {
      return i;
    }
  }
  return -1;
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

function render() {
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

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
