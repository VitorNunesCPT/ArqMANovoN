// Coordenadas do Centro Histórico de São Luís
const centroHistoricoCoords = [-2.5296, -44.3068];

// Inicializar o mapa
let map = L.map("map").setView(centroHistoricoCoords, 16);

// Adicionar camada de mapa base (OpenStreetMap)
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  maxZoom: 19,
}).addTo(map);

// Dados fictícios de elementos arquitetônicos (em uma aplicação real, esses dados viriam da API)
const elementosArquitetonicos = [
  {
    id: 1,
    tipo: "poste colonial",
    coordenadas: [-2.529, -44.3065],
    descricao: "Poste colonial em ferro fundido",
    imagem: "https://via.placeholder.com/150?text=Poste+Colonial",
  },
  {
    id: 2,
    tipo: "grade ornamental colonial",
    coordenadas: [-2.5295, -44.307],
    descricao: "Grade ornamental em ferro forjado",
    imagem: "https://via.placeholder.com/150?text=Grade+Ornamental",
  },
  {
    id: 3,
    tipo: "rua de pedra colonial",
    coordenadas: [-2.53, -44.306],
    descricao: "Rua de pedras portuguesas",
    imagem: "https://via.placeholder.com/150?text=Rua+de+Pedra",
  },
  {
    id: 4,
    tipo: "porta arquitetura colonial",
    coordenadas: [-2.5292, -44.3075],
    descricao: "Porta em madeira entalhada",
    imagem: "https://via.placeholder.com/150?text=Porta+Colonial",
  },
  {
    id: 5,
    tipo: "igreja da se",
    coordenadas: [-2.5285, -44.3068],
    descricao: "Igreja da Sé, construída no século XVII",
    imagem: "https://via.placeholder.com/150?text=Igreja+da+Se",
  },
  {
    id: 6,
    tipo: "janela colonial",
    coordenadas: [-2.5298, -44.3072],
    descricao: "Janela com balcão em ferro fundido",
    imagem: "https://via.placeholder.com/150?text=Janela+Colonial",
  },
];

// Ícones personalizados para cada tipo de elemento
const icones = {
  "poste colonial": L.icon({
    iconUrl:
      "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
  }),
  "grade ornamental colonial": L.icon({
    iconUrl:
      "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
  }),
  "rua de pedra colonial": L.icon({
    iconUrl:
      "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
  }),
  "porta arquitetura colonial": L.icon({
    iconUrl:
      "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-gold.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
  }),
  "igreja da se": L.icon({
    iconUrl:
      "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-violet.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
  }),
  "janela colonial": L.icon({
    iconUrl:
      "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-orange.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
  }),
};

// Grupos de marcadores para cada tipo de elemento
const gruposMarcadores = {
  "poste colonial": L.layerGroup(),
  "grade ornamental colonial": L.layerGroup(),
  "rua de pedra colonial": L.layerGroup(),
  "porta arquitetura colonial": L.layerGroup(),
  "igreja da se": L.layerGroup(),
  "janela colonial": L.layerGroup(),
};

// Adicionar marcadores ao mapa
elementosArquitetonicos.forEach((elemento) => {
  const marcador = L.marker(elemento.coordenadas, {
    icon: icones[elemento.tipo],
  });

  // Criar popup com informações do elemento
  const popupContent = `
        <div class="marker-popup">
            <img src="${elemento.imagem}" alt="${elemento.tipo}">
            <h5>${elemento.tipo}</h5>
            <p>${elemento.descricao}</p>
        </div>
    `;

  marcador.bindPopup(popupContent);

  // Adicionar ao grupo correspondente
  gruposMarcadores[elemento.tipo].addLayer(marcador);
});

// Adicionar todos os grupos ao mapa
Object.values(gruposMarcadores).forEach((grupo) => {
  grupo.addTo(map);
});

// Filtrar elementos no mapa
document.querySelectorAll(".list-group-item").forEach((item) => {
  item.addEventListener("click", function () {
    // Remover classe 'active' de todos os itens
    document.querySelectorAll(".list-group-item").forEach((i) => {
      i.classList.remove("active");
    });

    // Adicionar classe 'active' ao item clicado
    this.classList.add("active");

    const filtro = this.getAttribute("data-filter");

    // Remover todos os grupos do mapa
    Object.values(gruposMarcadores).forEach((grupo) => {
      map.removeLayer(grupo);
    });

    // Se o filtro for 'todos', adicionar todos os grupos
    if (filtro === "todos") {
      Object.values(gruposMarcadores).forEach((grupo) => {
        grupo.addTo(map);
      });
    } else {
      // Caso contrário, adicionar apenas o grupo correspondente
      gruposMarcadores[filtro].addTo(map);
    }
  });
});

// Carregar estatísticas
async function carregarEstatisticas() {
  try {
    const response = await fetch("/api/estatisticas");
    const data = await response.json();

    // Em uma aplicação real, você usaria os dados da API
    // Por enquanto, vamos usar dados fictícios

    const estatisticasHTML = `
            <div class="row">
                <div class="col-md-6">
                    <h5>Total de Detecções</h5>
                    <p class="h3 text-primary">42</p>
                </div>
                <div class="col-md-6">
                    <h5>Elementos Únicos</h5>
                    <p class="h3 text-success">6</p>
                </div>
            </div>
            <hr>
            <h5>Distribuição por Categoria</h5>
            <div class="progress mb-3" style="height: 25px;">
                <div class="progress-bar bg-primary" role="progressbar" style="width: 25%;" aria-valuenow="25" aria-valuemin="0" aria-valuemax="100">Postes (25%)</div>
                <div class="progress-bar bg-success" role="progressbar" style="width: 15%;" aria-valuenow="15" aria-valuemin="0" aria-valuemax="100">Grades (15%)</div>
                <div class="progress-bar bg-danger" role="progressbar" style="width: 20%;" aria-valuenow="20" aria-valuemin="0" aria-valuemax="100">Ruas (20%)</div>
                <div class="progress-bar bg-warning" role="progressbar" style="width: 15%;" aria-valuenow="15" aria-valuemin="0" aria-valuemax="100">Portas (15%)</div>
                <div class="progress-bar bg-info" role="progressbar" style="width: 10%;" aria-valuenow="10" aria-valuemin="0" aria-valuemax="100">Igreja (10%)</div>
                <div class="progress-bar bg-dark" role="progressbar" style="width: 15%;" aria-valuenow="15" aria-valuemin="0" aria-valuemax="100">Janelas (15%)</div>
            </div>
        `;

    document.getElementById("estatisticas").innerHTML = estatisticasHTML;
  } catch (error) {
    console.error("Erro ao carregar estatísticas:", error);
    document.getElementById("estatisticas").innerHTML =
      '<p class="text-danger">Erro ao carregar estatísticas</p>';
  }
}

// Carregar estatísticas ao iniciar a página
document.addEventListener("DOMContentLoaded", () => {
  carregarEstatisticas();
});
