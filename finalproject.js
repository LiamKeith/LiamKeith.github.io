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


    const loopCenters = [
        vec3(10.0, 3.0, 10.0),  // Center of the first loop
        vec3(2.0, 6.0, 0.0),  // Center of the second loop
        vec3(-2.0, 9.0, 0.0), // Center of the third loop
        vec3(0.0, 12.0, 2.0), // Center of the fourth loop
        vec3(0.0, 15.0, -2.0) // Center of the fifth loop
    ];


    function addSpheres(activeCenters) {
        const sphereRadius = 2.0; // Radius of the sphere
        const latitudeSegments = 18; // Number of segments along the latitude
        const longitudeSegments = 36; // Number of segments along the longitude

        console.log("Rendering spheres with centers:", activeCenters);

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

        console.log("Positions array length:", positionsArray.length);
        console.log("Colors array length:", colorsArray.length);
    }

    let velocity = vec3(0.0, 0.0, 0.0); // Initialize velocity
    const acceleration = 0.005; // Acceleration when moving forward
    const friction = 0.98; // Friction to slow down when no key is pressed

    const collisionRadius = 3.0; // Larger collision radius for the spheres

    function checkCollisions() {
        for (let i = loopCenters.length - 1; i >= 0; i--) {
            const loopCenter = loopCenters[i];
            const distance = length(subtract(eye, loopCenter)); // Distance from the camera to the sphere center

            // Check if the camera is within the collision radius
            if (distance < collisionRadius) {
                console.log(`Collision detected with sphere at index ${i}`);
                loopCenters.splice(i, 1); // Remove the sphere from the array
            }
        }
    }

    function addGrayPlane() {
        const planeLength = 350.0; // Increased length of the plane along the Z-axis
        const planeWidth = 40.0;  // Width of the plane
        const planeColor = vec4(0.5, 0.5, 0.5, 1.0); // Gray color

        const vertices = [
            vec4(-planeWidth / 2, 0.0, -planeLength / 2, 1.0), // Bottom-left
            vec4(planeWidth / 2, 0.0, -planeLength / 2, 1.0),  // Bottom-right
            vec4(planeWidth / 2, 0.0, planeLength / 2, 1.0),   // Top-right
            vec4(-planeWidth / 2, 0.0, planeLength / 2, 1.0),  // Top-left
        ];

        // Add two triangles to form the plane
        positionsArray.push(vertices[0], vertices[1], vertices[2]);
        positionsArray.push(vertices[0], vertices[2], vertices[3]);

        // Add the gray color for all vertices
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

        // Add yellow dashes to the center of the runway
        for (let z = -planeLength / 2; z < planeLength / 2; z += dashLength * 2) {
            const vertices = [
                vec4(-dashWidth / 2, 0.01, z, 1.0), // Bottom-left
                vec4(dashWidth / 2, 0.01, z, 1.0),  // Bottom-right
                vec4(dashWidth / 2, 0.01, z + dashLength, 1.0), // Top-right
                vec4(-dashWidth / 2, 0.01, z + dashLength, 1.0), // Top-left
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
            vec4(-planeWidth / 2 + sideOffset, 0.01, sideLineZStart, 1.0), // Bottom-left
            vec4(-planeWidth / 2 + sideOffset + sideLineWidth, 0.01, sideLineZStart, 1.0), // Bottom-right
            vec4(-planeWidth / 2 + sideOffset + sideLineWidth, 0.01, sideLineZEnd, 1.0), // Top-right
            vec4(-planeWidth / 2 + sideOffset, 0.01, sideLineZEnd, 1.0), // Top-left
        ];

        positionsArray.push(leftVertices[0], leftVertices[1], leftVertices[2]);
        positionsArray.push(leftVertices[0], leftVertices[2], leftVertices[3]);

        colorsArray.push(whiteColor, whiteColor, whiteColor);
        colorsArray.push(whiteColor, whiteColor, whiteColor);

        // Right side line
        const rightVertices = [
            vec4(planeWidth / 2 - sideOffset, 0.01, sideLineZStart, 1.0), // Bottom-left
            vec4(planeWidth / 2 - sideOffset - sideLineWidth, 0.01, sideLineZStart, 1.0), // Bottom-right
            vec4(planeWidth / 2 - sideOffset - sideLineWidth, 0.01, sideLineZEnd, 1.0), // Top-right
            vec4(planeWidth / 2 - sideOffset, 0.01, sideLineZEnd, 1.0), // Top-left
        ];

        positionsArray.push(rightVertices[0], rightVertices[1], rightVertices[2]);
        positionsArray.push(rightVertices[0], rightVertices[2], rightVertices[3]);

        colorsArray.push(whiteColor, whiteColor, whiteColor);
        colorsArray.push(whiteColor, whiteColor, whiteColor);
    }

    var render = function () {
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        positionsArray = [];
        colorsArray = [];

        addGrayPlane(); // Add the long gray plane
        addRunwayMarkings(); // Add yellow dashes and white side lines
        addSpheres(loopCenters); // Add the spheres with updated centers

        checkCollisions(); // Check for collisions with spheres

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