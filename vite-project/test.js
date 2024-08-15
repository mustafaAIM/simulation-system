import { windForce } from './system/forces.js';
import * as THREE from 'three';

// Mock scene object
const mockScene = {
  add: () => {} // mock add method
};


const boatVelocity = new THREE.Vector3(0, 0, 0);
const windVelocity = new THREE.Vector3(0, 0, 10);
const angleOfAttack = 90 * (Math.PI / 180);
const params = {
  rho: 1.225,
  Area: 18.25,
  sailAspectRatio: 2
};
// Test case 1
const result1 = windForce(
    boatVelocity,
    windVelocity,
    angleOfAttack,
    params,
  mockScene
);

console.log("Case 1 result:", result1);