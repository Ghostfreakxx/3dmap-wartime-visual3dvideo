// Procedural poses for the rigs in rig.js.  pose(actor, mode, t, p)
//   t = seconds since this mode started, p = global time + per-actor phase.
const PI = Math.PI;
const clamp01 = (x) => Math.max(0, Math.min(1, x));
const easeOut = (x) => 1 - Math.pow(1 - clamp01(x), 3);

// weapon orientation in the hand: rotation.x of the weapon mesh
const W = { forward: PI / 2, alongArm: PI, up: 0, spearLevel: 2.3 };

function reset(a) {
  a.body.rotation.set(0, 0, 0); a.body.position.set(0, 0, 0);
  a.hips.position.set(0, 0.36, 0); a.hips.rotation.set(0, 0, 0);
  a.torso.rotation.set(0, 0, 0); a.neck.rotation.set(0, 0, 0);
  a.legs.forEach((l) => l.rotation.set(0, 0, 0));
  a.armR.rotation.set(0, 0, -0.12); a.armL.rotation.set(0, 0, 0.12);
  if (a.weapon) { a.weapon.rotation.set(a.kind === 'redcoat' && a.weaponKind === 'rifle' ? W.forward : W.forward, 0, 0); a.weapon.visible = !a.hideWeapon; }
}
function walkLegs(a, p, f, amp) {
  const s = Math.sin(p * f);
  a.legs[0].rotation.x = amp * s; a.legs[1].rotation.x = -amp * s;
  a.hips.position.y = 0.36 + 0.035 * Math.abs(Math.cos(p * f));
  return s;
}
function crouchLegs(a) {
  a.hips.position.y = 0.24; a.legs[0].rotation.x = -1.25; a.legs[1].rotation.x = 0.9;
}
function aimArms(a) {
  a.armR.rotation.set(-1.45, 0, 0.12); a.armL.rotation.set(-1.35, 0, -0.45);
  if (a.weapon) a.weapon.rotation.x = W.alongArm;
  a.torso.rotation.y = 0.12; a.neck.rotation.y = -0.1;
}

export function pose(a, mode, t, p) {
  reset(a);
  const br = Math.sin(p * 1.8);
  switch (mode) {
    default:
    case 'idle':
      a.torso.rotation.x = 0.02 * br; a.neck.rotation.y = 0.12 * Math.sin(p * 0.5);
      break;
    case 'look':
      a.neck.rotation.y = 0.7 * Math.sin(p * 1.1); a.neck.rotation.x = -0.1 * Math.sin(p * 0.7);
      a.armR.rotation.x = -0.25;
      break;
    case 'walk': {
      const s = walkLegs(a, p, 6, 0.5);
      a.armL.rotation.x = 0.35 * s; a.armR.rotation.x = -0.12 * s;
      a.neck.rotation.y = 0.25 * Math.sin(p * 0.6);
      break;
    }
    case 'walkTired': {
      const s = walkLegs(a, p, 5, 0.4);
      a.armL.rotation.x = 0.25 * s; a.torso.rotation.x = 0.14; a.neck.rotation.x = 0.15;
      break;
    }
    case 'run': case 'charge': case 'flee': {
      const s = walkLegs(a, p, 11, 0.85);
      a.hips.position.y = 0.36 + 0.07 * Math.abs(Math.cos(p * 11));
      a.torso.rotation.x = 0.25;
      a.armL.rotation.x = 0.8 * s; a.armR.rotation.x = -0.8 * s;
      if (mode === 'charge') {
        a.armR.rotation.set(-2.75 + 0.15 * s, 0, -0.2);
        if (a.weapon) a.weapon.rotation.x = a.weaponKind === 'spear' ? W.spearLevel : W.alongArm;
        if (a.weaponKind === 'spear') a.armR.rotation.set(-1.1, 0, 0);
        a.neck.rotation.x = -0.2;
      }
      if (mode === 'flee') {
        a.armL.rotation.set(-2.4 + 0.6 * s, 0, 0.4); a.armR.rotation.set(-2.2 - 0.6 * s, 0, -0.4);
        a.neck.rotation.y = 0.9 * Math.sin(p * 2.3); a.torso.rotation.x = 0.1;
        if (a.weapon) a.weapon.visible = false;
      }
      break;
    }
    case 'aim': aimArms(a); a.torso.rotation.x = 0.03 * br; break;
    case 'fire': {
      aimArms(a);
      const k = (t % 3.2);
      if (k < 0.18) { a.torso.rotation.x = -0.18 * (1 - k / 0.18); a.armR.rotation.x += 0.25 * (1 - k / 0.18); }
      break;
    }
    case 'reload':
      a.armR.rotation.set(-0.7, 0, 0.3); a.armL.rotation.set(-1.6 + 0.4 * Math.sin(p * 9), 0, -0.5);
      if (a.weapon) a.weapon.rotation.x = 0.35;
      a.neck.rotation.x = 0.3;
      break;
    case 'kneelAim': crouchLegs(a); aimArms(a); break;
    case 'crouch':
      crouchLegs(a); a.torso.rotation.x = 0.45 + 0.02 * br; a.neck.rotation.x = -0.4;
      a.armR.rotation.x = -0.5; a.armL.rotation.x = -0.3;
      if (a.weapon) a.weapon.rotation.x = a.weaponKind === 'spear' ? 0.25 : W.forward;
      break;
    case 'crouchAim': // musket from cover
      crouchLegs(a); aimArms(a); a.torso.rotation.x = 0.15;
      if ((t % 4) < 0.18) a.torso.rotation.x -= 0.2;
      break;
    case 'signal':
      crouchLegs(a); a.torso.rotation.x = 0.25;
      a.armR.rotation.set(-3.0 + 0.1 * Math.sin(p * 4), 0, -0.15);
      if (a.weapon) a.weapon.rotation.x = W.alongArm;
      break;
    case 'strike': {
      const c = (t % 0.7) / 0.7;
      const down = c < 0.55 ? c / 0.55 : 1 - (c - 0.55) / 0.45;
      const k = c < 0.55 ? easeOut(down) * 0.15 : 0.15 + 0.85 * easeOut((c - 0.55) / 0.15);
      const swing = c < 0.55 ? -2.9 + 0.2 * down : -2.7 + 2.3 * Math.min(1, (c - 0.55) / 0.15);
      a.armR.rotation.set(swing, 0, -0.15);
      if (a.weapon) a.weapon.rotation.x = a.weaponKind === 'spear' ? W.spearLevel : W.alongArm;
      if (a.weaponKind === 'spear') a.armR.rotation.set(-1.1 + 0.5 * Math.sin(c * PI * 2), 0, 0);
      a.torso.rotation.x = 0.1 + 0.3 * k; a.legs[0].rotation.x = -0.45; a.legs[1].rotation.x = 0.45;
      a.hips.position.y = 0.32;
      a.armL.rotation.set(-0.6, 0, 0.4);
      break;
    }
    case 'bayonet': {
      aimArms(a);
      const c = Math.sin(p * 7);
      a.torso.rotation.x = 0.1 + 0.18 * Math.max(0, c);
      a.legs[0].rotation.x = -0.5; a.legs[1].rotation.x = 0.4; a.hips.position.y = 0.32;
      break;
    }
    case 'sword': {
      const c = (t % 0.9) / 0.9;
      a.armR.rotation.set(c < 0.5 ? -2.6 : -2.6 + 2.0 * easeOut((c - 0.5) / 0.2), 0, c < 0.5 ? -0.6 : -0.1);
      if (a.weapon) a.weapon.rotation.x = W.alongArm;
      a.legs[0].rotation.x = -0.4; a.legs[1].rotation.x = 0.4; a.hips.position.y = 0.32;
      a.torso.rotation.y = -0.2;
      break;
    }
    case 'pointSword':
      a.armR.rotation.set(-1.5, 0, 0.1);
      if (a.weapon) a.weapon.rotation.x = W.alongArm;
      a.neck.rotation.y = -0.2;
      break;
    case 'fall': case 'fallFwd': case 'dead': case 'deadFwd': {
      const dir = mode === 'fall' || mode === 'dead' ? -1 : 1;
      const k = mode.startsWith('dead') ? 1 : easeOut(t / 0.5);
      a.body.rotation.x = dir * 1.5 * k;
      a.body.rotation.z = 0.15 * k * (a.phaseSign ?? 1);
      a.body.position.y = 0.12 * k;
      a.armR.rotation.set(dir < 0 ? -2.6 * k : -0.4, 0, -0.5 * k); a.armL.rotation.set(dir < 0 ? -2.2 * k : -0.2, 0, 0.7 * k);
      a.legs[0].rotation.x = -0.3 * k; a.legs[1].rotation.x = 0.1 * k;
      a.neck.rotation.x = -0.3 * k * -dir;
      if (a.weapon && a.kind === 'redcoat') a.weapon.visible = k < 0.6 && !a.hideWeapon;
      break;
    }
    case 'cheer': {
      a.body.position.y = 0.12 * Math.abs(Math.sin(p * 5));
      const s = Math.sin(p * 5);
      a.armR.rotation.set(-2.9 + 0.2 * s, 0, -0.25); a.armL.rotation.set(-2.6 - 0.3 * s, 0, 0.4);
      if (a.weapon) a.weapon.rotation.x = W.alongArm;
      a.neck.rotation.x = -0.25;
      break;
    }
    case 'dance': {
      const s = Math.sin(p * 4);
      a.body.position.y = 0.14 * Math.abs(s);
      a.legs[0].rotation.x = 0.5 * Math.max(0, s); a.legs[1].rotation.x = 0.5 * Math.max(0, -s);
      a.armR.rotation.set(-1.6 - 0.8 * s, 0, -0.9); a.armL.rotation.set(-1.6 + 0.8 * s, 0, 0.9);
      a.torso.rotation.y = 0.35 * s;
      if (a.weapon) a.weapon.rotation.x = W.alongArm;
      break;
    }
    case 'raiseDao':
      a.legs[0].rotation.x = -0.35; a.legs[1].rotation.x = 0.35; a.hips.position.y = 0.33;
      a.armR.rotation.set(-2.75 + 0.04 * Math.sin(p * 9), 0, -0.8); a.armL.rotation.set(-2.5, 0, 0.45);
      if (a.weapon) a.weapon.rotation.x = W.alongArm;
      a.torso.rotation.x = -0.12; a.neck.rotation.x = 0.35;
      break;
    case 'chop': {
      const k = easeOut(t / 0.18);
      a.legs[0].rotation.x = -0.35; a.legs[1].rotation.x = 0.35; a.hips.position.y = 0.3;
      a.armR.rotation.set(-2.75 + 2.4 * k, 0, -0.8 + 0.7 * k); a.armL.rotation.set(-2.5 + 2.1 * k, 0, 0.45 - 0.35 * k);
      if (a.weapon) a.weapon.rotation.x = W.alongArm;
      a.torso.rotation.x = -0.12 + 0.6 * k; a.neck.rotation.x = 0.35;
      break;
    }
    case 'carry': {
      const s = walkLegs(a, p, 6, 0.45);
      a.armR.rotation.set(-2.85, 0, 0.35); a.armL.rotation.x = 0.3 * s;
      if (a.weapon) a.weapon.visible = false;
      break;
    }
    case 'carryStand':
      a.armR.rotation.set(-2.85, 0, 0.35);
      if (a.weapon) a.weapon.visible = false;
      break;
    case 'plant': {
      crouchLegs(a); a.torso.rotation.x = 0.5; a.neck.rotation.x = -0.1;
      const c = (p * 1.6) % 1, k = c < 0.6 ? c / 0.6 : 1 - (c - 0.6) / 0.4;
      a.armR.rotation.set(-0.4 - 1.9 * k, 0, -0.1);
      a.armL.rotation.set(-1.0, 0, -0.3);
      if (a.weapon) a.weapon.rotation.x = W.alongArm;
      break;
    }
  }
}
