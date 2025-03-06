# Arquitetura Maranhense - Detecção em Tempo Real

Este projeto utiliza um modelo YOLO pré-treinado para detectar elementos arquitetônicos do Centro Histórico de São Luís do Maranhão em tempo real, através de uma aplicação web com Flask e Socket.IO.

## Funcionalidades

- Detecção em tempo real de elementos arquitetônicos através da câmera
- Visualização de detecções com caixas delimitadoras
- Listagem de elementos detectados com contagem e confiança
- Mapa interativo do Centro Histórico com marcadores para elementos arquitetônicos
- Filtragem de elementos no mapa por categoria
- Estatísticas de detecções

## Elementos Detectados

O modelo YOLO foi treinado para detectar os seguintes elementos:

- Postes coloniais
- Grades ornamentais coloniais
- Ruas de pedra coloniais
- Portas de arquitetura colonial
- Igreja da Sé
- Janelas coloniais

## Requisitos

- Python 3.8+
- Flask
- Flask-SocketIO
- OpenCV
- NumPy
- Ultralytics (YOLO)
- Navegador moderno com suporte a WebRTC

## Instalação

1. Clone o repositório:

```
git clone https://github.com/seu-usuario/arquitetura-maranhense.git
cd arquitetura-maranhense
```

2. Instale as dependências:

```
pip install -r requirements.txt
```

3. Execute a aplicação:

```
python app.py
```

4. Acesse a aplicação no navegador:

```
http://localhost:5000
```

## Estrutura do Projeto

```
arquitetura-maranhense/
├── app.py                  # Aplicação Flask principal
├── requirements.txt        # Dependências do projeto
├── weights/                # Modelos YOLO treinados
│   └── best.pt             # Modelo principal
├── rotulo.txt              # Rótulos para as classes detectadas
├── static/                 # Arquivos estáticos
│   ├── css/
│   │   └── style.css       # Estilos da aplicação
│   └── js/
│       ├── main.js         # JavaScript da página principal
│       └── mapa.js         # JavaScript da página do mapa
└── templates/              # Templates HTML
    ├── index.html          # Página principal
    └── mapa.html           # Página do mapa
```

## Rotas da API

- **/** - Página principal com detecção em tempo real
- **/mapa** - Visualização do mapa do Centro Histórico
- **/api/deteccoes** - API para gerenciar detecções (GET, POST)
- **/api/estatisticas** - API para obter estatísticas gerais (GET)
- **/api/locais** - API para gerenciar locais (GET, POST, PUT, DELETE)

## Eventos Socket.IO

- **connect** - Conexão estabelecida com o servidor
- **disconnect** - Conexão encerrada com o servidor
- **start_detection** - Iniciar detecção de objetos
- **stop_detection** - Parar detecção de objetos
- **video_frame** - Enviar frame de vídeo para processamento
- **processed_frame** - Receber frame processado com detecções
- **status** - Receber atualizações de status
- **error** - Receber mensagens de erro

## Contribuição

Contribuições são bem-vindas! Sinta-se à vontade para abrir issues ou enviar pull requests.

## Licença

Este projeto está licenciado sob a licença MIT.
