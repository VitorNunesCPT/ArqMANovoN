// Elementos do DOM
const videoElement = document.getElementById("videoElement");
const canvasElement = document.getElementById("canvasElement");
const startButton = document.getElementById("startButton");
const stopButton = document.getElementById("stopButton");
const statusMessage = document.getElementById("statusMessage");
const detectionsList = document.getElementById("detectionsList");
const loadingIndicator = document.getElementById("loadingIndicator");
const showBoxesSwitch = document.getElementById("showBoxesSwitch");

// Configuração do canvas
const ctx = canvasElement.getContext("2d");
let stream = null;
let isDetecting = false;
let socket = null;
let lastDetections = [];

// Inicializar Socket.IO
function initSocket() {
  // Conectar ao servidor Socket.IO
  socket = io();

  // Evento de conexão
  socket.on("connect", () => {
    updateStatus("Conectado ao servidor", "success");
  });

  // Evento de desconexão
  socket.on("disconnect", () => {
    updateStatus("Desconectado do servidor", "danger");
    stopDetection();
  });

  // Evento de status
  socket.on("status", (data) => {
    updateStatus(data.status, "info");
  });

  // Evento de erro
  socket.on("error", (data) => {
    updateStatus(`Erro: ${data.message}`, "danger");
  });

  // Evento de frame processado
  socket.on("processed_frame", (data) => {
    handleProcessedFrame(data);
  });
}

// Inicializar a câmera
async function initCamera() {
  try {
    // Solicitar acesso à câmera
    stream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        facingMode: "environment", // Usar câmera traseira em dispositivos móveis
      },
      audio: false,
    });

    // Configurar o elemento de vídeo
    videoElement.srcObject = stream;

    // Ajustar o tamanho do canvas para corresponder ao vídeo
    videoElement.onloadedmetadata = () => {
      canvasElement.width = videoElement.videoWidth;
      canvasElement.height = videoElement.videoHeight;
    };

    updateStatus("Câmera inicializada", "success");
    startButton.disabled = false;
  } catch (error) {
    updateStatus(`Erro ao acessar a câmera: ${error.message}`, "danger");
  }
}

// Iniciar detecção
function startDetection() {
  if (!socket || !stream) {
    updateStatus("Não foi possível iniciar a detecção", "danger");
    return;
  }

  isDetecting = true;
  startButton.disabled = true;
  stopButton.disabled = false;

  // Informar ao servidor que a detecção foi iniciada
  socket.emit("start_detection");

  // Iniciar o loop de captura de frames
  captureFrame();
}

// Parar detecção
function stopDetection() {
  isDetecting = false;
  startButton.disabled = false;
  stopButton.disabled = true;

  // Limpar o canvas
  ctx.clearRect(0, 0, canvasElement.width, canvasElement.height);

  // Limpar a lista de detecções
  updateDetectionsList([]);

  // Informar ao servidor que a detecção foi parada
  if (socket && socket.connected) {
    socket.emit("stop_detection");
  }
}

// Capturar frame da câmera
function captureFrame() {
  if (!isDetecting) return;

  // Mostrar indicador de carregamento
  loadingIndicator.classList.remove("d-none");

  // Desenhar o frame atual no canvas
  ctx.drawImage(videoElement, 0, 0, canvasElement.width, canvasElement.height);

  // Converter o canvas para base64
  const imageData = canvasElement.toDataURL("image/jpeg", 0.8);

  // Enviar o frame para o servidor
  socket.emit("video_frame", { image: imageData });

  // Agendar a próxima captura (limitando a taxa para não sobrecarregar)
  setTimeout(captureFrame, 100);
}

// Processar frame recebido do servidor
function handleProcessedFrame(data) {
  // Ocultar indicador de carregamento
  loadingIndicator.classList.add("d-none");

  // Atualizar a lista de detecções
  updateDetectionsList(data.detections);

  // Se a opção de mostrar caixas estiver desativada, não desenhar a imagem processada
  if (!showBoxesSwitch.checked) {
    return;
  }

  // Carregar a imagem processada
  const img = new Image();
  img.onload = () => {
    // Limpar o canvas
    ctx.clearRect(0, 0, canvasElement.width, canvasElement.height);

    // Desenhar a imagem processada
    ctx.drawImage(img, 0, 0, canvasElement.width, canvasElement.height);
  };
  img.src = data.image;
}

// Atualizar a lista de detecções
function updateDetectionsList(detections) {
  lastDetections = detections;

  if (detections.length === 0) {
    detectionsList.innerHTML =
      '<li class="list-group-item text-center">Nenhum elemento detectado</li>';
    return;
  }

  // Agrupar detecções por tipo
  const groupedDetections = {};
  detections.forEach((detection) => {
    if (!groupedDetections[detection.label]) {
      groupedDetections[detection.label] = [];
    }
    groupedDetections[detection.label].push(detection);
  });

  // Criar a lista HTML
  let html = "";
  for (const [label, items] of Object.entries(groupedDetections)) {
    const count = items.length;
    const maxConf = Math.max(...items.map((item) => item.confidence));

    html += `
            <li class="list-group-item detection-item">
                <span class="detection-label">${label}</span>
                <div>
                    <span class="badge bg-secondary">${count}</span>
                    <span class="detection-confidence">${maxConf}%</span>
                </div>
            </li>
        `;
  }

  detectionsList.innerHTML = html;
}

// Atualizar mensagem de status
function updateStatus(message, type = "info") {
  statusMessage.className = `alert alert-${type}`;
  statusMessage.textContent = message;
}

// Event listeners
document.addEventListener("DOMContentLoaded", () => {
  // Inicializar Socket.IO
  initSocket();

  // Inicializar câmera
  initCamera();

  // Botão de iniciar detecção
  startButton.addEventListener("click", startDetection);

  // Botão de parar detecção
  stopButton.addEventListener("click", stopDetection);

  // Switch para mostrar/ocultar caixas delimitadoras
  showBoxesSwitch.addEventListener("change", () => {
    if (!showBoxesSwitch.checked) {
      // Limpar o canvas
      ctx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    }
  });
});
