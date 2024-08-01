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
let boat;
// Basic setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);
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


//boat model
const loader = new GLTFLoader();
loader.load(
    './public/uploads_files_3556593_Clun+D.gltf',
    function (gltf) {
        // Access the loaded model
        boat = gltf.scene; // Assign the model to boat

        // Rotate the model by 45 degrees around the y-axis (optional)
        boat.rotation.x = THREE.MathUtils.degToRad(-90);
        scene.add(boat);
    }
);



// Water

const waterGeometry = new THREE.PlaneGeometry(10000, 10000);

water = new Water(
    waterGeometry,
    {
        textureWidth: 512,
        textureHeight: 512,
        waterNormals: new THREE.TextureLoader().load('./waternormals.jpg', function (texture) {

            texture.wrapS = texture.wrapT = THREE.RepeatWrapping;

        }),
        sunDirection: new THREE.Vector3(),
        sunColor: 0xffffff,
        waterColor: 0x001e0f,
        distortionScale: 3.7,
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
    elevation: 2,
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



// const gui2 = new GUI();

// const folderSky = gui2.addFolder('Sky');
// folderSky.add(parameters, 'elevation', 0, 90, 0.1).onChange(updateSun);
// folderSky.add(parameters, 'azimuth', - 180, 180, 0.1).onChange(updateSun);
// folderSky.open();

// const waterUniforms = water.material.uniforms;

// const folderWater = gui2.addFolder('Water');
// folderWater.add(waterUniforms.distortionScale, 'value', 0, 8, 0.1).name('distortionScale');
// folderWater.add(waterUniforms.size, 'value', 0.1, 10, 0.1).name('size');
// folderWater.open();

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
camera.position.z = 1000;
camera.position.y = 200;

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

    // Update wind velocity vector
    const windVelocity = new THREE.Vector3(
        params.windSpeed * Math.cos(params.windDirection),
        0,
        params.windSpeed * Math.sin(params.windDirection)
    );

    // Update physics
    physicsEngine.update(params.deltaTime, windVelocity, boat.quaternion);

    // Update boat position
    boat.position.copy(physicsEngine.position);
    control.update();

    // Update arrow helper
    arrowWindHelper.position.copy(boat.position);
    arrowWindHelper.setDirection(physicsEngine.windForceVector.clone().normalize());
    arrowWindHelper.setLength(physicsEngine.windForceVector.length() / 10); // Scale down for visualization

    // Update water resistance arrow
    arrowWaterHelper.position.copy(boat.position);
    arrowWaterHelper.setDirection(physicsEngine.waterResistanceVector.clone().normalize());
    arrowWaterHelper.setLength(physicsEngine.waterResistanceVector.length() / 10); // Scale down for visualization

    // Update wind force magnitude display
    windForceMagnitude.force = physicsEngine.windForceVector.length();
    water.material.uniforms['time'].value += 1.0 / 60.0;

    // Render scene
    renderer.render(scene, camera);
    stats.update();
}

animate();
