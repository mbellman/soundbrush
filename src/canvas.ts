export function createCanvas() {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  canvas.classList.add('canvas');

  function fitCanvasToWindow() {
    const dpr = window.devicePixelRatio;

    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;

    canvas.style.width = '100%';
    canvas.style.height = '100%';

    ctx.fillStyle = '#000';

    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  window.addEventListener('resize', fitCanvasToWindow);

  fitCanvasToWindow();

  return canvas;
}

export function drawCircle(ctx: CanvasRenderingContext2D, x: number, y: number, color: string | CanvasGradient, radius: number) {
  ctx.fillStyle = color;

  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
}