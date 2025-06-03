var perspectiveExample3D = function () {
    "use strict";

    let canvas, gl, program;
    let positionsArray = [];
    let colorsArray = [];

    const near = 0.3;
    const far = 500.0;
    const fovy = 45.0;
    let aspect = 1.0;

    let modelViewMatrix, projectionMatrix;
    let modelViewMatrixLoc, projectionMatrixLoc;
    let eye = vec3(0.0, 5.0, 75.0);
    let at = vec3(0.0, 1.0, 0.0);
    const up = vec3(0.0, 1.0, 0.0);

    let yaw = 180.0, pitch = 0.0, roll = 0.0;
    const keyState = {};

    let timerStarted = false, startTime = 0, endTime = 0;
    let forward = vec3(0.0, 0.0, -1.0);

    let velocity = vec3(0.0, 0.0, 0.0);
    const acceleration = 0.01, friction = 0.98;
    const collisionRadius = 3.0;

    const loopCenters = [
        vec3(15.0, 6.0, 50.0),
        vec3(-9.0, 24.0, 25.0),
        vec3(7.0, 9.0, 0.0),
        vec3(-13.0, 20.0, -32.0),
        vec3(11.0, 4.0, -60.0)
    ];

    // Buffers for positions and colors (created once)
    let cBuffer, vBuffer;

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

        // Create buffers ONCE
        cBuffer = gl.createBuffer();
        vBuffer = gl.createBuffer();

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

    window.addEventListener("keydown", e => keyState[e.key] = true);
    window.addEventListener("keyup", e => keyState[e.key] = false);

    function getCameraUp(forward) {
        const upVec = vec3(0.0, 1.0, 0.0);
        const right = cross(forward, upVec);
        const rollRad = radians(roll);
        const upRotated = add(
            scale(Math.cos(rollRad), upVec),
            scale(Math.sin(rollRad), right)
        );
        return normalize(upRotated);
    }

    function getCameraRight(forward, upVec) {
        return normalize(cross(upVec, forward));
    }

    function addSpheres(activeCenters) {
        const sphereRadius = 2.0, latitudeSegments = 18, longitudeSegments = 36;
        const sphereColor = vec4(1.0, 1.0, 0.0, 1.0);
        for (const center of activeCenters) {
            for (let lat = 0; lat < latitudeSegments; lat++) {
                const theta1 = (lat / latitudeSegments) * Math.PI;
                const theta2 = ((lat + 1) / latitudeSegments) * Math.PI;
                for (let lon = 0; lon < longitudeSegments; lon++) {
                    const phi1 = (lon / longitudeSegments) * 2 * Math.PI;
                    const phi2 = ((lon + 1) / longitudeSegments) * 2 * Math.PI;
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
                    positionsArray.push(p1, p2, p3, p1, p3, p4);
                    colorsArray.push(sphereColor, sphereColor, sphereColor, sphereColor, sphereColor, sphereColor);
                }
            }
        }
    }

    function checkCollisions() {
        for (let i = loopCenters.length - 1; i >= 0; i--) {
            const loopCenter = loopCenters[i];
            const distance = length(subtract(eye, loopCenter));
            if (distance < collisionRadius) {
                loopCenters.splice(i, 1);
            }
        }
    }

    function addGrayPlane() {
        const planeLength = 350.0, planeWidth = 40.0, y = 0.5;
        const planeColor = vec4(0.5, 0.5, 0.5, 1.0);
        const vertices = [
            vec4(-planeWidth / 2, y, -planeLength / 2, 1.0),
            vec4(planeWidth / 2, y, -planeLength / 2, 1.0),
            vec4(planeWidth / 2, y, planeLength / 2, 1.0),
            vec4(-planeWidth / 2, y, planeLength / 2, 1.0),
        ];
        positionsArray.push(vertices[0], vertices[1], vertices[2], vertices[0], vertices[2], vertices[3]);
        colorsArray.push(planeColor, planeColor, planeColor, planeColor, planeColor, planeColor);
    }

    function addRunwayMarkings() {
        const planeLength = 350.0, planeWidth = 40.0, dashLength = 5.0, dashWidth = 1.0, sideLineWidth = 0.5, sideOffset = 2.0;
        const yellowColor = vec4(1.0, 1.0, 0.0, 1.0), whiteColor = vec4(1.0, 1.0, 1.0, 1.0);
        const markingY = 0.51;
        for (let z = -planeLength / 2; z < planeLength / 2; z += dashLength * 2) {
            const vertices = [
                vec4(-dashWidth / 2, markingY, z, 1.0),
                vec4(dashWidth / 2, markingY, z, 1.0),
                vec4(dashWidth / 2, markingY, z + dashLength, 1.0),
                vec4(-dashWidth / 2, markingY, z + dashLength, 1.0),
            ];
            positionsArray.push(vertices[0], vertices[1], vertices[2], vertices[0], vertices[2], vertices[3]);
            colorsArray.push(yellowColor, yellowColor, yellowColor, yellowColor, yellowColor, yellowColor);
        }
        const sideLineZStart = -planeLength / 2, sideLineZEnd = planeLength / 2;
        const leftVertices = [
            vec4(-planeWidth / 2 + sideOffset, markingY, sideLineZStart, 1.0),
            vec4(-planeWidth / 2 + sideOffset + sideLineWidth, markingY, sideLineZStart, 1.0),
            vec4(-planeWidth / 2 + sideOffset + sideLineWidth, markingY, sideLineZEnd, 1.0),
            vec4(-planeWidth / 2 + sideOffset, markingY, sideLineZEnd, 1.0),
        ];
        positionsArray.push(leftVertices[0], leftVertices[1], leftVertices[2], leftVertices[0], leftVertices[2], leftVertices[3]);
        colorsArray.push(whiteColor, whiteColor, whiteColor, whiteColor, whiteColor, whiteColor);
        const rightVertices = [
            vec4(planeWidth / 2 - sideOffset, markingY, sideLineZStart, 1.0),
            vec4(planeWidth / 2 - sideOffset - sideLineWidth, markingY, sideLineZStart, 1.0),
            vec4(planeWidth / 2 - sideOffset - sideLineWidth, markingY, sideLineZEnd, 1.0),
            vec4(planeWidth / 2 - sideOffset, markingY, sideLineZEnd, 1.0),
        ];
        positionsArray.push(rightVertices[0], rightVertices[1], rightVertices[2], rightVertices[0], rightVertices[2], rightVertices[3]);
        colorsArray.push(whiteColor, whiteColor, whiteColor, whiteColor, whiteColor, whiteColor);
    }

    function addGrassPlane() {
        const grassSize = 400.0, y = -0.5;
        const grassColor = vec4(0.2, 0.8, 0.2, 1.0);
        const vertices = [
            vec4(-grassSize / 2, y, -grassSize / 2, 1.0),
            vec4(grassSize / 2, y, -grassSize / 2, 1.0),
            vec4(grassSize / 2, y, grassSize / 2, 1.0),
            vec4(-grassSize / 2, y, grassSize / 2, 1.0),
        ];
        positionsArray.push(vertices[0], vertices[1], vertices[2], vertices[0], vertices[2], vertices[3]);
        colorsArray.push(grassColor, grassColor, grassColor, grassColor, grassColor, grassColor);
    }

    function updateTimerDisplay() {
        const timerDiv = document.getElementById("timer");
        let elapsed = 0;
        if (timerStarted) elapsed = ((performance.now() - startTime) / 1000);
        else if (endTime > 0) elapsed = ((endTime - startTime) / 1000);
        timerDiv.textContent = "Time: " + elapsed.toFixed(2) + "s";
    }

    function addClouds() {
        const cloudCenters = [
            vec3(-50, 60, 0), vec3(0, 60, 40), vec3(40, 60, -30),
            vec3(-30, 60, 60), vec3(60, 60, 20), vec3(20, 60, -60)
        ];
        const cloudColor = vec4(0.0, 0.0, 0.0, 0.6), cloudRadius = 15.0;
        const latitudeSegments = 12, longitudeSegments = 24;
        for (const center of cloudCenters) {
            for (let lat = 0; lat < latitudeSegments; lat++) {
                const theta1 = (lat / latitudeSegments) * Math.PI;
                const theta2 = ((lat + 1) / latitudeSegments) * Math.PI;
                for (let lon = 0; lon < longitudeSegments; lon++) {
                    const phi1 = (lon / longitudeSegments) * 2 * Math.PI;
                    const phi2 = ((lon + 1) / longitudeSegments) * 2 * Math.PI;
                    const p1 = vec4(
                        center[0] + cloudRadius * Math.sin(theta1) * Math.cos(phi1),
                        center[1] + cloudRadius * 0.5 * Math.cos(theta1),
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
                    positionsArray.push(p1, p2, p3, p1, p3, p4);
                    colorsArray.push(cloudColor, cloudColor, cloudColor, cloudColor, cloudColor, cloudColor);
                }
            }
        }
    }

    function addSkyBox() {
        const size = 410.0, yMin = -5.0, yMax = 100.0;
        const skyColor = vec4(0.7, 0.85, 1.0, 1.0);
        const v = [
            vec4(-size/2, yMin, -size/2, 1.0), vec4(size/2, yMin, -size/2, 1.0),
            vec4(size/2, yMax, -size/2, 1.0), vec4(-size/2, yMax, -size/2, 1.0),
            vec4(-size/2, yMin, size/2, 1.0), vec4(size/2, yMin, size/2, 1.0),
            vec4(size/2, yMax, size/2, 1.0), vec4(-size/2, yMax, size/2, 1.0),
        ];
        const faces = [
            [0, 1, 2, 3], [4, 5, 6, 7], [0, 4, 7, 3],
            [1, 5, 6, 2], [3, 2, 6, 7], [0, 1, 5, 4],
        ];
        for (const f of faces) {
            positionsArray.push(v[f[0]], v[f[1]], v[f[2]], v[f[0]], v[f[2]], v[f[3]]);
            colorsArray.push(skyColor, skyColor, skyColor, skyColor, skyColor, skyColor);
        }
    }

    function addRing(center, normal, radius = 4.0, tubeRadius = 0.5, segments = 48, tubeSegments = 12, color = vec4(1.0, 0.0, 0.0, 1.0)) {
        const up = Math.abs(normal[1]) > 0.99 ? vec3(1,0,0) : vec3(0,1,0);
        const tangent = normalize(cross(normal, up));
        const bitangent = normalize(cross(normal, tangent));
        function torusPoint(theta, phi) {
            const circle = add(
                scale(Math.cos(theta), tangent),
                scale(Math.sin(theta), bitangent)
            );
            const tube = add(
                scale(Math.cos(phi), circle),
                scale(Math.sin(phi), normal)
            );
            return add(center, add(scale(radius, circle), scale(tubeRadius, tube)));
        }
        for (let i = 0; i < segments; ++i) {
            const theta1 = (i / segments) * 2 * Math.PI;
            const theta2 = ((i + 1) / segments) * 2 * Math.PI;
            for (let j = 0; j < tubeSegments; ++j) {
                const phi1 = (j / tubeSegments) * 2 * Math.PI;
                const phi2 = ((j + 1) / tubeSegments) * 2 * Math.PI;
                const p1 = torusPoint(theta1, phi1);
                const p2 = torusPoint(theta2, phi1);
                const p3 = torusPoint(theta2, phi2);
                const p4 = torusPoint(theta1, phi2);
                positionsArray.push(p1, p2, p3, p1, p3, p4);
                colorsArray.push(color, color, color, color, color, color);
            }
        }
    }

    function addPaperAirplane(pos, forward, up) {
        const right = normalize(cross(forward, up));
        const nose = add(pos, scale(6.0, forward));
        const leftWing = add(pos, add(scale(-3.0, forward), scale(3.0, right)));
        const rightWing = add(pos, add(scale(-3.0, forward), scale(-3.0, right)));
        const color = vec4(1.0, 0.0, 0.0, 1.0); // Bright red for visibility

        positionsArray.push(nose, leftWing, rightWing);
        colorsArray.push(color, color, color);
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

        // Add visible, large, red rings for clarity
        addRing(vec3(0, 8, 40), vec3(0, 1, 0), 6.0, 1.0, 48, 16, vec4(1.0, 0.0, 0.0, 1.0));
        addRing(vec3(-15, 12, 0), vec3(0, 0, 1), 6.0, 1.0, 48, 16, vec4(0.0, 1.0, 0.0, 1.0));
        addRing(vec3(20, 20, -30), vec3(1, 0, 0), 6.0, 1.0, 48, 16, vec4(0.0, 0.0, 1.0, 1.0));

        // Place the paper airplane 8 units in front of the camera
        const airplaneDistance = 4.0;
        const airplanePos = add(eye, scale(airplaneDistance, normalize(forward)));
        const airplaneForward = normalize(forward);
        const airplaneUp = normalize(getCameraUp(forward));
        addPaperAirplane(airplanePos, airplaneForward, airplaneUp);

        checkCollisions();

        if (timerStarted && loopCenters.length === 0 && endTime === 0) {
            endTime = performance.now();
            timerStarted = false;
        }

        // Camera movement
        if (keyState[" "]) velocity = add(velocity, scale(acceleration, forward));
        velocity = scale(friction, velocity);
        eye = add(eye, velocity);

        // Skybox bounds and reset
        const skyboxHalf = 410.0 / 2, skyboxYMin = -5.0, skyboxYMax = 100.0;
        if (
            eye[0] < -skyboxHalf || eye[0] > skyboxHalf ||
            eye[1] < skyboxYMin  || eye[1] > skyboxYMax ||
            eye[2] < -skyboxHalf || eye[2] > skyboxHalf
        ) {
            eye = vec3(0.0, 5.0, 75.0);
            forward = vec3(0.0, 0.0, -1.0);
            roll = 0.0; pitch = 0.0; yaw = 180.0;
            loopCenters.length = 0;
            loopCenters.push(
                vec3(15.0, 6.0, 50.0), vec3(-9.0, 24.0, 25.0),
                vec3(7.0, 9.0, 0.0), vec3(-13.0, 20.0, -32.0), vec3(11.0, 4.0, -60.0)
            );
            timerStarted = false; startTime = 0; endTime = 0;
        }

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

        // Camera rotation
        const rotationSpeed = 2.0;
        let upVec = getCameraUp(forward);
        if (keyState["w"]) {
            let angle = radians(rotationSpeed);
            forward = normalize(
                add(
                    scale(Math.cos(angle), forward),
                    scale(Math.sin(angle), upVec)
                )
            );
        }
        if (keyState["s"]) {
            let angle = radians(-rotationSpeed);
            forward = normalize(
                add(
                    scale(Math.cos(angle), forward),
                    scale(Math.sin(angle), upVec)
                )
            );
        }
        const rollSpeed = 2.0;
        if (keyState["a"]) roll -= rollSpeed;
        if (keyState["d"]) roll += rollSpeed;

        // Update look-at point and matrices
        at = add(eye, forward);
        modelViewMatrix = lookAt(eye, at, getCameraUp(forward));
        projectionMatrix = perspective(fovy, aspect, near, far);

        gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(modelViewMatrix));
        gl.uniformMatrix4fv(projectionMatrixLoc, false, flatten(projectionMatrix));

        // Use the same buffers every frame, just update data
        gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, flatten(colorsArray), gl.DYNAMIC_DRAW);
        const colorLoc = gl.getAttribLocation(program, "aColor");
        gl.vertexAttribPointer(colorLoc, 4, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(colorLoc);

        gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, flatten(positionsArray), gl.DYNAMIC_DRAW);
        const positionLoc = gl.getAttribLocation(program, "aPosition");
        gl.vertexAttribPointer(positionLoc, 4, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(positionLoc);

        gl.drawArrays(gl.TRIANGLES, 0, positionsArray.length);
        requestAnimationFrame(render);
    };
};

perspectiveExample3D();