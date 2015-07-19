"use strict";

window.onload = function init() {
    var gl;
    var program;
    var index = 0;
    var mousedown = false;
    var strips = [];
    var strip = [];
    var red, green, blue = 0;
    
    var canvas = document.getElementById("gl-canvas");
    var thickness = document.getElementById("thickness").value;
    red = document.getElementById("red").value;
    green = document.getElementById("green").value;
    blue = document.getElementById("blue").value;
    setColorDisplay();

    gl = WebGLUtils.setupWebGL(canvas);
    if (!gl) { alert("WebGL isn't available"); }

    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);

    var gray = 45 / 255.0;
    gl.clearColor(gray, gray, gray, 1.0);

    program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    gl.clear(gl.COLOR_BUFFER_BIT);

    var vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);

    var vPosition = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(vPosition, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);
    gl.bufferData(gl.ARRAY_BUFFER, 100000, gl.STATIC_DRAW);

    var cBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);

    var vColor = gl.getAttribLocation(program, "vColor");
    gl.vertexAttribPointer(vColor, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vColor);
    gl.bufferData(gl.ARRAY_BUFFER, 200000, gl.STATIC_DRAW);

    render();

    function addPoint(event) {
        var point = coord(event);
        var color = getColor();
        strip.push(point);
        if (strip.length >= 2) {
            // Als dit het tweede punt is, berekenen we de eerste 2 driehoeken.
            var first = strip[strip.length - 2];
            var normal = normalvec2(point, first);
            if (strip.length == 2) {
                gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
                gl.bufferSubData(gl.ARRAY_BUFFER, 8 * index, flatten(subtract(first, normal)));
                gl.bufferSubData(gl.ARRAY_BUFFER, 8 * (index+1), flatten(add(first, normal)));
                
                gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
                gl.bufferSubData(gl.ARRAY_BUFFER, 16 * index, color);
                gl.bufferSubData(gl.ARRAY_BUFFER, 16 * (index+1), color);
                index += 2;
            }
            gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
            gl.bufferSubData(gl.ARRAY_BUFFER, 8 * index, flatten(subtract(point, normal)));
            gl.bufferSubData(gl.ARRAY_BUFFER, 8 * (index+1), flatten(add(point, normal)));
            
            gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
            gl.bufferSubData(gl.ARRAY_BUFFER, 16 * index, color);
            gl.bufferSubData(gl.ARRAY_BUFFER, 16 * (index+1), color);
            index += 2;
        }
    }

    function normalvec2(a, b) {
        var sub = subtract(a, b);
        return mult(normalize(vec2(-sub[1], sub[0])), vec2(thickness, thickness));
    }

    function coord(event) {
        // TODO: werkt alleen als canvas helemaal linksboven staat.
        var rect = canvas.getBoundingClientRect();
        console.log("x: " + event.screenX + " y: " + event.screenX);
        return vec2(2 * (event.clientX - rect.left) / canvas.width - 1, 
                    2 * (canvas.height - (event.clientY - rect.top)) / canvas.height - 1);
    }

    function getColor() {
        return flatten(vec4(red / 255.0, green / 255.0, blue / 255.0, 1.0));
    }

    function setColorDisplay() {
        document.getElementById("color-display").style.backgroundColor = "rgb(" + red + "," + green + "," + blue + ")";
        document.getElementById("color-display").style.height = (thickness * canvas.width) + "px";
    }

    function render() {
        gl.clear(gl.COLOR_BUFFER_BIT);

        var first = 0;
        for (var i = 0; i < strips.length; i++) {
            if (strips[i].length > 1) {
                gl.drawArrays(gl.TRIANGLE_STRIP, first, strips[i].length * 2);
            }
            first += strips[i].length * 2;
        }

        window.requestAnimFrame(render);
    }

    canvas.addEventListener("mousedown", function(event) { 
        mousedown = true; 
        strip = [];
        strips.push(strip);
        addPoint(event);
    });

    canvas.addEventListener("mouseup", function() { 
        mousedown = false;
    });

    canvas.addEventListener("mousemove", function(event) {
        if (mousedown) {
            addPoint(event);
        }
    });

    document.getElementById("clear-canvas").addEventListener("click", function() {
        strips = [];
        index = 0;
    });

    document.getElementById("thickness").addEventListener("input", function(event) {
        thickness = event.target.value;
        setColorDisplay();
    });
    
    document.getElementById("red").addEventListener("input", function(event) {
        red = event.target.value;
        setColorDisplay();
    });
    document.getElementById("green").addEventListener("input", function(event) { 
        green = event.target.value;
        setColorDisplay();
    });
    document.getElementById("blue").addEventListener("input", function(event) { 
        blue = event.target.value;
        setColorDisplay();
    });
}
