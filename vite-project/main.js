import * as THREE from 'three';
import PhysicsEngine from './system/physicsEngine.js';
import * as dat from 'dat.gui';
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Water } from 'three/addons/objects/Water.js';
import { Sky } from 'three/addons/objects/Sky.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import Stats from 'three/addons/libs/stats.module.js';


let stats;
let controls, water, sun;
let boat, sail1, sail2, sail3, sail4, sail5, sailGroup, boom;
// Basic setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 10000);
camera.position.z = 400;
camera.position.y = 200;
const renderer = new THREE.WebGLRenderer();
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.5;
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Cube setup
// const geometry = new THREE.BoxGeometry(1, 1, 3);  
// const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
// boat = new THREE.Mesh(geometry, material);
// scene.add(boat);

//sun
sun = new THREE.Vector3();
// let axesHelper = new THREE.AxesHelper(1000);
let axesHelper1, pivotHelper;
let pivotPoint = new THREE.Vector3();
// scene.add(axesHelper);
//boat model
const loader = new GLTFLoader();
loader.load(
    './public/uploads_files_3556593_Clun+D.gltf',
    function (gltf) {
        boat = gltf.scene;
        console.log(boat);

        boat.children[1].children[4].children[1].children[0].material.side = THREE.DoubleSide
        // Create a single group for all sail parts
        sailGroup = new THREE.Group();
        
        // Find the boom
        boom = boat.children[1].children[5];
        boom.position.x += -10;
        boom.rotation.y = THREE.MathUtils.degToRad(2);
        boom.getWorldPosition(pivotPoint);

        // Add all sail parts to the group
        const sailParts = [
            boat.children[1].children[4].children[0].children[0],
            boat.children[1].children[2].children[1],
            boat.children[1].children[2].children[0],
            boat.children[1].children[0].children[9],
        ];

        sailParts.forEach(part => {
            // Remove the part from its current parent
            part.parent.remove(part);
            // Add the part to the sail group
            sailGroup.add(part);

            // Set material properties
            if (part.material) {
                part.material.side = THREE.DoubleSide;
            }
        });

        // Parent the sail group to the boom
        boom.add(sailGroup);


        boat.rotation.x = THREE.MathUtils.degToRad(-90);

        scene.add(boat);
        addHelpers();
    }
);

function rotateSail(angle) {
    if (sailGroup) {
        sailGroup.rotation.z += angle;
        // Update helpers
        axesHelper1.position.copy(pivotPoint);
        pivotHelper.position.copy(pivotPoint);  // Changed from z to y axis
    }
}

function addHelpers() {
    // Axes helper
    axesHelper1 = new THREE.AxesHelper(5);
    axesHelper1.position.copy(pivotPoint);
    scene.add(axesHelper1);

    // Pivot point helper
    const geometry = new THREE.SphereGeometry(0.1);
    const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    pivotHelper = new THREE.Mesh(geometry, material);
    pivotHelper.position.copy(pivotPoint);
    // scene.add(pivotHelper);
    axesHelper1.scale.set(1000, 1000, 1000); // Make the axes smaller
    pivotHelper.scale.set(1000, 1000, 1000);
}
function onKeyDown(event) {
    switch (event.key) {
        case 'ArrowLeft':
            rotateSail(-0.1);
            break;
        case 'ArrowRight':
            rotateSail(0.1);
            break;
    }
}
document.addEventListener('keydown', onKeyDown);
// Water

const waterGeometry = new THREE.PlaneGeometry(10000, 10000);

water = new Water(
    waterGeometry,
    {
        textureWidth: 1024,
        textureHeight: 1024,
        waterNormals: new THREE.TextureLoader().load('./waternormals.jpg', function (texture) {

            texture.wrapS = texture.wrapT = THREE.RepeatWrapping;

        }),
        sunDirection: new THREE.Vector3(),
        sunColor: 0xffffff,
        waterColor: 0x001e0f,
        distortionScale: 10,

        fog: scene.fog !== undefined
    }
);

water.rotation.x = - Math.PI / 2;

scene.add(water);


// Skybox

const sky = new Sky();
sky.scale.setScalar(10000);
scene.add(sky);



const skyUniforms = sky.material.uniforms;

skyUniforms['turbidity'].value = 10;
skyUniforms['rayleigh'].value = 2;
skyUniforms['mieCoefficient'].value = 0.005;
skyUniforms['mieDirectionalG'].value = 0.8;

const parameters = {
    elevation: 6.8,
    azimuth: 180
};

const pmremGenerator = new THREE.PMREMGenerator(renderer);
const sceneEnv = new THREE.Scene();

let renderTarget;

function updateSun() {

    const phi = THREE.MathUtils.degToRad(90 - parameters.elevation);
    const theta = THREE.MathUtils.degToRad(parameters.azimuth);

    sun.setFromSphericalCoords(1, phi, theta);

    sky.material.uniforms['sunPosition'].value.copy(sun);
    water.material.uniforms['sunDirection'].value.copy(sun).normalize();

    if (renderTarget !== undefined) renderTarget.dispose();

    sceneEnv.add(sky);
    renderTarget = pmremGenerator.fromScene(sceneEnv);
    scene.add(sky);

    scene.environment = renderTarget.texture;

}

updateSun();



const gui2 = new GUI();

const folderSky = gui2.addFolder('Sky');
folderSky.add(parameters, 'elevation', 0, 90, 0.1).onChange(updateSun);
folderSky.add(parameters, 'azimuth', - 180, 180, 0.1).onChange(updateSun);
folderSky.open();

const waterUniforms = water.material.uniforms;

const folderWater = gui2.addFolder('Water');
folderWater.add(waterUniforms.distortionScale, 'value', 0, 8, 0.1).name('distortionScale');
folderWater.add(waterUniforms.size, 'value', 0.1, 10, 0.1).name('size');
folderWater.open();

//

window.addEventListener('resize', onWindowResize);



stats = new Stats();
document.body.appendChild(stats.dom);


function onWindowResize() {

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);

}



// Arrow helper setup for wind force
const arrowWindHelper = new THREE.ArrowHelper(
    new THREE.Vector3(0, 0, -1),
    new THREE.Vector3(0, 0, 0),
    2,
    0xff0000
);
const arrowWaterHelper = new THREE.ArrowHelper(
    new THREE.Vector3(0, 0, -1),
    new THREE.Vector3(0, 0, 0),
    2,
    0xff1110
);
scene.add(arrowWindHelper);
scene.add(arrowWaterHelper);


// Physics engine setup
const mass = 145; // Mass of the boat in kg
const sailAspectRatio = 2; // Aspect ratio of the sail
const physicsEngine = new PhysicsEngine(mass, sailAspectRatio);

// GUI setup
const gui = new dat.GUI();
const params = {
    windSpeed: 10,
    windDirection: 0, // Angle in radians
    deltaTime: 0.016
};

gui.add(params, 'windSpeed', 0, 20);
gui.add(params, 'windDirection', 0, 2 * Math.PI);
gui.add(params, 'deltaTime', 0.000, 0.1);

// Display the calculated wind force magnitude
const windForceMagnitude = { force: 0 };
gui.add(windForceMagnitude, 'force').listen();

// Control 
let control = new OrbitControls(camera, renderer.domElement);

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    if (axesHelper1 && pivotHelper && boat) {
        axesHelper1.quaternion.copy(boat.quaternion);
        pivotHelper.quaternion.copy(boat.quaternion);
    }
    // Update wind velocity vector
    // const windVelocity = new THREE.Vector3(
    //     params.windSpeed * Math.cos(params.windDirection),
    //     0,
    //     params.windSpeed * Math.sin(params.windDirection)
    // );

    // Update physics
    // physicsEngine.update(params.deltaTime, windVelocity, boat.quaternion);

    // Update boat position
    // boat.position.copy(physicsEngine.position);
    // control.update();

    // Update arrow helper
    // arrowWindHelper.position.copy(boat.position);
    // arrowWindHelper.setDirection(physicsEngine.windForceVector.clone().normalize());
    // arrowWindHelper.setLength(physicsEngine.windForceVector.length() / 10); // Scale down for visualization

    // Update water resistance arrow
    // arrowWaterHelper.position.copy(boat.position);
    // arrowWaterHelper.setDirection(physicsEngine.waterResistanceVector.clone().normalize());
    // arrowWaterHelper.setLength(physicsEngine.waterResistanceVector.length() / 10); // Scale down for visualization

    // Update wind force magnitude display
    // windForceMagnitude.force = physicsEngine.windForceVector.length();
    // water.material.uniforms['time'].value += 1.0 / 60.0;

    // Render scene
    renderer.render(scene, camera);
    stats.update();
}

animate();
