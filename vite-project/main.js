import * as THREE from 'three';
import PhysicsEngine from './system/physicsEngine.js';
import * as dat from 'dat.gui';
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

// Basic setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Cube setup
const geometry = new THREE.BoxGeometry(1, 1, 3);  
const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
const boat = new THREE.Mesh(geometry, material);
scene.add(boat);

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
camera.position.z = 5;

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

    // Render scene
    renderer.render(scene, camera);
}

animate();
