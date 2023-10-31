export function createCanvas() {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#000';

  ctx.fillRect(0, 0, canvas.width, canvas.height);

  function fitCanvasToWindow() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;    

    ctx.fillStyle = '#000';

    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  window.addEventListener('resize', fitCanvasToWindow);

  fitCanvasToWindow();

  return canvas;
}

export function drawCircle(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, radius: number) {
  ctx.fillStyle = color;

  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
}