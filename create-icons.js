const { createCanvas } = require('canvas');
const fs = require('fs');

function drawIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  const r = size * 0.2;

  ctx.fillStyle = '#2c5282';
  ctx.beginPath();
  ctx.moveTo(r, 0);
  ctx.arcTo(size, 0, size, size, r);
  ctx.arcTo(size, size, 0, size, r);
  ctx.arcTo(0, size, 0, 0, r);
  ctx.arcTo(0, 0, size, 0, r);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = 'white';
  ctx.lineWidth = size * 0.05;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  const pts = [
    [0.1, 0.5], [0.28, 0.5], [0.34, 0.28], [0.43, 0.72],
    [0.53, 0.36], [0.59, 0.62], [0.68, 0.5], [0.9, 0.5]
  ];
  ctx.beginPath();
  ctx.moveTo(pts[0][0]*size, pts[0][1]*size);
  for (let i=1;i<pts.length;i++) ctx.lineTo(pts[i][0]*size, pts[i][1]*size);
  ctx.stroke();

  return canvas.toBuffer('image/png');
}

try {
  fs.writeFileSync('icons/icon-192.png', drawIcon(192));
  fs.writeFileSync('icons/icon-512.png', drawIcon(512));
  console.log('Icons created!');
} catch(e) {
  console.log('canvas module not available, skipping icon generation');
}
