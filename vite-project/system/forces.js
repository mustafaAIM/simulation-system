//forces.js 

import * as THREE from "three"
import params from "./gui.js"

/*
wind dorce
inputs : 
1- 
2-
output : 
*/

function limitDecimals(number, decimalPlaces = 4) {
  return parseFloat(number.toFixed(decimalPlaces));
}


let liftArrow, dragArrow, totalForceArrow;

export function rudderForce(boatVelocity, rudderAngle, params) {
  const waterDensity = 1000; // kg/m^3
  const rudderArea = params.rudderArea || 0.2; // m^2
  const rudderAspectRatio = params.rudderAspectRatio || 3;
  const rudderEfficiency = params.rudderEfficiency || 0.7;

  // Prevent division by zero or very small numbers
  const velocityMagnitude = Math.max(boatVelocity.length(), 0.01);



  // Calculate lift coefficient
  const liftSlope = (2 * Math.PI * rudderAspectRatio) / (rudderAspectRatio + 2);
  const CL = liftSlope * rudderAngle * rudderEfficiency;

  // Calculate rudder force magnitude
  const forceMagnitude = 0.5 * waterDensity * rudderArea * CL * velocityMagnitude * velocityMagnitude;

  // Ensure we're not creating a zero vector
  if (velocityMagnitude < 0.01) {
      return new THREE.Vector3(0, 0, 0);
  }

  // Calculate force direction (perpendicular to boat velocity)
  const forceDirection = new THREE.Vector3(-boatVelocity.z, 0, boatVelocity.x).normalize();

  return forceDirection.multiplyScalar(forceMagnitude);
}

export function windForce(boatVelocity, windVelocity, angleOfAttack, params, boat) {
  const CD0 = 0.01;
  const e = 0.8;

  const relativeWind = windVelocity.clone().sub(boatVelocity);
  const relativeWindSpeed = relativeWind.length();

  const AR = params.sailAspectRatio;
  const CL = limitDecimals((2 * Math.PI * angleOfAttack) / (1 + (2 / AR)));
  // Adjust CL calculation
  const CD = limitDecimals(CD0 + (CL * CL) / (Math.PI * e * AR));

  // Calculate lift and drag forces (reduced by a factor to get more reasonable values)
  const lift = limitDecimals(0.05 * params.rho * CL * params.Area * relativeWindSpeed * relativeWindSpeed);
  const drag = limitDecimals(0.05 * params.rho * CD * params.Area * relativeWindSpeed * relativeWindSpeed);

  // Create a coordinate system based on the relative wind
  const windDirection = relativeWind.clone().normalize();
  const liftDirection = new THREE.Vector3(windDirection.z, 0, -windDirection.x).normalize();

  // Calculate lift and drag vectors
  const liftForce = liftDirection.multiplyScalar(lift);
  const dragForce = windDirection.multiplyScalar(drag);

  liftForce.x = limitDecimals(liftForce.x);
  liftForce.y = limitDecimals(liftForce.y);
  liftForce.z = limitDecimals(liftForce.z);
  dragForce.x = limitDecimals(dragForce.x);
  dragForce.y = limitDecimals(dragForce.y);
  dragForce.z = limitDecimals(dragForce.z);

  const totalWindForce = new THREE.Vector3().addVectors(liftForce, dragForce);

  // Arrow helper logic (unchanged)
  if (!liftArrow) {
    liftArrow = new THREE.ArrowHelper(new THREE.Vector3(), new THREE.Vector3(), liftForce.length(), 0x00ffff);
    boat.add(liftArrow);
  }
  if (!dragArrow) {
    dragArrow = new THREE.ArrowHelper(new THREE.Vector3(), new THREE.Vector3(), dragForce.length(), 0x000000);
    boat.add(dragArrow);
  }
  if (!totalForceArrow) {
    totalForceArrow = new THREE.ArrowHelper(new THREE.Vector3(), new THREE.Vector3(), totalWindForce.length(), 0xffa500);
    boat.add(totalForceArrow);
  }

  // Update ArrowHelpers
  liftArrow.setDirection(liftForce.clone().normalize());
  liftArrow.setLength(liftForce.length());

  dragArrow.setDirection(dragForce.clone().normalize());
  dragArrow.setLength(dragForce.length());

  totalForceArrow.setDirection(totalWindForce.clone().normalize());
  totalForceArrow.setLength(totalWindForce.length());

  return totalWindForce;
}

/*
water resistence force
inputs:*/


export function keelForce(boatVelocity, boatDirection, params) {
  const waterDensity = 1000; // kg/m^3
  const keelArea = params.keelArea || 1.5; // m^2
  const keelAspectRatio = params.keelAspectRatio || 4; // Typical aspect ratio for a keel

  // Calculate the boat's lateral velocity (perpendicular to its direction)
  const lateralVelocity = new THREE.Vector3();
  lateralVelocity.crossVectors(boatDirection, new THREE.Vector3(0, 1, 0));
  lateralVelocity.normalize();
  lateralVelocity.multiplyScalar(boatVelocity.dot(lateralVelocity));

  // Calculate angle of attack for the keel (in radians)
  const angleOfAttack = Math.atan2(lateralVelocity.length(), boatVelocity.dot(boatDirection));

  // Adjust the lift slope calculation for stronger keel force
  const liftSlope = (2 * Math.PI * keelAspectRatio) / (keelAspectRatio + 2);
  const CL = liftSlope * angleOfAttack;

  // Increase force magnitude calculation to strengthen the keel's influence
  const velocityMagnitude = lateralVelocity.length();
  const forceMagnitude =  waterDensity * keelArea * CL * velocityMagnitude * velocityMagnitude // Introduce a scaling factor

  // The force direction is perpendicular to the boat's direction and opposite to the lateral velocity
  const forceDirection = lateralVelocity.normalize().negate();

  return forceDirection.multiplyScalar(forceMagnitude);
}


export function calculateLC(angleOfAttack) {

  const CL = 2 * Math.PI * Math.sin(angleOfAttack);

  return CL;
}
function limitVectorDecimals(vector, decimalPlaces = 4) {
  vector.x = limitDecimals(vector.x, decimalPlaces);
  vector.y = limitDecimals(vector.y, decimalPlaces);
  vector.z = limitDecimals(vector.z, decimalPlaces);
  return vector;
}
//const CL = calculateLC(50);

export function calculateDC(CL, sailAspectRatio) {
  const CD0 = 0.02;
  const e = 0.8;
  const AR = sailAspectRatio;

  const CD = CD0 + (CL * CL) / (Math.PI * e * AR);
  return CD;
}

export function calculateWaterResistance(velocity, params, boatDirection) {
  const waterDensity = 1000; // kg/m^3
  const frontalArea = params.frontalArea || 1; // m^2, adjust based on your boat's size
  const sideArea = params.sideArea || 18; // m^2, adjust based on your boat's size
  const backArea = params.backArea || 5; // m^2, adjust based on your boat's size
  const baseDragCoefficient = 0.5; // Base drag coefficient for forward motion

  // Define multipliers for different directions
  const dragMultipliers = {
    forward: 1,
    sideways: 4,
    backward: 2
  };

  // Decompose velocity into forward and sideways components
  const forwardComponent = boatDirection.clone().multiplyScalar(velocity.dot(boatDirection));
  const sidewaysComponent = velocity.clone().sub(forwardComponent);

  // Determine if the boat is moving forward or backward
  const isMovingForward = velocity.dot(boatDirection) > 0;

  // Calculate resistance for forward/backward motion
  const longitudinalSpeed = forwardComponent.length();
  const longitudinalArea = isMovingForward ? frontalArea : backArea;
  const longitudinalMultiplier = isMovingForward ? dragMultipliers.forward : dragMultipliers.backward;
  const longitudinalResistance = forwardComponent.clone().normalize().negate().multiplyScalar(
    0.5 * waterDensity * baseDragCoefficient * longitudinalArea * longitudinalSpeed * longitudinalSpeed * longitudinalMultiplier
  );

  // Calculate resistance for sideways motion
  const sidewaysSpeed = sidewaysComponent.length();
  const sidewaysResistance = sidewaysComponent.clone().normalize().negate().multiplyScalar(
    0.5 * waterDensity * baseDragCoefficient * sideArea * sidewaysSpeed * sidewaysSpeed * dragMultipliers.sideways
  );

  // Combine all resistances
  const totalResistance = longitudinalResistance.add(sidewaysResistance);

  return totalResistance;
}





/*
gravity force

input : 
1- mass
output: 
1-Vector3

*/
export function gravityForce(mass) {
  const g = 9.81;
  return new THREE.Vector3(0, -mass * g, 0);
}



/*
bouncy

*/
export function buoyancyForce(mass) {
  const rho = 1000;
  const g = 9.81;
  const volume = mass / (rho * g);

  const buoyancyMagnitude = rho * g * volume;
  return new THREE.Vector3(0, buoyancyMagnitude, 0);
}

export function rudderRotate(rudderAngle, sailAngle) {
  const d1 = 1.05;
  const d2 = 2.135;
  const mass = 435;
  const totalWindForce = 40;
  const forceMagnitude = 30;
  const Idelta = (1 / 3) * mass * d2 * d2;
  const teta1 = Math.cos(0);
  const teta2 = Math.cos(rudderAngle);
  //const alpha = ((d1 * totalWindForce * teta1) - (d2 * forceMagnitude * teta2)) / Idelta;
  const alpha = (d2 * totalWindForce * (teta2 - teta1)) / Idelta;
  const omega = alpha / 0.016;
  const YawAngle = omega * 2;
  //const YawAngleInRadians = YawAngle * (Math.PI / 180); // or use THREE.Math.degToRad(YawAngle);
  //const YawAngleInRadians = THREE.Math.degToRad(YawAngle);
  // Create a new quaternion from the axis-angle
  // const axis = new THREE.Vector3(0, 1, 0);
  // const quaternion = new THREE.Quaternion();
  // quaternion.setFromAxisAngle(axis, YawAngle);

  return YawAngle;
}