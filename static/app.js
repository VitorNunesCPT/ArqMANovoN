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
  });

  socket.on("connect", () => {
    statusDiv.textContent = "Conectado ao servidor";
    startButton.disabled = false;
  });

  socket.on("disconnect", () => {
    statusDiv.textContent = "Desconectado do servidor. Tentando reconectar...";
    startButton.disabled = true;
  });

  socket.on("processed_frame", (data) => {
    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      isWaitingResponse = false;
      if (isProcessing) {
        requestAnimationFrame(processFrame);
      }
    };
    img.src = data;
  });

  socket.on("error", (error) => {
    console.error("Erro:", error);
    statusDiv.textContent = `Erro: ${error}`;
    isWaitingResponse = false;
  });

  function processFrame() {
    if (!isProcessing || isWaitingResponse) return;

    if (
      canvas.width !== video.videoWidth ||
      canvas.height !== video.videoHeight
    ) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    }

    try {
      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = video.videoWidth;
      tempCanvas.height = video.videoHeight;
      const tempCtx = tempCanvas.getContext("2d");
      tempCtx.drawImage(video, 0, 0);

      const imageData = tempCanvas.toDataURL("image/jpeg", 0.8);
      socket.emit("process_frame", imageData);
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
      return await navigator.mediaDevices.getUserMedia(constraints);
    } catch (err) {
      console.log("Erro com configuração:", constraints, err);
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

      // Tentar diferentes configurações de câmera
      let mediaStream;
      try {
        // Primeira tentativa: câmera traseira em dispositivos móveis
        mediaStream = await tryGetUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 640 },
            height: { ideal: 480 },
          },
        });
      } catch (err1) {
        try {
          // Segunda tentativa: qualquer câmera disponível
          mediaStream = await tryGetUserMedia({
            video: true,
          });
        } catch (err2) {
          throw new Error(
            "Não foi possível acessar a câmera. Por favor, verifique as permissões do navegador e tente novamente."
          );
        }
      }

      stream = mediaStream;
      video.srcObject = stream;
      await video.play();

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
