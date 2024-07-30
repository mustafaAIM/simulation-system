import * as THREE from "three";
import {
  windForce,
  waterResistance,
  gravityForce,
  buoyancyForce,
} from "./forces.js";

class PhysicsEngine {
    constructor(mass, sailAspectRatio) {
        this.mass = mass;
        this.sailAspectRatio = sailAspectRatio;
        this.velocity = new THREE.Vector3();
        this.position = new THREE.Vector3();
        this.windForceVector = new THREE.Vector3();
        this.waterResistanceVector = new THREE.Vector3();
    }

    update(deltaTime, windVelocity, boatDirection) {
        // Calculate wind force
        const wind = windForce(this.velocity, windVelocity, this.sailAspectRatio);
        this.windForceVector.copy(wind);

        // Calculate water resistance
        const water = waterResistance(this.velocity);
        this.waterResistanceVector.copy(water);

        // Calculate total force
        const totalForce = new THREE.Vector3().add(wind).add(water);

        // Calculate acceleration
        const acceleration = totalForce.clone().divideScalar(this.mass);

        // Update velocity
        this.velocity.add(acceleration.multiplyScalar(deltaTime));

        // Update position
        this.position.add(this.velocity.clone().multiplyScalar(deltaTime));
    }
}

export default PhysicsEngine;
