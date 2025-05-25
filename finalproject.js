var perspectiveExample3D = function () {
    "use strict";

    var canvas;
    var gl;
    var program;

    var positionsArray = [];
    var colorsArray = [];

    var near = 0.1;
    var far = 100.0; // Increased far clipping plane
    var fovy = 45.0; // Field-of-view in Y direction angle (in degrees)
    var aspect = 1.0; // Viewport aspect ratio

    var modelViewMatrix, projectionMatrix;
    var modelViewMatrixLoc, projectionMatrixLoc;
    var eye = vec3(0.0, 1.0, 5.0); // Camera position above the ground
    const up = vec3(0.0, 1.0, 0.0); // Up direction

    let yaw = 180.0; // Horizontal rotation to face away from the cube
    let pitch = 0.0; // Vertical rotation

    const keyState = {}; // Object to track key states

    function colorCube() {
        const vertices = [
            vec4(-0.5, 0.0, 0.5, 1.0), // Bottom-left-front
            vec4(-0.5, 1.0, 0.5, 1.0), // Top-left-front
            vec4(0.5, 1.0, 0.5, 1.0),  // Top-right-front
            vec4(0.5, 0.0, 0.5, 1.0),  // Bottom-right-front
            vec4(-0.5, 0.0, -0.5, 1.0), // Bottom-left-back
            vec4(-0.5, 1.0, -0.5, 1.0), // Top-left-back
            vec4(0.5, 1.0, -0.5, 1.0),  // Top-right-back
            vec4(0.5, 0.0, -0.5, 1.0),  // Bottom-right-back
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

    function addGround() {
        const groundVertices = [
            vec4(-10.0, 0.0, -10.0, 1.0), // Bottom-left
            vec4(-10.0, 0.0, 10.0, 1.0),  // Top-left
            vec4(10.0, 0.0, 10.0, 1.0),   // Top-right
            vec4(10.0, 0.0, -10.0, 1.0),  // Bottom-right
        ];

        const green = vec4(0.0, 1.0, 0.0, 1.0); // Green color

        // Add two triangles to form the ground plane
        positionsArray.push(groundVertices[0], groundVertices[1], groundVertices[2]);
        colorsArray.push(green, green, green);
        positionsArray.push(groundVertices[0], groundVertices[2], groundVertices[3]);
        colorsArray.push(green, green, green);
    }

    function getCameraDirection() {
        const x = Math.cos(radians(pitch)) * Math.sin(radians(yaw));
        const y = Math.sin(radians(pitch));
        const z = Math.cos(radians(pitch)) * Math.cos(radians(yaw));
        return vec3(x, y, z);
    }

    function updateCamera() {
        const acceleration = 0.01; // Acceleration rate
        const deceleration = 0.01; // Deceleration rate
        const maxSpeed = 0.1; // Maximum movement speed
        const rotationSpeed = 1.0; // Speed of rotation

        const forward = getCameraDirection(); // Camera's forward direction
        const right = normalize(cross(forward, up)); // Perpendicular direction to the right

        // Initialize velocity if not already defined
        if (!updateCamera.velocity) {
            updateCamera.velocity = vec3(0.0, 0.0, 0.0); // Velocity vector
        }

        let velocity = updateCamera.velocity;

        // Handle acceleration
        if (keyState["w"]) {
            velocity = add(velocity, scale(acceleration, forward));
        }
        if (keyState["s"]) {
            velocity = subtract(velocity, scale(acceleration, forward));
        }
        if (keyState["a"]) {
            velocity = subtract(velocity, scale(acceleration, right));
        }
        if (keyState["d"]) {
            velocity = add(velocity, scale(acceleration, right));
        }

        // Handle deceleration
        if (!keyState["w"] && !keyState["s"]) {
            velocity = scale(1 - deceleration, velocity); // Gradually reduce forward/backward velocity
        }
        if (!keyState["a"] && !keyState["d"]) {
            velocity = scale(1 - deceleration, velocity); // Gradually reduce left/right velocity
        }

        // Cap the velocity to the maximum speed
        const speed = length(velocity);
        if (speed > maxSpeed) {
            velocity = scale(maxSpeed / speed, velocity);
        }

        // Update the camera position
        eye = add(eye, velocity);

        // Handle rotation
        if (keyState["ArrowUp"]) {
            pitch += rotationSpeed;
            pitch = Math.min(pitch, 89.0); // Clamp pitch to avoid flipping
        }
        if (keyState["ArrowDown"]) {
            pitch -= rotationSpeed;
            pitch = Math.max(pitch, -89.0); // Clamp pitch to avoid flipping
        }
        if (keyState["ArrowLeft"]) {
            yaw += rotationSpeed;
        }
        if (keyState["ArrowRight"]) {
            yaw -= rotationSpeed;
        }

        // Save the updated velocity
        updateCamera.velocity = velocity;
    }

    function addShapeInFrontOfCamera() {
        const triangleWidth = 0.5; // Width of the triangle
        const triangleHeight = 0.2; // Height of the triangle
        const distanceFromCamera = 1.0; // Distance in front of the camera

        // Calculate the position of the triangle in front of the camera
        const forward = getCameraDirection();
        const shapeCenter = add(eye, scale(distanceFromCamera, forward));

        // Define the vertices of the triangle
        const vertices = [
            vec4(shapeCenter[0] - triangleWidth / 2, shapeCenter[1] - triangleHeight, shapeCenter[2], 1.0), // Bottom-left
            vec4(shapeCenter[0] + triangleWidth / 2, shapeCenter[1] - triangleHeight, shapeCenter[2], 1.0), // Bottom-right
            vec4(shapeCenter[0], shapeCenter[1], shapeCenter[2], 1.0), // Top (aligned with the camera's position)
        ];

        const color = vec4(1.0, 0.0, 0.0, 1.0); // Red color for the triangle

        // Add the triangle to the positions and colors arrays
        positionsArray.push(vertices[0], vertices[1], vertices[2]);
        colorsArray.push(color, color, color);
    }

    let airplanePosition = vec3(0.0, 0.0, 0.0); // Initial position of the airplane

    function addPaperAirplane() {
        const airplaneWidth = 1.0; // Width of the airplane
        const airplaneHeight = 0.5; // Height of the airplane

        // Define the airplane's position (keep it fixed or update based on movement logic)
        if (!addPaperAirplane.initialized) {
            airplanePosition = vec3(0.0, 0.5, 0.0); // Initial position of the airplane
            addPaperAirplane.initialized = true;
        }

        // Define the vertices of the paper airplane
        const vertices = [
            vec4(airplanePosition[0] - airplaneWidth / 2, airplanePosition[1] - airplaneHeight, airplanePosition[2], 1.0), // Bottom-left
            vec4(airplanePosition[0] + airplaneWidth / 2, airplanePosition[1] - airplaneHeight, airplanePosition[2], 1.0), // Bottom-right
            vec4(airplanePosition[0], airplanePosition[1] + airplaneHeight, airplanePosition[2], 1.0), // Top (front tip)
        ];

        const color = vec4(0.8, 0.8, 0.8, 1.0); // Light gray color for the airplane

        // Add the airplane to the positions and colors arrays
        positionsArray.push(vertices[0], vertices[1], vertices[2]);
        colorsArray.push(color, color, color);
    }

    window.onload = function init() {
        canvas = document.getElementById("gl-canvas");
        if (!canvas) {
            console.error("Canvas element with id 'gl-canvas' not found.");
            return;
        }

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

    window.addEventListener("keydown", function (event) {
        keyState[event.key] = true; // Mark key as pressed
    });

    window.addEventListener("keyup", function (event) {
        keyState[event.key] = false; // Mark key as released
    });

    var render = function () {
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        positionsArray = []; // Clear the positions array
        colorsArray = []; // Clear the colors array

        colorCube(); // Add the cube
        addGround(); // Add the ground

        // Calculate the forward and right directions based on yaw
        const forward = vec3(
            Math.sin(radians(yaw)),
            0.0,
            -Math.cos(radians(yaw))
        ); // Forward direction of the airplane
        const right = vec3(
            Math.cos(radians(yaw)),
            0.0,
            Math.sin(radians(yaw))
        ); // Right direction of the airplane

        // Update the airplane position based on user input
        const moveSpeed = 0.05; // Speed of the airplane
        if (keyState["w"]) {
            airplanePosition = add(airplanePosition, scale(moveSpeed, forward)); // Move forward
        }
        if (keyState["s"]) {
            airplanePosition = subtract(airplanePosition, scale(moveSpeed, forward)); // Move backward
        }
        if (keyState["a"]) {
            airplanePosition = subtract(airplanePosition, scale(moveSpeed, right)); // Move left
        }
        if (keyState["d"]) {
            airplanePosition = add(airplanePosition, scale(moveSpeed, right)); // Move right
        }

        addPaperAirplane(); // Add the paper airplane in front of the camera

        // Update the camera position for third-person view
        const offset = vec3(0.0, 1.0, -3.0); // Offset behind and above the airplane
        eye = add(airplanePosition, offset); // Position the camera behind the airplane

        // Calculate the forward direction of the airplane
        const center = add(airplanePosition, scale(2.0, forward)); // Look at a point in front of the airplane

        updateCamera(); // Update camera position and orientation

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

        modelViewMatrix = lookAt(eye, center, up);
        projectionMatrix = perspective(fovy, aspect, near, far);

        gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(modelViewMatrix));
        gl.uniformMatrix4fv(projectionMatrixLoc, false, flatten(projectionMatrix));

        gl.drawArrays(gl.TRIANGLES, 0, positionsArray.length);
        requestAnimationFrame(render);
    };
};

perspectiveExample3D();