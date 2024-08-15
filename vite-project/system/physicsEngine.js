//physicsEngine.js

import * as THREE from "three";
import {
  windForce,
  gravityForce,
  buoyancyForce,
  rudderRotate,
  keelForce,
  calculateWaterResistance,
  rudderForce,
} from "./forces.js";

import params from "./gui.js";
let TotalArrow;
let WaterArrow;

const boat = {
  position: new THREE.Vector3(),
  quaternion: new THREE.Quaternion()
};



class PhysicsEngine {

  massChanged = false;
  previousMass = null;

  constructor() {
    //attrs
    this.mass = params.mass;
    this.sailAspectRatio = params.sailAspectRatio;
    this.position = new THREE.Vector3();

    //boat
    this.boatDirection = new THREE.Vector3();

    //sail
    this.sailDirection = new THREE.Vector3();

    //physics elemeents
    this.velocity = new THREE.Vector3();
    this.acceleration = new THREE.Vector3();

    //forces
    this.windForceVector = new THREE.Vector3();
    this.waterResistanceVector = new THREE.Vector3();
    this.gravityForceVector = new THREE.Vector3();
    this.buoyancyForceVector = new THREE.Vector3();

    this.length = 5.72;
    this.width = 2.1;
    this.height = 2.1;
    this.height1 = 0.1;
    this.height2 = 0;
    this.volume = 25.2252;
    this.volume1 = 0;
    this.volume2 = 0;
    this.waterro = 997;

    this.angularVelocity = 0; // radians per second
    this.moment_of_inertia = params.moment_of_inertia || 1000; // kg*m^2
    this.rudder_distance = params.rudder_distance || 2; //
  }



  updateboatPosition() {
    const weightForce = gravityForce(params.mass);
    const buoyancyforce = buoyancyForce(params.mass * 9.81);

    this.volume1 = (params.mass) / this.waterro;
    this.volume2 = this.volume - this.volume1;
    this.height2 = this.volume2 / (this.length * this.width);
    this.height1 = this.height - this.height2;

    return this.height1;
  }

  // rotateBoat(totalWindForce, forceMagnitude) {
  //   const rudderAngle = params.rudderAngle; // زاوية الدفة
  //   const sailAngle = params.sailAngle; // زاوية الشراع
  //   const mass = params.mass; // كتلة القارب

  //   // احسب عزم الالتواء الناتج عن الرياح
  //   const torque = rudderRotate(rudderAngle, mass, sailAngle, totalWindForce, forceMagnitude);

  //   console.log(`torque: ${torque}`);

  //   const t = rudderRotate(rudderAngle, mass, sailAngle, totalWindForce, forceMagnitude); // return the quaternion for further use if needed
  //   return t;
  // }

  update(deltaTime, windVelocity, boatDirection, sailDirection, boat, rudderDirection) {
    //vars from params mapping to constructor
    this.mass = params.mass;
    this.boatDirection = boatDirection;
    this.sailDirection = sailDirection;
    const angleOfAttack = this.calculateAngleOfAttack(
      this.sailDirection,
      new THREE.Vector3(1, 0, 0)
    );


    const wind = windForce(
      this.velocity,
      windVelocity,
      angleOfAttack,
      params,
      boat
    );
    this.windForceVector.copy(wind);

    const keel = keelForce(this.velocity, boatDirection, params);

    const rudder = rudderForce(this.velocity, rudderDirection, params);

    // Calculate torque
    const torque = this.rudder_distance * rudder.length();

    // Calculate angular acceleration
    const angularAcceleration = torque / this.moment_of_inertia;

    // Update angular velocity
    this.angularVelocity += angularAcceleration * deltaTime;

    // Apply damping to angular velocity
    const angularDamping = 0.1;
    this.angularVelocity *= (1 - angularDamping);
    this.angularVelocity = Math.max(Math.min(this.angularVelocity, Math.PI), -Math.PI);
    // Update boat direction
    const rotationAxis = new THREE.Vector3(0, 1, 0);
    let rotationQuaternion
    if (rudderDirection < 0) {
      rotationQuaternion = new THREE.Quaternion().setFromAxisAngle(rotationAxis, this.angularVelocity * deltaTime);
    }
    else
      rotationQuaternion = new THREE.Quaternion().setFromAxisAngle(rotationAxis, -this.angularVelocity * deltaTime);
    boatDirection.applyQuaternion(rotationQuaternion);
    boatDirection.normalize();
    // // Calculate the sideways component of the wind force
    // const windSideways = new THREE.Vector3();
    // windSideways.crossVectors(boatDirection, new THREE.Vector3(0, 1, 0));
    // windSideways.normalize();
    // windSideways.multiplyScalar(wind.dot(windSideways));
    // // Ensure keel force is always slightly stronger than the sideways wind force
    // const keelMagnitude = keel.length();
    // const windSidewaysMagnitude = windSideways.length();
    // if (keelMagnitude < windSidewaysMagnitude * 1.1) {
    //   console.log("issue");
    //     keel.normalize().multiplyScalar(windSidewaysMagnitude * 1.1);
    // }

    const height1 = this.updateboatPosition();



    const weightForce = gravityForce(params.mass);
    const buoyancyforce = buoyancyForce(params.mass * 9.81);

    // .add(weightForce).add(buoyancyforce);

    //const totalForce = new THREE.Vector3().add(wind);
    // Calculate water resistance
    const waterResistance = calculateWaterResistance(this.velocity, params, boatDirection);
    console.log(waterResistance);
    // Add water resistance to total force calculation
    const totalForce = new THREE.Vector3().add(wind).add(keel).add(rudder).add(waterResistance);
    // Update linear velocity and position
    boat.quaternion.multiply(rotationQuaternion);
    this.acceleration = totalForce.clone().divideScalar(this.mass);
    this.velocity.add(this.acceleration.clone().multiplyScalar(deltaTime));
    this.position.add(this.velocity.clone().multiplyScalar(deltaTime));

    // Update boat rotation

    if (params.mass !== this.previousMass) {
      this.massChanged = true;
      this.previousMass = params.mass;
    }

    if (this.massChanged) {
      const height1 = this.updateboatPosition();
      this.position.y = 0; // reset y position to 0
      this.position.y -= height1; // decrease y position by height1
      this.massChanged = false; // reset flag
    }

    if (height1 * 10 > this.height / 2) {
      this.position.y -= 0.001;
    }
    let keelForceArrow;
    if (!keelForceArrow) {
      keelForceArrow = new THREE.ArrowHelper(
        new THREE.Vector3(),
        new THREE.Vector3(),
        1,
        0x0000ff
      );
      boat.add(keelForceArrow);
    }

    // Update the arrow in your animation loop
    keelForceArrow.position.copy(boat.position);
    keelForceArrow.setDirection(keel.clone().normalize());
    keelForceArrow.setLength(keel.length() * 0.1);
    // const totalWindForce = this.windForceVector.length();
    // const forceMagnitude = this.waterResistanceVector.length();

    // const t = this.rotateBoat(totalWindForce, totalWindForce);

    //const rotation = rotateBoat(totalWindForce, forceMagnitude);
    //boat.quaternion.multiply(t);

    //scene.getObjectByName('boat').quaternion.copy(boat.quaternion);

    // const totalWindForce = this.windForceVector.length();
    // const forceMagnitude = this.waterResistanceVector.length();

    // // تدوير القارب بناءً على عزم الالتواء
    // const torque = this.rotateBoat(totalWindForce, forceMagnitude);

    // تطبيق التدوير على كائن القارب
    // const quaternion = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), torque);
    // this.boatDirection.applyQuaternion(quaternion);

    if (!TotalArrow) {
      TotalArrow = new THREE.ArrowHelper(
        new THREE.Vector3(),
        new THREE.Vector3(),
        totalForce.length(),
        0xfc0fc0
      ); // Cyan
      boat.add(TotalArrow);
    }

    TotalArrow.setDirection(totalForce.clone().normalize());
    TotalArrow.setLength(totalForce.length());

    // if (!WaterArrow) {
    //   WaterArrow = new THREE.ArrowHelper(
    //     new THREE.Vector3(),
    //     new THREE.Vector3(),
    //     water.length(),
    //     0xff4500
    //   ); // Cyan
    //   scene.add(WaterArrow);
    // }
    // WaterArrow.setDirection(water.clone().normalize());
    // WaterArrow.setLength(water.length());
  }

  calculateAngleOfAttack(sailDirection, windVector) {
    if (!sailDirection || !windVector || sailDirection.length() === 0 || windVector.length() === 0) return 0;

    const sailDir = sailDirection.clone().normalize();
    const windDir = windVector.clone().normalize();

    let angle = Math.atan2(windDir.z, windDir.x) - Math.atan2(sailDir.z, sailDir.x);

    angle = (angle + Math.PI) % (2 * Math.PI) - Math.PI;

    return angle;
  }
}

export default PhysicsEngine;
