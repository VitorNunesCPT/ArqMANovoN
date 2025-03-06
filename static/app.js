document.addEventListener("DOMContentLoaded", () => {
  const video = document.getElementById("videoInput");
  const canvas = document.getElementById("canvasOutput");
  const ctx = canvas.getContext("2d");
  const startButton = document.getElementById("startButton");
  const stopButton = document.getElementById("stopButton");
  const statusDiv = document.getElementById("status");

  let stream = null;
  let isProcessing = false;

  // Conectar ao servidor Socket.IO
  const socket = io();

  socket.on("connect", () => {
    statusDiv.textContent = "Conectado ao servidor";
  });

  socket.on("disconnect", () => {
    statusDiv.textContent = "Desconectado do servidor";
  });

  socket.on("processed_frame", (data) => {
    // Carregar a imagem processada no canvas
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      if (isProcessing) {
        requestAnimationFrame(processFrame);
      }
    };
    img.src = data;
  });

  socket.on("error", (error) => {
    console.error("Erro:", error);
    statusDiv.textContent = `Erro: ${error}`;
  });

  // Função para processar o frame atual
  function processFrame() {
    if (!isProcessing) return;

    // Desenhar o frame atual no canvas
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);

    // Converter o canvas para base64 e enviar para o servidor
    const imageData = canvas.toDataURL("image/jpeg", 0.8);
    socket.emit("process_frame", imageData);
  }

  // Iniciar a câmera
  startButton.addEventListener("click", async () => {
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
      });
      video.srcObject = stream;
      await video.play();

      isProcessing = true;
      startButton.disabled = true;
      stopButton.disabled = false;
      statusDiv.textContent = "Câmera iniciada";

      processFrame();
    } catch (err) {
      console.error("Erro ao acessar a câmera:", err);
      statusDiv.textContent = `Erro ao acessar a câmera: ${err.message}`;
    }
  });

  // Parar a câmera
  stopButton.addEventListener("click", () => {
    isProcessing = false;
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      video.srcObject = null;
    }
    startButton.disabled = false;
    stopButton.disabled = true;
    statusDiv.textContent = "Câmera parada";

    // Limpar o canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  });
});
