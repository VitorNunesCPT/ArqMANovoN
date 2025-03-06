document.addEventListener("DOMContentLoaded", () => {
  const video = document.getElementById("videoInput");
  const canvas = document.getElementById("canvasOutput");
  const ctx = canvas.getContext("2d");
  const startButton = document.getElementById("startButton");
  const stopButton = document.getElementById("stopButton");
  const statusDiv = document.getElementById("status");

  let stream = null;
  let isProcessing = false;
  let isWaitingResponse = false;
  let frameCount = 0;
  let lastFrameTime = Date.now();

  // Verificar suporte à câmera
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    statusDiv.textContent =
      "Seu navegador não suporta acesso à câmera. Por favor, use um navegador mais recente como Chrome ou Firefox.";
    startButton.disabled = true;
    return;
  }

  // Conectar ao servidor Socket.IO com reconexão automática
  const socket = io({
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    transports: ["websocket", "polling"],
  });

  socket.on("connect", () => {
    console.log("Socket conectado:", socket.id);
    statusDiv.textContent = "Conectado ao servidor";
    startButton.disabled = false;
  });

  socket.on("disconnect", () => {
    console.log("Socket desconectado");
    statusDiv.textContent = "Desconectado do servidor. Tentando reconectar...";
    startButton.disabled = true;
  });

  socket.on("processed_frame", (data) => {
    console.log("Frame processado recebido");
    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      isWaitingResponse = false;

      // Calcular FPS
      frameCount++;
      const now = Date.now();
      if (now - lastFrameTime >= 1000) {
        console.log(`FPS: ${frameCount}`);
        frameCount = 0;
        lastFrameTime = now;
      }

      if (isProcessing) {
        requestAnimationFrame(processFrame);
      }
    };
    img.src = data;
  });

  socket.on("error", (error) => {
    console.error("Erro no socket:", error);
    statusDiv.textContent = `Erro: ${error}`;
    isWaitingResponse = false;
  });

  function processFrame() {
    if (!isProcessing || isWaitingResponse) return;

    try {
      // Redimensionar o canvas para um tamanho menor
      const targetWidth = 640;
      const targetHeight = 480;

      if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
        canvas.width = targetWidth;
        canvas.height = targetHeight;
      }

      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = targetWidth;
      tempCanvas.height = targetHeight;
      const tempCtx = tempCanvas.getContext("2d");

      // Desenhar o vídeo redimensionado
      tempCtx.drawImage(video, 0, 0, targetWidth, targetHeight);

      // Comprimir mais a imagem
      const imageData = tempCanvas.toDataURL("image/jpeg", 0.6);
      console.log(
        "Enviando frame, tamanho:",
        Math.round(imageData.length / 1024),
        "KB"
      );

      socket.emit("process_frame", imageData, (error) => {
        if (error) {
          console.error("Erro ao enviar frame:", error);
          statusDiv.textContent = `Erro ao enviar frame: ${error}`;
        } else {
          console.log("Frame enviado com sucesso");
        }
      });

      isWaitingResponse = true;
    } catch (err) {
      console.error("Erro ao processar frame:", err);
      statusDiv.textContent = `Erro ao processar frame: ${err.message}`;
      isWaitingResponse = false;
    }
  }

  // Função para tentar diferentes configurações de câmera
  async function tryGetUserMedia(constraints) {
    try {
      console.log("Tentando obter mídia com constraints:", constraints);
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log("Mídia obtida com sucesso");
      return stream;
    } catch (err) {
      console.log("Erro ao obter mídia:", err);
      throw err;
    }
  }

  // Iniciar a câmera
  startButton.addEventListener("click", async () => {
    try {
      if (location.protocol !== "https:" && location.hostname !== "localhost") {
        throw new Error("Para acessar a câmera, use HTTPS ou localhost");
      }

      statusDiv.textContent = "Solicitando permissão para acessar a câmera...";

      let mediaStream;
      try {
        // Primeira tentativa: câmera traseira com resolução menor
        mediaStream = await tryGetUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 640 },
            height: { ideal: 480 },
            frameRate: { ideal: 15 },
          },
        });
      } catch (err1) {
        console.log(
          "Primeira tentativa falhou, tentando configuração mais simples"
        );
        try {
          mediaStream = await tryGetUserMedia({
            video: {
              width: { ideal: 640 },
              height: { ideal: 480 },
              frameRate: { ideal: 15 },
            },
          });
        } catch (err2) {
          console.log("Segunda tentativa falhou, tentando configuração básica");
          mediaStream = await tryGetUserMedia({ video: true });
        }
      }

      stream = mediaStream;
      video.srcObject = stream;
      await video.play();

      console.log(
        "Câmera iniciada com resolução:",
        video.videoWidth,
        "x",
        video.videoHeight
      );

      isProcessing = true;
      isWaitingResponse = false;
      startButton.disabled = true;
      stopButton.disabled = false;
      statusDiv.textContent = "Câmera iniciada";

      processFrame();
    } catch (err) {
      console.error("Erro ao acessar a câmera:", err);
      let mensagemErro = "Erro ao acessar a câmera. ";

      if (
        err.name === "NotAllowedError" ||
        err.name === "PermissionDeniedError"
      ) {
        mensagemErro +=
          "Você precisa permitir o acesso à câmera nas configurações do seu navegador. Em dispositivos móveis, tente: Configurações > Site > Câmera > Permitir";
      } else if (err.name === "NotFoundError") {
        mensagemErro += "Nenhuma câmera encontrada no dispositivo.";
      } else if (err.name === "NotReadableError") {
        mensagemErro += "A câmera pode estar sendo usada por outro aplicativo.";
      } else {
        mensagemErro += err.message;
      }

      statusDiv.textContent = mensagemErro;
    }
  });

  stopButton.addEventListener("click", () => {
    isProcessing = false;
    isWaitingResponse = false;
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      video.srcObject = null;
    }
    startButton.disabled = false;
    stopButton.disabled = true;
    statusDiv.textContent = "Câmera parada";
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  });
});
