import * as THREE from "three"
/*
wind dorce
inputs : 
1- 
2-
output : 

*/
export function windForce(boatVelocity, windVelocity, sailAspectRatio) {
  const rho = 1.225; // Air density (kg/m^3)
  const A = 1; // Effective sail area, adjust accordingly
  const CD0 = 0.02; // Zero-lift drag coefficient
  const e = 0.8; // Oswald efficiency factor

  // Calculate relative wind velocity
  const relativeWind = windVelocity.clone().sub(boatVelocity);
  const relativeWindSpeed = relativeWind.length();

  if (relativeWindSpeed === 0) {
      return new THREE.Vector3(); // Return zero vector if no relative wind
  }

  // Calculate angle of attack
  const boatDirection = boatVelocity.clone().normalize();
  const windDirection = relativeWind.clone().normalize();
  const angleOfAttack = boatDirection.angleTo(windDirection);

  // Calculate lift coefficient (CL)
  const CL = 2 * Math.PI * Math.sin(angleOfAttack);

  // Calculate drag coefficient (CD)
  const AR = sailAspectRatio;
  const CD = CD0 + (CL * CL) / (Math.PI * e * AR);

  // Calculate lift and drag forces
  const lift = 0.5 * rho * CL * A * relativeWindSpeed * relativeWindSpeed;
  const drag = 0.5 * rho * CD * A * relativeWindSpeed * relativeWindSpeed;

  // Decompose lift and drag into force vector
  const liftForce = new THREE.Vector3(
      -relativeWind.z * lift,
      0,
      relativeWind.x * lift
  ).normalize().multiplyScalar(lift);

  const dragForce = relativeWind.clone().normalize().multiplyScalar(-drag);

  // Total wind force is the sum of lift and drag
  const totalWindForce = new THREE.Vector3().add(liftForce).add(dragForce); 
  return totalWindForce;
}


/*
water resistence force
inputs:


output

*/ 
export function waterResistance(velocity) {
  const rho = 1000; // Water density (kg/m^3)
  const A = 1; // Reference area, adjust accordingly
  const Cd = 0.5; // Drag coefficient
  const forceMagnitude = 0.5 * rho * Cd * A * velocity.lengthSq();

  console.log("WATER FORCE MAGNITUDE", forceMagnitude);

  return velocity.clone().normalize().multiplyScalar(-forceMagnitude);
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
export function buoyancyForce(displacement, mass) {
  const rho = 1000;  
  const g = 9.81;  
  const volume = displacement / (rho * g);

  const buoyancyMagnitude = rho * g * volume;
  return new THREE.Vector3(0, buoyancyMagnitude, 0);
}