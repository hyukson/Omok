const express = require("express");

const socketIo = require("socket.io");

const http = require("http");

const fs = require("fs");

const app = express();
const server = http.createServer(app);

const io = socketIo(server);

// 파일 경로 연결
app.use("/public", express.static("./public"));

// 메인페이지에 접속하면  안내함
app.get("/", (req, res) => {
  // 해당 파일을 읽기
  fs.readFile("./index.html", (err, data) => {
    if (err) {
      return res.send("에러");
    }

    res.writeHead(200, { "Content-Type": "text/html" });
    res.write(data);
    res.end();
  });
});

// 오목 게임 페이지
app.get("/:id", (req, res) => {
  // 해당 파일을 읽기
  fs.readFile("./omok.html", (err, data) => {
    if (err) {
      return res.send("에러");
    }

    res.writeHead(200, { "Content-Type": "text/html" });
    res.write(data);
    res.end();
  });
});

// 또 다른 페이지 접속
const workspaces = io.of(/^\/\w+$/);

workspaces.on("connection", (socket) => {
  const workspace = socket.nsp;

  // 게임 시작 인원 체크
  socket.on("userConnect", () => {
    // socket에 실시간으로 반영됨
    const nowRoom = socket.adapter.rooms;

    const type = ["wait", "start", "err"][nowRoom?.size - 1];

    // 인원이 다참
    if (type === "err") {
      return socket.emit("gameStart", { type });
    }

    const players = [...workspace.sockets.keys()];

    workspace.emit("gameStart", { type, players });
  });

  // 턴 넘기기
  socket.on("turn change", ({ nowTurn, item }) => {
    const players = [...workspace.sockets.keys()];

    // 현재 턴의 다른 사람
    const nextTurn = players[0] === nowTurn ? 2 : 1;

    workspaces.emit("next turn", { nextTurn, item });
  });
});

// 메인페이지
io.on("connection", (socket) => {
  // 새로운 유저가 메인페이지에 접속하면 새로운 게임판 주소 할당
  socket.on("newUser", () => {
    const nsps = [...io._nsps.keys()];

    nsps.shift();

    // 혼자 있는 이미 만들어진 방 찾기
    const nextCode = nsps.find((nsp) => io._nsps.get(nsp).sockets.size === 1);

    // 랜덤의 고유값 할당
    const code = nextCode || `/${new Date().getTime().toString(36)}`;

    // 서버 생성
    io.of(code);

    socket.emit("pageMove", { code });
  });
});

server.listen(3000);
