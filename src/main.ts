export default function main() {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#000';

  ctx.fillRect(0, 0, canvas.width, canvas.height);

  document.body.appendChild(canvas);
}