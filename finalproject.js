var perspectiveExample3D = function () {
    "use strict";

    var canvas;
    var gl;
    var program;

    var positionsArray = [];
    var colorsArray = [];

    var near = 0.3;
    var far = 50.0;
    var fovy = 45.0; // Field-of-view in Y direction angle (in degrees)
    var aspect = 1.0; // Viewport aspect ratio

    var modelViewMatrix, projectionMatrix;
    var modelViewMatrixLoc, projectionMatrixLoc;
    var eye = vec3(0.0, 0.0, 20.0); // Position the camera along the positive Z-axis
    var at = vec3(0.0, 0.0, 0.0);   // Look at the center of the cube
    const up = vec3(0.0, 1.0, 0.0); // Keep the up direction aligned with the Y-axis

    let yaw = 180.0; // Horizontal rotation
    let pitch = 0.0; // Vertical rotation
    const keyState = {}; // Object to track key states

    function colorCube() {
        const vertices = [
            vec4(-0.5, -0.5, 0.5, 1.0),
            vec4(-0.5, 0.5, 0.5, 1.0),
            vec4(0.5, 0.5, 0.5, 1.0),
            vec4(0.5, -0.5, 0.5, 1.0),
            vec4(-0.5, -0.5, -0.5, 1.0),
            vec4(-0.5, 0.5, -0.5, 1.0),
            vec4(0.5, 0.5, -0.5, 1.0),
            vec4(0.5, -0.5, -0.5, 1.0),
        ];

        const colors = [
            vec4(1.0, 0.0, 0.0, 1.0), // Red
            vec4(0.0, 1.0, 0.0, 1.0), // Green
            vec4(0.0, 0.0, 1.0, 1.0), // Blue
            vec4(1.0, 1.0, 0.0, 1.0), // Yellow
            vec4(1.0, 0.0, 1.0, 1.0), // Magenta
            vec4(0.0, 1.0, 1.0, 1.0), // Cyan
        ];

        function quad(a, b, c, d, color) {
            positionsArray.push(vertices[a], vertices[b], vertices[c]);
            colorsArray.push(color, color, color);
            positionsArray.push(vertices[a], vertices[c], vertices[d]);
            colorsArray.push(color, color, color);
        }

        quad(1, 0, 3, 2, colors[0]); // Front face
        quad(2, 3, 7, 6, colors[1]); // Right face
        quad(3, 0, 4, 7, colors[2]); // Bottom face
        quad(6, 5, 1, 2, colors[3]); // Top face
        quad(4, 5, 6, 7, colors[4]); // Back face
        quad(5, 4, 0, 1, colors[5]); // Left face
    }

    window.onload = function init() {
        canvas = document.getElementById("gl-canvas");

        gl = canvas.getContext("webgl2");
        if (!gl) {
            console.error("WebGL 2.0 isn't available");
            return;
        }

        gl.viewport(0, 0, canvas.width, canvas.height);

        aspect = canvas.width / canvas.height;

        gl.clearColor(1.0, 1.0, 1.0, 1.0);

        gl.enable(gl.DEPTH_TEST);

        program = initShaders(gl, "vertex-shader", "fragment-shader");
        gl.useProgram(program);

        modelViewMatrixLoc = gl.getUniformLocation(program, "uModelViewMatrix");
        projectionMatrixLoc = gl.getUniformLocation(program, "uProjectionMatrix");

        render();
    };

    // Track key states
    window.addEventListener("keydown", function (event) {
        keyState[event.key] = true;
    });

    window.addEventListener("keyup", function (event) {
        keyState[event.key] = false;
    });

    function getCameraDirection() {
        const x = Math.cos(radians(pitch)) * Math.sin(radians(yaw));
        const y = Math.sin(radians(pitch));
        const z = Math.cos(radians(pitch)) * Math.cos(radians(yaw));
        return vec3(x, y, z);
    }


    const loopColors = []; // Array to store the colors of each loop

    function addThickLoops(activeLoops) {
        const loopRadius = 2.0; // Radius of the main loop
        const tubeRadius = 0.3; // Radius of the tube (thickness)
        const loopSegments = 36; // Number of segments in the main loop
        const tubeSegments = 18; // Number of segments in the tube (cross-section)

        console.log("Rendering loops with centers:", activeLoops);

        for (const center of activeLoops) {
            const loopColor = vec4(1.0, 1.0, 0.0, 1.0); // Yellow color for the loop

            for (let i = 0; i < loopSegments; i++) {
                const angle1 = (i / loopSegments) * 2 * Math.PI;
                const angle2 = ((i + 1) / loopSegments) * 2 * Math.PI;

                for (let j = 0; j < tubeSegments; j++) {
                    const tubeAngle1 = (j / tubeSegments) * 2 * Math.PI;
                    const tubeAngle2 = ((j + 1) / tubeSegments) * 2 * Math.PI;

                    // Calculate the positions of the four vertices of each quad
                    const p1 = vec4(
                        center[0] + (loopRadius + tubeRadius * Math.cos(tubeAngle1)) * Math.cos(angle1),
                        center[1] + tubeRadius * Math.sin(tubeAngle1),
                        center[2] + (loopRadius + tubeRadius * Math.cos(tubeAngle1)) * Math.sin(angle1),
                        1.0
                    );

                    const p2 = vec4(
                        center[0] + (loopRadius + tubeRadius * Math.cos(tubeAngle2)) * Math.cos(angle1),
                        center[1] + tubeRadius * Math.sin(tubeAngle2),
                        center[2] + (loopRadius + tubeRadius * Math.cos(tubeAngle2)) * Math.sin(angle1),
                        1.0
                    );

                    const p3 = vec4(
                        center[0] + (loopRadius + tubeRadius * Math.cos(tubeAngle2)) * Math.cos(angle2),
                        center[1] + tubeRadius * Math.sin(tubeAngle2),
                        center[2] + (loopRadius + tubeRadius * Math.cos(tubeAngle2)) * Math.sin(angle2),
                        1.0
                    );

                    const p4 = vec4(
                        center[0] + (loopRadius + tubeRadius * Math.cos(tubeAngle1)) * Math.cos(angle2),
                        center[1] + tubeRadius * Math.sin(tubeAngle1),
                        center[2] + (loopRadius + tubeRadius * Math.cos(tubeAngle1)) * Math.sin(angle2),
                        1.0
                    );

                    // Add two triangles for each quad
                    positionsArray.push(p1, p2, p3);
                    positionsArray.push(p1, p3, p4);

                    // Add the current color for all vertices
                    colorsArray.push(loopColor, loopColor, loopColor);
                    colorsArray.push(loopColor, loopColor, loopColor);
                }
            }
        }

        console.log("Positions array length:", positionsArray.length);
        console.log("Colors array length:", colorsArray.length);
    }

    const loopCenters = [
        vec3(10.0, 3.0, 10.0),  // Center of the first loop
        vec3(2.0, 6.0, 0.0),  // Center of the second loop
        vec3(-2.0, 9.0, 0.0), // Center of the third loop
        vec3(0.0, 12.0, 2.0), // Center of the fourth loop
        vec3(0.0, 15.0, -2.0) // Center of the fifth loop
    ];

    var render = function () {
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        positionsArray = [];
        colorsArray = [];

        colorCube(); // Add the cube

        // Check if the camera is inside any loop
        const loopRadius = 2.0; // Radius of the main loop

        for (let i = loopCenters.length - 1; i >= 0; i--) {
            const loopCenter = loopCenters[i];
            const distance = length(subtract(eye, loopCenter)); // Distance from the camera to the loop center

            console.log(`Loop ${i}: Distance = ${distance}, Eye = ${eye}`);
            console.log(`Loop ${i} removed`);

            // Remove the loop if the camera is close enough
            if (distance < loopRadius) {
                console.log(`Loop ${i} removed`);
                loopCenters.splice(i, 1); // Remove the loop from the array
            }
        }

        addThickLoops(loopCenters); // Add the loops with updated centers

        const moveSpeed = 0.05;
        const forward = getCameraDirection();
        const right = cross(forward, up);

        // Apply movements based on key states
        if (keyState[" "]) { // Space key for upward movement
            eye = add(eye, scale(moveSpeed, forward)); // Move up
        }

        // Handle camera rotation with Arrow Keys
        const rotationSpeed = 2.0; // Increased rotation speed
        if (keyState["w"]) {
            pitch += rotationSpeed; // Increase pitch to tilt upward
            pitch = Math.min(pitch, 89.0); // Clamp pitch to avoid flipping
        }
        if (keyState["s"]) {
            pitch -= rotationSpeed; // Decrease pitch to tilt downward
            pitch = Math.max(pitch, -89.0); // Clamp pitch to avoid flipping
        }
        if (keyState["a"]) {
            yaw += rotationSpeed; // Increase yaw to rotate left
        }
        if (keyState["d"]) {
            yaw -= rotationSpeed; // Decrease yaw to rotate right
        }

        // Update the look-at point
        at = add(eye, forward);

        var cBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, flatten(colorsArray), gl.STATIC_DRAW);

        var colorLoc = gl.getAttribLocation(program, "aColor");
        gl.vertexAttribPointer(colorLoc, 4, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(colorLoc);

        var vBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, flatten(positionsArray), gl.STATIC_DRAW);

        var positionLoc = gl.getAttribLocation(program, "aPosition");
        gl.vertexAttribPointer(positionLoc, 4, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(positionLoc);

        modelViewMatrix = lookAt(eye, at, up);
        projectionMatrix = perspective(fovy, aspect, near, far);

        gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(modelViewMatrix));
        gl.uniformMatrix4fv(projectionMatrixLoc, false, flatten(projectionMatrix));

        gl.drawArrays(gl.TRIANGLES, 0, positionsArray.length); // Render as triangles
        requestAnimationFrame(render);
    };
};

perspectiveExample3D();