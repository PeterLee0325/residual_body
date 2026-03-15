const BG = [3, 7, 18];
const CYAN = [0, 245, 255];
const BLUE = [40, 120, 255];
const PURPLE = [170, 70, 255];
const ALERT = [255, 70, 95];
const WHITE = [235, 248, 255];

let cam;
let prevFrame = null;

let threshold = 68;
let stepSize = 10;
let motionLevel = 0;
let state = "IDLE";

let targetX = 480;
let targetY = 270;
let smoothX = 480;
let smoothY = 270;

let lockPulse = 0;
let flashAlpha = 0;
let showPreview = false;

let traces = [];
let rings = [];

function setup() {
  createCanvas(1920, 1080);
  pixelDensity(1);

  cam = createCapture(VIDEO);
  cam.size(width, height);
  cam.hide();

  textFont("monospace");
  strokeCap(SQUARE);
}

function draw() {
  background(BG[0], BG[1], BG[2], 42);

  drawBackgroundGrid();
  drawSweep();
  drawFrame();

  cam.loadPixels();

  let activeCount = 0;
  let sumX = 0;
  let sumY = 0;

  if (cam.pixels.length > 0 && prevFrame) {
    for (let y = 0; y < height; y += stepSize) {
      for (let x = 0; x < width; x += stepSize) {
        const i = (x + y * width) * 4;

        const r1 = cam.pixels[i];
        const g1 = cam.pixels[i + 1];
        const b1 = cam.pixels[i + 2];

        const r2 = prevFrame[i];
        const g2 = prevFrame[i + 1];
        const b2 = prevFrame[i + 2];

        const diff = abs(r1 - r2) + abs(g1 - g2) + abs(b1 - b2);

        if (diff > threshold) {
          activeCount++;
          sumX += x;
          sumY += y;

          if (random() < 0.018) {
            traces.push(new Trace(x, y, diff));
          }
        }
      }
    }
  }

  motionLevel = lerp(motionLevel, activeCount, 0.14);

  if (activeCount > 6) {
    targetX = sumX / activeCount;
    targetY = sumY / activeCount;
  }

  smoothX = lerp(smoothX, targetX, 0.18);
  smoothY = lerp(smoothY, targetY, 0.18);

  updateState();
  spawnRings();

  drawMotionHalo();
  updateRings();
  updateTraces();
  drawTarget();
  drawStatus(activeCount);
  drawFlash();

  if (showPreview) {
    tint(255, 140);
    image(cam, width - 190, height - 108, 180, 101);
    noTint();
  }

  prevFrame = cam.pixels.slice();
  lockPulse *= 0.92;
  flashAlpha *= 0.88;
}

function updateState() {
  if (motionLevel > 150) {
    if (state !== "LOCK") {
      flashAlpha = 110;
      lockPulse = 1;
    }
    state = "LOCK";
  } else if (motionLevel > 42) {
    state = "SCAN";
  } else {
    state = "IDLE";
  }
}

function spawnRings() {
  if (state === "SCAN" && frameCount % 20 === 0) {
    rings.push(new Ring(smoothX, smoothY, 40, false));
  }

  if (state === "LOCK" && frameCount % 10 === 0) {
    rings.push(new Ring(smoothX, smoothY, 70, true));
  }
}

function drawBackgroundGrid() {
  for (let y = 0; y < height; y += 18) {
    stroke(CYAN[0], CYAN[1], CYAN[2], 10);
    line(0, y, width, y);
  }

  for (let x = 0; x < width; x += 48) {
    stroke(BLUE[0], BLUE[1], BLUE[2], 8);
    line(x, 0, x, height);
  }

  stroke(CYAN[0], CYAN[1], CYAN[2], 18);
  line(width / 2, 0, width / 2, height);
  line(0, height / 2, width, height / 2);
}

function drawSweep() {
  const sx = (frameCount * 3.2) % (width + 180) - 90;
  noStroke();
  rectMode(CORNER);

  for (let i = 0; i < 44; i++) {
    const a = map(i, 0, 43, 0, 34);
    fill(CYAN[0], CYAN[1], CYAN[2], a);
    rect(sx - i * 3, 0, 3, height);
  }
}

function drawFrame() {
  rectMode(CORNER);
  noFill();

  stroke(CYAN[0], CYAN[1], CYAN[2], 42);
  rect(12, 12, width - 24, height - 24);

  stroke(PURPLE[0], PURPLE[1], PURPLE[2], 70);
  line(20, 20, 86, 20);
  line(20, 20, 20, 86);
  line(width - 20, 20, width - 86, 20);
  line(width - 20, 20, width - 20, 86);
  line(20, height - 20, 86, height - 20);
  line(20, height - 20, 20, height - 86);
  line(width - 20, height - 20, width - 86, height - 20);
  line(width - 20, height - 20, width - 20, height - 86);
}

function drawMotionHalo() {
  if (state === "IDLE") return;

  const haloSize = map(motionLevel, 40, 180, 90, 220, true);
  noStroke();

  if (state === "SCAN") {
    fill(CYAN[0], CYAN[1], CYAN[2], 18);
    ellipse(smoothX, smoothY, haloSize);
    fill(PURPLE[0], PURPLE[1], PURPLE[2], 10);
    ellipse(smoothX, smoothY, haloSize * 0.6);
  } else {
    fill(ALERT[0], ALERT[1], ALERT[2], 20);
    ellipse(smoothX, smoothY, haloSize * 1.1);
    fill(CYAN[0], CYAN[1], CYAN[2], 10);
    ellipse(smoothX, smoothY, haloSize * 0.7);
  }
}

function drawTarget() {
  if (state === "IDLE") return;

  rectMode(CENTER);
  noFill();
  strokeWeight(1.6);

  const size = map(motionLevel, 40, 180, 78, 158, true);
  const c = size * 0.18;
  const h = size * 0.5;

  if (state === "SCAN") {
    stroke(CYAN[0], CYAN[1], CYAN[2], 230);
  } else {
    stroke(ALERT[0], ALERT[1], ALERT[2], 240);
  }

  rect(smoothX, smoothY, size, size);

  line(smoothX - h, smoothY - h, smoothX - h + c, smoothY - h);
  line(smoothX - h, smoothY - h, smoothX - h, smoothY - h + c);
  line(smoothX + h, smoothY - h, smoothX + h - c, smoothY - h);
  line(smoothX + h, smoothY - h, smoothX + h, smoothY - h + c);
  line(smoothX - h, smoothY + h, smoothX - h + c, smoothY + h);
  line(smoothX - h, smoothY + h, smoothX - h, smoothY + h - c);
  line(smoothX + h, smoothY + h, smoothX + h - c, smoothY + h);
  line(smoothX + h, smoothY + h, smoothX + h, smoothY + h - c);

  const cross = 14 + lockPulse * 8;
  line(smoothX - cross, smoothY, smoothX + cross, smoothY);
  line(smoothX, smoothY - cross, smoothX, smoothY + cross);

  noStroke();
  if (state === "SCAN") {
    fill(CYAN[0], CYAN[1], CYAN[2], 220);
    ellipse(smoothX, smoothY, 8, 8);
  } else {
    fill(ALERT[0], ALERT[1], ALERT[2], 240);
    ellipse(smoothX, smoothY, 10 + lockPulse * 4, 10 + lockPulse * 4);
  }
}

function drawStatus(activeCount) {
  noStroke();
  textAlign(LEFT, TOP);

  fill(CYAN[0], CYAN[1], CYAN[2], 245);
  textSize(15);
  text("RESIDUAL BODY", 20, 18);

  fill(WHITE[0], WHITE[1], WHITE[2], 200);
  textSize(12);
  text("STATE: " + state, 20, 46);
  text("MOTION: " + nf(motionLevel, 1, 1), 20, 64);
  text("ACTIVE CELLS: " + activeCount, 20, 82);
  text("THRESHOLD: " + threshold + "  (UP / DOWN)", 20, 100);

  fill(PURPLE[0], PURPLE[1], PURPLE[2], 210);
  text("CAM_01", width - 88, height - 34);
  fill(CYAN[0], CYAN[1], CYAN[2], 180);
  text("LIVE SIGNAL", width - 104, height - 18);

  fill(CYAN[0], CYAN[1], CYAN[2], 150);
  text("THE BODY BECOMES SIGNAL", 20, height - 28);

  if (state === "SCAN") {
    fill(PURPLE[0], PURPLE[1], PURPLE[2], 235);
    text("SCANNING...", width - 110, 18);
  }

  if (state === "LOCK") {
    fill(ALERT[0], ALERT[1], ALERT[2], 255);
    text("LOCKED", width - 72, 18);
    textAlign(CENTER, CENTER);
    textSize(30);
    text("SIGNAL CAPTURED", width / 2, height / 2 + 82);
  }
}

function drawFlash() {
  if (flashAlpha < 1) return;

  noStroke();
  fill(ALERT[0], ALERT[1], ALERT[2], flashAlpha * 0.08);
  rectMode(CORNER);
  rect(0, 0, width, height);

  stroke(ALERT[0], ALERT[1], ALERT[2], flashAlpha * 0.22);
  line(0, height / 2, width, height / 2);
}

function updateTraces() {
  blendMode(ADD);
  for (let i = traces.length - 1; i >= 0; i--) {
    traces[i].update();
    traces[i].display();
    if (traces[i].dead()) traces.splice(i, 1);
  }
  blendMode(BLEND);
}

function updateRings() {
  blendMode(ADD);
  for (let i = rings.length - 1; i >= 0; i--) {
    rings[i].update();
    rings[i].display();
    if (rings[i].dead()) rings.splice(i, 1);
  }
  blendMode(BLEND);
}

function keyPressed() {
  if (keyCode === UP_ARROW) threshold += 4;
  if (keyCode === DOWN_ARROW) threshold = max(12, threshold - 4);

  if (key === "s" || key === "S") saveCanvas("residual-body-final", "png");
  if (key === "v" || key === "V") showPreview = !showPreview;
  if (key === "c" || key === "C") {
    traces = [];
    rings = [];
    background(BG[0], BG[1], BG[2]);
  }
}

class Trace {
  constructor(x, y, diff) {
    this.x = x + random(-2, 2);
    this.y = y + random(-2, 2);
    this.vx = random(-0.3, 0.3);
    this.vy = random(-0.5, 0.5);
    this.life = random(18, 32);
    this.maxLife = this.life;
    this.size = map(diff, threshold, 400, 2.5, 5.5, true);
    this.c = random() < 0.7 ? CYAN : PURPLE;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.life -= 1;
  }

  display() {
    const a = map(this.life, 0, this.maxLife, 0, 170);
    noStroke();
    fill(this.c[0], this.c[1], this.c[2], a);
    ellipse(this.x, this.y, this.size, this.size);
  }

  dead() {
    return this.life <= 0;
  }
}

class Ring {
  constructor(x, y, startSize, alarm) {
    this.x = x;
    this.y = y;
    this.size = startSize;
    this.alarm = alarm;
    this.life = 26;
    this.maxLife = this.life;
  }

  update() {
    this.size += this.alarm ? 6 : 3.2;
    this.life -= 1;
  }

  display() {
    const a = map(this.life, 0, this.maxLife, 0, this.alarm ? 120 : 90);
    noFill();
    strokeWeight(1.2);

    if (this.alarm) {
      stroke(ALERT[0], ALERT[1], ALERT[2], a);
    } else {
      stroke(CYAN[0], CYAN[1], CYAN[2], a);
    }

    ellipse(this.x, this.y, this.size, this.size);
  }

  dead() {
    return this.life <= 0;
  }
}
