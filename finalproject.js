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
    var eye = vec3(0.0, 0.0, 10.0); // Camera position
    var at = vec3(0.0, 0.0, 0.0); // Look-at point
    const up = vec3(0.0, 1.0, 0.0); // Up direction

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

    function addLoop() {
        const loopRadius = 2.0; // Radius of the loop
        const loopSegments = 36; // Number of segments in the loop
        const loopHeight = 3.0; // Height above the square

        const loopColor = vec4(1.0, 1.0, 0.0, 1.0); // Yellow color for the loop

        for (let i = 0; i < loopSegments; i++) {
            const angle1 = (i / loopSegments) * 2 * Math.PI;
            const angle2 = ((i + 1) / loopSegments) * 2 * Math.PI;

            const x1 = loopRadius * Math.cos(angle1);
            const z1 = loopRadius * Math.sin(angle1);
            const x2 = loopRadius * Math.cos(angle2);
            const z2 = loopRadius * Math.sin(angle2);

            // Add two points for each segment
            positionsArray.push(
                vec4(x1, loopHeight, z1, 1.0),
                vec4(x2, loopHeight, z2, 1.0)
            );

            // Add the same color for both points
            colorsArray.push(loopColor, loopColor);
        }
    }

    function addThickLoop() {
        const loopRadius = 2.0; // Radius of the main loop
        const tubeRadius = 0.3; // Radius of the tube (thickness)
        const loopSegments = 36; // Number of segments in the main loop
        const tubeSegments = 18; // Number of segments in the tube (cross-section)
        const loopHeight = 3.0; // Height above the square

        const loopColor = vec4(1.0, 1.0, 0.0, 1.0); // Yellow color for the loop

        // Rotation matrix for 90 degrees around the X-axis
        const rotationMatrix = mat4(
            1, 0, 0, 0,
            0, 0, -1, 0,
            0, 1, 0, 0,
            0, 0, 0, 1
        );

        for (let i = 0; i < loopSegments; i++) {
            const angle1 = (i / loopSegments) * 2 * Math.PI;
            const angle2 = ((i + 1) / loopSegments) * 2 * Math.PI;

            for (let j = 0; j < tubeSegments; j++) {
                const tubeAngle1 = (j / tubeSegments) * 2 * Math.PI;
                const tubeAngle2 = ((j + 1) / tubeSegments) * 2 * Math.PI;

                // Calculate the positions of the four vertices of each quad
                const p1 = vec4(
                    (loopRadius + tubeRadius * Math.cos(tubeAngle1)) * Math.cos(angle1),
                    loopHeight + tubeRadius * Math.sin(tubeAngle1),
                    (loopRadius + tubeRadius * Math.cos(tubeAngle1)) * Math.sin(angle1),
                    1.0
                );

                const p2 = vec4(
                    (loopRadius + tubeRadius * Math.cos(tubeAngle2)) * Math.cos(angle1),
                    loopHeight + tubeRadius * Math.sin(tubeAngle2),
                    (loopRadius + tubeRadius * Math.cos(tubeAngle2)) * Math.sin(angle1),
                    1.0
                );

                const p3 = vec4(
                    (loopRadius + tubeRadius * Math.cos(tubeAngle2)) * Math.cos(angle2),
                    loopHeight + tubeRadius * Math.sin(tubeAngle2),
                    (loopRadius + tubeRadius * Math.cos(tubeAngle2)) * Math.sin(angle2),
                    1.0
                );

                const p4 = vec4(
                    (loopRadius + tubeRadius * Math.cos(tubeAngle1)) * Math.cos(angle2),
                    loopHeight + tubeRadius * Math.sin(tubeAngle1),
                    (loopRadius + tubeRadius * Math.cos(tubeAngle1)) * Math.sin(angle2),
                    1.0
                );

                // Apply the rotation matrix to each vertex
                const rotatedP1 = mult(rotationMatrix, p1);
                const rotatedP2 = mult(rotationMatrix, p2);
                const rotatedP3 = mult(rotationMatrix, p3);
                const rotatedP4 = mult(rotationMatrix, p4);

                // Add two triangles for each quad
                positionsArray.push(rotatedP1, rotatedP2, rotatedP3);
                positionsArray.push(rotatedP1, rotatedP3, rotatedP4);

                // Add the same color for all vertices
                colorsArray.push(loopColor, loopColor, loopColor);
                colorsArray.push(loopColor, loopColor, loopColor);
            }
        }
    }

    function addThickLoops() {
        const loopRadius = 2.0; // Radius of the main loop
        const tubeRadius = 0.3; // Radius of the tube (thickness)
        const loopSegments = 36; // Number of segments in the main loop
        const tubeSegments = 18; // Number of segments in the tube (cross-section)
        const totalLoops = 10; // Number of loops
        const spacing = 1.5; // Vertical spacing between loops
        const baseHeight = 3.0; // Starting height of the first loop

        const loopColor = vec4(1.0, 1.0, 0.0, 1.0); // Yellow color for the loops

        // Rotation matrix for 90 degrees around the X-axis
        const rotationMatrix = mat4(
            1, 0, 0, 0,
            0, 0, -1, 0,
            0, 1, 0, 0,
            0, 0, 0, 1
        );

        for (let loopIndex = 0; loopIndex < totalLoops; loopIndex++) {
            const loopHeight = baseHeight + loopIndex * spacing; // Calculate height for this loop

            for (let i = 0; i < loopSegments; i++) {
                const angle1 = (i / loopSegments) * 2 * Math.PI;
                const angle2 = ((i + 1) / loopSegments) * 2 * Math.PI;

                for (let j = 0; j < tubeSegments; j++) {
                    const tubeAngle1 = (j / tubeSegments) * 2 * Math.PI;
                    const tubeAngle2 = ((j + 1) / tubeSegments) * 2 * Math.PI;

                    // Calculate the positions of the four vertices of each quad
                    const p1 = vec4(
                        (loopRadius + tubeRadius * Math.cos(tubeAngle1)) * Math.cos(angle1),
                        loopHeight + tubeRadius * Math.sin(tubeAngle1),
                        (loopRadius + tubeRadius * Math.cos(tubeAngle1)) * Math.sin(angle1),
                        1.0
                    );

                    const p2 = vec4(
                        (loopRadius + tubeRadius * Math.cos(tubeAngle2)) * Math.cos(angle1),
                        loopHeight + tubeRadius * Math.sin(tubeAngle2),
                        (loopRadius + tubeRadius * Math.cos(tubeAngle2)) * Math.sin(angle1),
                        1.0
                    );

                    const p3 = vec4(
                        (loopRadius + tubeRadius * Math.cos(tubeAngle2)) * Math.cos(angle2),
                        loopHeight + tubeRadius * Math.sin(tubeAngle2),
                        (loopRadius + tubeRadius * Math.cos(tubeAngle2)) * Math.sin(angle2),
                        1.0
                    );

                    const p4 = vec4(
                        (loopRadius + tubeRadius * Math.cos(tubeAngle1)) * Math.cos(angle2),
                        loopHeight + tubeRadius * Math.sin(tubeAngle1),
                        (loopRadius + tubeRadius * Math.cos(tubeAngle1)) * Math.sin(angle2),
                        1.0
                    );

                    // Apply the rotation matrix to each vertex
                    const rotatedP1 = mult(rotationMatrix, p1);
                    const rotatedP2 = mult(rotationMatrix, p2);
                    const rotatedP3 = mult(rotationMatrix, p3);
                    const rotatedP4 = mult(rotationMatrix, p4);

                    // Add two triangles for each quad
                    positionsArray.push(rotatedP1, rotatedP2, rotatedP3);
                    positionsArray.push(rotatedP1, rotatedP3, rotatedP4);

                    // Add the same color for all vertices
                    colorsArray.push(loopColor, loopColor, loopColor);
                    colorsArray.push(loopColor, loopColor, loopColor);
                }
            }
        }
    }

    var render = function () {
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        positionsArray = [];
        colorsArray = [];

        colorCube(); // Add the cube
        addThickLoops(); // Add 10 thick loops above the square

        const moveSpeed = 0.05;
        const forward = getCameraDirection();
        const right = cross(forward, up);

        // Apply movements based on key states
        if (keyState["w"]) {
            eye = add(eye, scale(moveSpeed, forward)); // Move forward
        }
        if (keyState["s"]) {
            eye = subtract(eye, scale(moveSpeed, forward)); // Move backward
        }
        if (keyState["a"]) {
            eye = subtract(eye, scale(moveSpeed, right)); // Move left
        }
        if (keyState["d"]) {
            eye = add(eye, scale(moveSpeed, right)); // Move right
        }
        if (keyState[" "]) { // Space key for upward movement
            eye = add(eye, vec3(0.0, moveSpeed, 0.0)); // Move up
        }
        if (keyState["Shift"]) { // Shift key for downward movement
            eye = subtract(eye, vec3(0.0, moveSpeed, 0.0)); // Move down
        }

        // Handle camera rotation with Arrow Keys
        const rotationSpeed = 0.5;
        if (keyState["ArrowUp"]) {
            pitch += rotationSpeed; // Increase pitch to tilt upward
            pitch = Math.min(pitch, 89.0); // Clamp pitch to avoid flipping
        }
        if (keyState["ArrowDown"]) {
            pitch -= rotationSpeed; // Decrease pitch to tilt downward
            pitch = Math.max(pitch, -89.0); // Clamp pitch to avoid flipping
        }
        if (keyState["ArrowLeft"]) {
            yaw += rotationSpeed; // Increase yaw to rotate left
        }
        if (keyState["ArrowRight"]) {
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