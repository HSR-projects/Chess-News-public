const boardEl = document.getElementById("board");
const movesBox = document.getElementById("moves");
const gamesListEl = document.getElementById("gamesList");
const newGameBtn = document.getElementById("newGameBtn");
const chess = new Chess();
let ws;
let currentGameId = null;

// Create chessboard
function createBoard() {
  boardEl.innerHTML = "";
  for (let r = 8; r >= 1; r--) {
    for (let c = 1; c <= 8; c++) {
      const file = "abcdefgh"[c - 1];
      const square = file + r;
      const sq = document.createElement("div");
      sq.className = "square " + ((r + c) % 2 ? "black" : "white");
      sq.dataset.square = square;
      boardEl.appendChild(sq);
    }
  }
}

// Render pieces
function renderPieces() {
  document.querySelectorAll(".square").forEach(sq => sq.innerHTML = "");
  chess.board().forEach((row, rIndex) => {
    row.forEach((p, cIndex) => {
      if (!p) return;
      const file = "abcdefgh"[cIndex];
      const rank = 8 - rIndex;
      const square = file + rank;
      const sqEl = document.querySelector(`[data-square='${square}']`);
      const div = document.createElement("div");
      div.className = "piece";
      div.textContent = p.type.toUpperCase();
      div.draggable = true;

      div.addEventListener("dragstart", e => {
        e.dataTransfer.setData("text/plain", square);
      });

      sqEl.appendChild(div);
    });
  });
}

// Drag & Drop moves
function enableDrop() {
  boardEl.querySelectorAll(".square").forEach(sq => {
    sq.addEventListener("dragover", e => e.preventDefault());
    sq.addEventListener("drop", e => {
      e.preventDefault();
      const from = e.dataTransfer.getData("text/plain");
      const to = sq.dataset.square;

      const move = chess.move({ from, to, promotion: "q" });
      if (move && currentGameId) {
        ws.send(JSON.stringify({ type: "move", id: currentGameId, move: move.san }));
        renderPieces();
        movesBox.textContent = chess.pgn();
      }
    });
  });
}

// WebSocket connection
function connectWS() {
  ws = new WebSocket(`ws://${window.location.host}`);

  ws.onopen = () => console.log("Connected to server");

  ws.onmessage = event => {
    const msg = JSON.parse(event.data);

    if (msg.type === "gamesList") {
      gamesListEl.innerHTML = "";
      msg.games.forEach(g => {
        const li = document.createElement("li");
        li.textContent = `Game ${g.id} - ${g.moves} moves`;
        li.style.cursor = "pointer";
        li.onclick = () => joinGame(g.id);
        gamesListEl.appendChild(li);
      });
    }

    if (msg.type === "update" && msg.id === currentGameId) {
      chess.reset();
      msg.moves.forEach(m => chess.move(m, { sloppy: true }));
      movesBox.textContent = chess.pgn();
      renderPieces();
    }

    if (msg.type === "gameCreated") {
      joinGame(msg.id);
    }
  };
}

// Join a game
function joinGame(id) {
  currentGameId = id;
  ws.send(JSON.stringify({ type: "join", id }));
}

// Create new game button
newGameBtn.onclick = () => ws.send(JSON.stringify({ type: "create" }));

// Initialize
createBoard();
renderPieces();
enableDrop();
connectWS();
