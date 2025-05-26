var perspectiveExample3D = function () {
    "use strict";

    var canvas;
    var gl;
    var program;

    var positionsArray = [];
    var colorsArray = [];

    var near = 0.3;
    var far = 500.0;
    var fovy = 45.0; // Field-of-view in Y direction angle (in degrees)
    var aspect = 1.0; // Viewport aspect ratio

    var modelViewMatrix, projectionMatrix;
    var modelViewMatrixLoc, projectionMatrixLoc;
    var eye = vec3(0.0, 5.0, 75.0); // Raise the camera to y = 5.0
    var at = vec3(0.0, 1.0, 0.0);   // Adjust the look-at point to the cube's center
    const up = vec3(0.0, 1.0, 0.0); // Keep the up direction aligned with the Y-axis

    let yaw = 180.0; // Horizontal rotation
    let pitch = 0.0; // Vertical rotation
    const keyState = {}; // Object to track key states
    
    let timerStarted = false;
    let startTime = 0;
    let endTime = 0;

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

        let timerDiv = document.createElement("div");
        timerDiv.id = "timer";
        timerDiv.style.position = "absolute";
        timerDiv.style.top = "10px";
        timerDiv.style.left = "10px";
        timerDiv.style.fontSize = "24px";
        timerDiv.style.color = "black";
        timerDiv.style.background = "rgba(255,255,255,0.7)";
        timerDiv.style.padding = "5px 10px";
        timerDiv.style.borderRadius = "8px";
        document.body.appendChild(timerDiv);

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

    const loopCenters = [
        vec3(15.0, 6.0, 50.0),  // Center of the first loop
        vec3(-9.0, 24.0, 25.0),  // Center of the second loop
        vec3(7.0, 9.0, 0.0), // Center of the third loop
        vec3(-13.0, 20.0, -32.0), // Center of the fourth loop
        vec3(11.0, 4.0, -60.0) // Center of the fifth loop
    ];

    function addSpheres(activeCenters) {
        const sphereRadius = 2.0; // Radius of the sphere
        const latitudeSegments = 18; // Number of segments along the latitude
        const longitudeSegments = 36; // Number of segments along the longitude

        for (const center of activeCenters) {
            const sphereColor = vec4(1.0, 1.0, 0.0, 1.0); // Yellow color for the sphere

            for (let lat = 0; lat < latitudeSegments; lat++) {
                const theta1 = (lat / latitudeSegments) * Math.PI; // Latitude angle 1
                const theta2 = ((lat + 1) / latitudeSegments) * Math.PI; // Latitude angle 2

                for (let lon = 0; lon < longitudeSegments; lon++) {
                    const phi1 = (lon / longitudeSegments) * 2 * Math.PI; // Longitude angle 1
                    const phi2 = ((lon + 1) / longitudeSegments) * 2 * Math.PI; // Longitude angle 2

                    // Calculate the positions of the four vertices of each quad
                    const p1 = vec4(
                        center[0] + sphereRadius * Math.sin(theta1) * Math.cos(phi1),
                        center[1] + sphereRadius * Math.cos(theta1),
                        center[2] + sphereRadius * Math.sin(theta1) * Math.sin(phi1),
                        1.0
                    );

                    const p2 = vec4(
                        center[0] + sphereRadius * Math.sin(theta2) * Math.cos(phi1),
                        center[1] + sphereRadius * Math.cos(theta2),
                        center[2] + sphereRadius * Math.sin(theta2) * Math.sin(phi1),
                        1.0
                    );

                    const p3 = vec4(
                        center[0] + sphereRadius * Math.sin(theta2) * Math.cos(phi2),
                        center[1] + sphereRadius * Math.cos(theta2),
                        center[2] + sphereRadius * Math.sin(theta2) * Math.sin(phi2),
                        1.0
                    );

                    const p4 = vec4(
                        center[0] + sphereRadius * Math.sin(theta1) * Math.cos(phi2),
                        center[1] + sphereRadius * Math.cos(theta1),
                        center[2] + sphereRadius * Math.sin(theta1) * Math.sin(phi2),
                        1.0
                    );

                    // Add two triangles for each quad
                    positionsArray.push(p1, p2, p3);
                    positionsArray.push(p1, p3, p4);

                    // Add the current color for all vertices
                    colorsArray.push(sphereColor, sphereColor, sphereColor);
                    colorsArray.push(sphereColor, sphereColor, sphereColor);
                }
            }
        }
    }

    let velocity = vec3(0.0, 0.0, 0.0); // Initialize velocity
    const acceleration = 0.01; // Acceleration when moving forward
    const friction = 0.98; // Friction to slow down when no key is pressed

    const collisionRadius = 3.0; // Larger collision radius for the spheres

    function checkCollisions() {
        for (let i = loopCenters.length - 1; i >= 0; i--) {
            const loopCenter = loopCenters[i];
            const distance = length(subtract(eye, loopCenter)); // Distance from the camera to the sphere center

            // Check if the camera is within the collision radius
            if (distance < collisionRadius) {
                loopCenters.splice(i, 1); // Remove the sphere from the array
            }
        }
    }

    function addGrayPlane() {
        const planeLength = 350.0;
        const planeWidth = 40.0;
        const planeColor = vec4(0.5, 0.5, 0.5, 1.0);

        const y = 0.5; // Runway at y = 0.5

        const vertices = [
            vec4(-planeWidth / 2, y, -planeLength / 2, 1.0),
            vec4(planeWidth / 2, y, -planeLength / 2, 1.0),
            vec4(planeWidth / 2, y, planeLength / 2, 1.0),
            vec4(-planeWidth / 2, y, planeLength / 2, 1.0),
        ];

        positionsArray.push(vertices[0], vertices[1], vertices[2]);
        positionsArray.push(vertices[0], vertices[2], vertices[3]);
        colorsArray.push(planeColor, planeColor, planeColor);
        colorsArray.push(planeColor, planeColor, planeColor);
    }

    function addRunwayMarkings() {
        const planeLength = 350.0; // Length of the runway
        const planeWidth = 40.0;  // Width of the runway
        const dashLength = 5.0;   // Length of each yellow dash
        const dashWidth = 1.0;    // Width of each yellow dash
        const sideLineWidth = 0.5; // Width of the white side lines
        const sideOffset = 2.0;   // Distance of the side lines from the edges

        const yellowColor = vec4(1.0, 1.0, 0.0, 1.0); // Yellow color for center dashes
        const whiteColor = vec4(1.0, 1.0, 1.0, 1.0);  // White color for side lines

        const markingY = 0.51; // Slightly above the runway

        // Add yellow dashes to the center of the runway
        for (let z = -planeLength / 2; z < planeLength / 2; z += dashLength * 2) {
            const vertices = [
                vec4(-dashWidth / 2, markingY, z, 1.0), // Bottom-left
                vec4(dashWidth / 2, markingY, z, 1.0),  // Bottom-right
                vec4(dashWidth / 2, markingY, z + dashLength, 1.0), // Top-right
                vec4(-dashWidth / 2, markingY, z + dashLength, 1.0), // Top-left
            ];

            positionsArray.push(vertices[0], vertices[1], vertices[2]);
            positionsArray.push(vertices[0], vertices[2], vertices[3]);

            colorsArray.push(yellowColor, yellowColor, yellowColor);
            colorsArray.push(yellowColor, yellowColor, yellowColor);
        }

        // Add white side lines
        const sideLineZStart = -planeLength / 2;
        const sideLineZEnd = planeLength / 2;

        // Left side line
        const leftVertices = [
            vec4(-planeWidth / 2 + sideOffset, markingY, sideLineZStart, 1.0), // Bottom-left
            vec4(-planeWidth / 2 + sideOffset + sideLineWidth, markingY, sideLineZStart, 1.0), // Bottom-right
            vec4(-planeWidth / 2 + sideOffset + sideLineWidth, markingY, sideLineZEnd, 1.0), // Top-right
            vec4(-planeWidth / 2 + sideOffset, markingY, sideLineZEnd, 1.0), // Top-left
        ];

        positionsArray.push(leftVertices[0], leftVertices[1], leftVertices[2]);
        positionsArray.push(leftVertices[0], leftVertices[2], leftVertices[3]);

        colorsArray.push(whiteColor, whiteColor, whiteColor);
        colorsArray.push(whiteColor, whiteColor, whiteColor);

        // Right side line
        const rightVertices = [
            vec4(planeWidth / 2 - sideOffset, markingY, sideLineZStart, 1.0), // Bottom-left
            vec4(planeWidth / 2 - sideOffset - sideLineWidth, markingY, sideLineZStart, 1.0), // Bottom-right
            vec4(planeWidth / 2 - sideOffset - sideLineWidth, markingY, sideLineZEnd, 1.0), // Top-right
            vec4(planeWidth / 2 - sideOffset, markingY, sideLineZEnd, 1.0), // Top-left
        ];

        positionsArray.push(rightVertices[0], rightVertices[1], rightVertices[2]);
        positionsArray.push(rightVertices[0], rightVertices[2], rightVertices[3]);

        colorsArray.push(whiteColor, whiteColor, whiteColor);
        colorsArray.push(whiteColor, whiteColor, whiteColor);
    }

    // Add this function near your other "add..." functions
    function addGrassPlane() {
        const grassSize = 400.0;
        const grassColor = vec4(0.2, 0.8, 0.2, 1.0); // Green

        const y = -0.5; // Grass at y = -0.5

        const vertices = [
            vec4(-grassSize / 2, y, -grassSize / 2, 1.0), // Bottom-left
            vec4(grassSize / 2, y, -grassSize / 2, 1.0),  // Bottom-right
            vec4(grassSize / 2, y, grassSize / 2, 1.0),   // Top-right
            vec4(-grassSize / 2, y, grassSize / 2, 1.0),  // Top-left
        ];

        // Add two triangles to form the grass plane
        positionsArray.push(vertices[0], vertices[1], vertices[2]);
        positionsArray.push(vertices[0], vertices[2], vertices[3]);

        // Add the green color for all vertices
        colorsArray.push(grassColor, grassColor, grassColor);
        colorsArray.push(grassColor, grassColor, grassColor);
    }

    function updateTimerDisplay() {
        const timerDiv = document.getElementById("timer");
        let elapsed = 0;
        if (timerStarted) {
            elapsed = ((performance.now() - startTime) / 1000);
        } else if (endTime > 0) {
            elapsed = ((endTime - startTime) / 1000);
        }
        timerDiv.textContent = "Time: " + elapsed.toFixed(2) + "s";
    }

    function addClouds() {
        // Array of cloud centers (x, y, z)
        const cloudCenters = [
            vec3(-50, 60, 0),
            vec3(0, 60, 40),
            vec3(40, 60, -30),
            vec3(-30, 60, 60),
            vec3(60, 60, 20),
            vec3(20, 60, -60)
        ];
        const cloudColor = vec4(0.0, 0.0, 0.0, 0.6); // Light gray, semi-transparent
        const cloudRadius = 15.0;
        const latitudeSegments = 12;
        const longitudeSegments = 24;

        for (const center of cloudCenters) {
            for (let lat = 0; lat < latitudeSegments; lat++) {
                const theta1 = (lat / latitudeSegments) * Math.PI;
                const theta2 = ((lat + 1) / latitudeSegments) * Math.PI;
                for (let lon = 0; lon < longitudeSegments; lon++) {
                    const phi1 = (lon / longitudeSegments) * 2 * Math.PI;
                    const phi2 = ((lon + 1) / longitudeSegments) * 2 * Math.PI;

                    // Spherical coordinates for ellipsoid (cloud)
                    const p1 = vec4(
                        center[0] + cloudRadius * Math.sin(theta1) * Math.cos(phi1),
                        center[1] + cloudRadius * 0.5 * Math.cos(theta1), // Flatten vertically
                        center[2] + cloudRadius * Math.sin(theta1) * Math.sin(phi1),
                        1.0
                    );
                    const p2 = vec4(
                        center[0] + cloudRadius * Math.sin(theta2) * Math.cos(phi1),
                        center[1] + cloudRadius * 0.5 * Math.cos(theta2),
                        center[2] + cloudRadius * Math.sin(theta2) * Math.sin(phi1),
                        1.0
                    );
                    const p3 = vec4(
                        center[0] + cloudRadius * Math.sin(theta2) * Math.cos(phi2),
                        center[1] + cloudRadius * 0.5 * Math.cos(theta2),
                        center[2] + cloudRadius * Math.sin(theta2) * Math.sin(phi2),
                        1.0
                    );
                    const p4 = vec4(
                        center[0] + cloudRadius * Math.sin(theta1) * Math.cos(phi2),
                        center[1] + cloudRadius * 0.5 * Math.cos(theta1),
                        center[2] + cloudRadius * Math.sin(theta1) * Math.sin(phi2),
                        1.0
                    );

                    // Add two triangles for each quad
                    positionsArray.push(p1, p2, p3);
                    positionsArray.push(p1, p3, p4);

                    // Add the cloud color for all vertices
                    colorsArray.push(cloudColor, cloudColor, cloudColor);
                    colorsArray.push(cloudColor, cloudColor, cloudColor);
                }
            }
        }
    }

    function addSkyBox() {
        const size = 410.0; // Slightly larger than grass plane
        const yMin = -5.0;  // Lower than grass
        const yMax = 100.0; // Higher than clouds
        const skyColor = vec4(0.7, 0.85, 1.0, 1.0); // Light blue, semi-transparent

        // 8 corners of the box
        const v = [
            vec4(-size/2, yMin, -size/2, 1.0), // 0: left, bottom, back
            vec4( size/2, yMin, -size/2, 1.0), // 1: right, bottom, back
            vec4( size/2, yMax, -size/2, 1.0), // 2: right, top, back
            vec4(-size/2, yMax, -size/2, 1.0), // 3: left, top, back
            vec4(-size/2, yMin,  size/2, 1.0), // 4: left, bottom, front
            vec4( size/2, yMin,  size/2, 1.0), // 5: right, bottom, front
            vec4( size/2, yMax,  size/2, 1.0), // 6: right, top, front
            vec4(-size/2, yMax,  size/2, 1.0), // 7: left, top, front
        ];

        // Each face as two triangles
        const faces = [
            [0, 1, 2, 3], // Back
            [4, 5, 6, 7], // Front
            [0, 4, 7, 3], // Left
            [1, 5, 6, 2], // Right
            [3, 2, 6, 7], // Top
            [0, 1, 5, 4], // Bottom
        ];

        for (const f of faces) {
            positionsArray.push(v[f[0]], v[f[1]], v[f[2]]);
            positionsArray.push(v[f[0]], v[f[2]], v[f[3]]);
            colorsArray.push(skyColor, skyColor, skyColor);
            colorsArray.push(skyColor, skyColor, skyColor);
        }
    }

    var render = function () {
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        positionsArray = [];
        colorsArray = [];

        addSkyBox(); 
        addGrassPlane();
        addClouds();
        addGrayPlane();
        addRunwayMarkings();
        addSpheres(loopCenters);
        

        checkCollisions(); // Check for collisions with spheres

        // --- Stop timer when all spheres are gone ---
        if (timerStarted && loopCenters.length === 0 && endTime === 0) {
            endTime = performance.now();
            timerStarted = false;
        }
        // --------------------------------------------

        const forward = getCameraDirection();
        const right = cross(forward, up);

        // Apply acceleration when moving forward
        if (keyState[" "]) {
            velocity = add(velocity, scale(acceleration, forward)); // Accelerate forward
        }

        // Apply friction to gradually slow down
        velocity = scale(friction, velocity);

        // Update the camera position based on velocity
        eye = add(eye, velocity);

        // Skybox bounds
        const skyboxHalf = 410.0 / 2;
        const skyboxYMin = -5.0;
        const skyboxYMax = 100.0;

        // Reset camera and scene if it goes outside the skybox
        if (
            eye[0] < -skyboxHalf || eye[0] > skyboxHalf ||
            eye[1] < skyboxYMin  || eye[1] > skyboxYMax ||
            eye[2] < -skyboxHalf || eye[2] > skyboxHalf
        ) {
            eye = vec3(0.0, 5.0, 75.0); // Reset to starting position
            velocity = vec3(0.0, 0.0, 0.0); // Reset velocity
            yaw = 180.0;
            pitch = 0.0;

            // Reset spheres
            loopCenters.length = 0;
            loopCenters.push(
                vec3(15.0, 6.0, 50.0),
                vec3(-9.0, 24.0, 25.0),
                vec3(7.0, 9.0, 0.0),
                vec3(-13.0, 20.0, -32.0),
                vec3(11.0, 4.0, -60.0)
            );

            // Reset timer
            timerStarted = false;
            startTime = 0;
            endTime = 0;
        }

        // Start timer when camera first moves, but only if there are spheres left
        if (
            !timerStarted &&
            (velocity[0] !== 0 || velocity[1] !== 0 || velocity[2] !== 0) &&
            loopCenters.length > 0
        ) {
            timerStarted = true;
            startTime = performance.now();
            endTime = 0;
        }

        updateTimerDisplay();

        // Handle camera rotation with Arrow Keys
        const rotationSpeed = 2.0; // Increased rotation speed
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
        if (keyState["w"]) {
            pitch += rotationSpeed; // Increase pitch to tilt upward
            pitch = Math.min(pitch, 89.0); // Clamp pitch to avoid flipping
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