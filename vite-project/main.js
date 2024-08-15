import * as THREE from "three";
import PhysicsEngine from "./system/physicsEngine.js";
import * as dat from "dat.gui";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { Water } from "three/addons/objects/Water.js";
import { Sky } from "three/addons/objects/Sky.js";
import Stats from "three/addons/libs/stats.module.js";
import params from "./system/gui.js"; 
import { gravityForce } from './system/forces.js';
import { buoyancyForce } from './system/forces.js';
import { rudderRotate } from './system/forces.js';
import { calculateDC } from './system/forces.js';
import { calculateLC } from './system/forces.js';
import { calculateWaterResistance } from './system/forces.js';
//vars
let stats;
let water, sun;
let boat, sail;
let boatDirection = new THREE.Vector3();
let sailDirection = new THREE.Vector3();
let rudderDirection = new THREE.Vector3();

// Basic setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.z = 4;
camera.position.y = 2;
const renderer = new THREE.WebGLRenderer();
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.5;
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

//sun
sun = new THREE.Vector3();
const loader = new GLTFLoader();
loader.load("./public/untitled4.gltf", function (gltf) {
  boat = gltf.scene;
  sail = boat.children[1].children[3].children[0];
 
  
  boat.position.y += 300
  scene.add(boat);
  animate();
});

function rotateSail(angle) {
  if (sail) {
    // Create a new quaternion representing the desired rotation
    const sailQuaternion = new THREE.Quaternion();
    sailQuaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), angle);

    // Set the sail's rotation to the new quaternion directly
    sail.setRotationFromQuaternion(sailQuaternion);
  }
}

function onKeyDown(event) {
  switch (event.key) {
    case "ArrowLeft":
      rotateSail(-1);
      break;
    case "ArrowRight":
      rotateSail(1);
      break;
  }
}

document.addEventListener("keydown", onKeyDown);
// Water
const waterGeometry = new THREE.PlaneGeometry(10000, 10000);
water = new Water(waterGeometry, {
  textureWidth: 1024,
  textureHeight: 1024,
  waterNormals: new THREE.TextureLoader().load(
    "./waternormals.jpg",
    function (texture) {
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    }
  ),
  sunDirection: new THREE.Vector3(),
  sunColor: 0xffffff,
  waterColor: 0x001e0f,
  distortionScale: 10,
  fog: scene.fog !== undefined,
});

water.rotation.x = -Math.PI / 2;

scene.add(water);

// Skybox

const sky = new Sky();
sky.scale.setScalar(10000);
scene.add(sky);

const skyUniforms = sky.material.uniforms;

skyUniforms["turbidity"].value = 10;
skyUniforms["rayleigh"].value = 2;
skyUniforms["mieCoefficient"].value = 0.005;
skyUniforms["mieDirectionalG"].value = 0.8;

const pmremGenerator = new THREE.PMREMGenerator(renderer);
const sceneEnv = new THREE.Scene();
let renderTarget;
function updateSun() {
  const phi = THREE.MathUtils.degToRad(90 - params.elevation);
  const theta = THREE.MathUtils.degToRad(params.azimuth);
  sun.setFromSphericalCoords(1, phi, theta);
  sky.material.uniforms["sunPosition"].value.copy(sun);
  water.material.uniforms["sunDirection"].value.copy(sun).normalize();
  if (renderTarget !== undefined) renderTarget.dispose();
  sceneEnv.add(sky);
  renderTarget = pmremGenerator.fromScene(sceneEnv);
  scene.add(sky);
  scene.environment = renderTarget.texture;
}

updateSun();

window.addEventListener("resize", onWindowResize);

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
//------------------------------------------------------##########################---------------------------------------------------//

// GUI setup
const gui = new dat.GUI();

const waterUniforms = water.material.uniforms;
const boatGui = gui.addFolder("Boat");
boatGui.add(params, "mass", 1, 2000);
boatGui.add(params, "windSpeed", 0, 20);
boatGui.add(params, "sailAspectRatio", 0, 10);
boatGui.add(params, "deltaTime", 0.0, 0.1);
boatGui.add(params, "rho", 0.0, 2.0);
// boatGui.add(params, "rudderAngle", -Math.PI/4, Math.PI/4, 0.001).onChange(() => {
//   const yawAngle = rudderRotate(params.rudderAngle, params.sailAngle);
//   const boatQuaternion = new THREE.Quaternion();
//   boatQuaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), yawAngle);
//   boat.setRotationFromQuaternion(boatQuaternion);
//   boatDirection = new THREE.Vector3(1, 0, 0).applyQuaternion(boat.quaternion);
//   const BoatDirectionArrowHelper = new THREE.ArrowHelper(
//     boatDirection.clone().normalize(),
//     new THREE.Vector3(0, 0, 0),
//     1,
//     0x00ff00
//   );
//   scene.add(BoatDirectionArrowHelper);
// });
boatGui.add(params, "rudderAngle", -Math.PI / 2, Math.PI / 2, 0.001).onChange(() => {
  
});
boatGui
  .add(params, "sailAngle", -Math.PI / 2, Math.PI / 2, 0.001)
  .onChange(() => {
    rotateSail(params.sailAngle);
    // Create initial direction vector (boat direction)
    const initialDirection = new THREE.Vector3(1, 0, 0);

    // Apply the quaternion to the initial direction vector to get the new boat direction
    boatDirection = initialDirection.clone().applyQuaternion(boat.quaternion);

    // Create and add new ArrowHelper for the boat's new direction
    const BoatDirectionArrowHelper = new THREE.ArrowHelper(
      boatDirection.clone().normalize(),
      new THREE.Vector3(0, 0, 0),
      1,
      0x00ff00
    );
    scene.add(BoatDirectionArrowHelper);

    // Calculate sail direction based on the angle
    sailDirection = new THREE.Vector3(
      Math.cos(params.sailAngle),
      0,
      Math.sin(params.sailAngle)
    );

    // Rotate sail direction around the y-axis by the boat's angle
    sailDirection.applyQuaternion(boat.quaternion);

  
  });
boatGui.add(params, 'AR', 0.01, 2.0).onChange(() => {
  const boatVelocity = 10;
  const totalForce = calculateWaterResistance(boatVelocity, params.AR);
}); 
const sunGui = gui.addFolder("Sun");
sunGui.add(params, "elevation", 0, 90, 0.1).onChange(updateSun);
sunGui.add(params, "azimuth", -180, 180, 0.1).onChange(updateSun);
gui
  .add(waterUniforms.distortionScale, "value", 0, 8, 0.1)
  .name("distortionScale");
gui.add(waterUniforms.size, "value", 0.1, 10, 0.1).name("size");

const physicsEngine = new PhysicsEngine();
// Display the calculated wind force magnitude
const windForceMagnitude = { force: 0 };
gui.add(windForceMagnitude, "force").listen();

//
const axesHelper = new THREE.AxesHelper(50);
scene.add(axesHelper);
// Control
let control = new OrbitControls(camera, renderer.domElement);


// Animation loop
function animate() {
  requestAnimationFrame(animate);

  const windVelocity = new THREE.Vector3(params.windSpeed, 0, 0);
  //Update physics
  physicsEngine.update(
    params.deltaTime,
    windVelocity,
    boatDirection,
    sailDirection,
    boat,
    params.rudderAngle
  );

  //Update boat position
  boat.position.copy(physicsEngine.position);

  //  Update arrow helper
  arrowWindHelper.position.y = 10;
  arrowWindHelper.setDirection(windVelocity.clone().normalize());

  //Update water resistance arrow
  arrowWaterHelper.position.copy(boat.position);
  arrowWaterHelper.setDirection(
    physicsEngine.waterResistanceVector.clone().normalize()
  );
  arrowWaterHelper.setLength(physicsEngine.waterResistanceVector.length() / 10); // Scale down for visualization

  //Update wind force magnitude display

  windForceMagnitude.force = physicsEngine.windForceVector.length();
  water.material.uniforms["time"].value += 1.0 / 60.0;

  //boat.rotation.y += 0.1;

  //OrbitControl update
  control.update();
  // Render scene
  renderer.render(scene, camera);

  stats.update();
}
