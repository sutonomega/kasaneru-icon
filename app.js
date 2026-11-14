const canvas = document.querySelector("#canvas"),
  context = canvas.getContext("2d");
const zoom = document.querySelector("#zoom"),
  status = document.querySelector("#status");
let avatar = null,
  frame = null,
  offsetX = 0,
  offsetY = 0,
  scale = 1;
const uploadVersions = { avatar: 0, frame: 0 };

async function isPngFile(file) {
  const signature = new Uint8Array(await file.slice(0, 8).arrayBuffer());
  const pngSignature = [137, 80, 78, 71, 13, 10, 26, 10];
  return signature.length === pngSignature.length &&
    pngSignature.every((byte, index) => signature[index] === byte);
}
function drawPreview() {
  context.clearRect(0, 0, 1024, 1024);
  if (avatar) {
    const fit = Math.max(1024 / avatar.width, 1024 / avatar.height) * scale;
    const width = avatar.width * fit,
      height = avatar.height * fit;
    context.drawImage(
      avatar,
      (1024 - width) / 2 + offsetX,
      (1024 - height) / 2 + offsetY,
      width,
      height,
    );
  }
  if (frame) context.drawImage(frame, 0, 0, 1024, 1024);
  document.querySelector("#save").disabled = !(avatar && frame);
}
function resetTransform() {
  offsetX = offsetY = 0;
  scale = 1;
  zoom.value = 100;
  document.querySelector("#percent").value = "100%";
  drawPreview();
}
async function uploadImage(event, kind) {
  const file = event.target.files[0];
  if (!file) return;
  const uploadVersion = ++uploadVersions[kind];
  let url;
  try {
    if (file.size > 30 * 1024 * 1024) {
      status.textContent = "30MB以下の画像を選んでください";
      return;
    }
    if (kind === "frame") {
      const isPng = await isPngFile(file);
      if (uploadVersion !== uploadVersions[kind]) return;
      if (!isPng) {
        status.textContent = "フレームにはPNG画像を選んでください";
        return;
      }
    }
    url = URL.createObjectURL(file);
    const image = new Image();
    image.src = url;
    await image.decode();
    if (uploadVersion !== uploadVersions[kind]) return;
    if (kind === "avatar") {
      avatar = image;
      resetTransform();
    } else frame = image;
    drawPreview();
    status.textContent =
      avatar && frame
        ? "準備できました。位置を調整して保存できます"
        : "もう一枚の画像を選んでください";
  } catch {
    if (uploadVersion !== uploadVersions[kind]) return;
    status.textContent =
      "画像を読み込めませんでした。PNG・JPEG・WebPをお試しください";
  } finally {
    if (url) URL.revokeObjectURL(url);
  }
}
document.querySelector("#avatar").onchange = (event) => uploadImage(event, "avatar");
document.querySelector("#frame").onchange = (event) => uploadImage(event, "frame");
zoom.oninput = () => {
  scale = Number(zoom.value) / 100;
  document.querySelector("#percent").value = zoom.value + "%";
  drawPreview();
};
document.querySelector("#reset").onclick = resetTransform;
let pointer = null;
canvas.onpointerdown = (event) => {
  if (!avatar) return;
  pointer = { id: event.pointerId, x: event.clientX, y: event.clientY };
  canvas.setPointerCapture(event.pointerId);
};
canvas.onpointermove = (event) => {
  if (!pointer || pointer.id !== event.pointerId) return;
  const displayToCanvasScale = 1024 / canvas.getBoundingClientRect().width;
  offsetX += (event.clientX - pointer.x) * displayToCanvasScale;
  offsetY += (event.clientY - pointer.y) * displayToCanvasScale;
  pointer.x = event.clientX;
  pointer.y = event.clientY;
  drawPreview();
};
canvas.onpointerup = canvas.onpointercancel = () => {
  pointer = null;
};
document.querySelector("#save").onclick = () => {
  const output = document.createElement("canvas");
  output.width = output.height = Number(document.querySelector("#size").value);
  output.getContext("2d").drawImage(canvas, 0, 0, output.width, output.height);
  output.toBlob((blob) => {
    if (!blob) {
      status.textContent = "保存できませんでした";
      return;
    }
    const url = URL.createObjectURL(blob),
      link = document.createElement("a");
    link.href = url;
    link.download = "kasaneru-icon.png";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    status.textContent = "PNGを保存しました";
  }, "image/png");
};
document.querySelector("#demo").onclick = () => {
  uploadVersions.avatar += 1;
  uploadVersions.frame += 1;
  avatar = document.createElement("canvas");
  avatar.width = avatar.height = 1024;
  const photo = avatar.getContext("2d");
  photo.fillStyle = "#e9cbb0";
  photo.beginPath();
  photo.arc(512, 512, 440, 0, Math.PI * 2);
  photo.fill();
  photo.fillStyle = "#32634f";
  photo.beginPath();
  photo.arc(512, 850, 290, Math.PI, 0);
  photo.fill();
  photo.fillStyle = "#fff2d9";
  photo.beginPath();
  photo.arc(512, 440, 180, 0, Math.PI * 2);
  photo.fill();
  frame = document.createElement("canvas");
  frame.width = frame.height = 1024;
  const ring = frame.getContext("2d");
  ring.strokeStyle = "#38745c";
  ring.lineWidth = 45;
  ring.beginPath();
  ring.arc(512, 512, 478, 0, Math.PI * 2);
  ring.stroke();
  ring.fillStyle = "#e9b95b";
  for (const position of [160, 864]) {
    ring.beginPath();
    ring.arc(position, 190, 42, 0, Math.PI * 2);
    ring.fill();
  }
  resetTransform();
  status.textContent = "サンプルを表示中。自分の画像に置き換えられます";
};
drawPreview();
