(function () {
  let socket;

  const Message = {
    handle: 0,

    // 메시지 보내기
    send(content, callback, timer = 1500) {
      clearTimeout(Message.handle);

      const $main = document.querySelector("main");

      document.querySelector(
        ".message"
      ).innerHTML = `<p>알림봇</p><h2>${content}</h2>`;

      $main.classList.add("open");

      Message.handle = setTimeout(() => {
        $main.classList.remove("open");

        callback && callback();
      }, timer);
    },
  };

  const Board = {
    $canvas: "",
    ctx: "",
    line: 18, // 바둑판 총 선 개수
    stoneSize: 19, // 바둑돌 크기

    // 오목 시작 세팅
    start() {
      Omok.newMake();

      Board.setPlayer();
      Board.draw();
      Board.hook();
    },

    // 플레이어 지정
    setPlayer() {
      const $message = document.querySelector(".user span");

      $message.innerHTML = ["검은돌", "흰돌"][Omok.players.indexOf(socket.id)];

      if (Board.nowTurnChk()) {
        Message.send("당신의 차례입니다!", "", 500);
      }
    },

    // 현재 자기의 턴인지 확인
    nowTurnChk() {
      return Omok.players[Omok.nowTurn - 1] === socket.id;
    },

    // 이벤트 생성
    hook() {
      const $canvas = Board.$canvas;

      // 임시의 바둑돌이 따라다님
      $canvas.onmousemove = (event) => {
        if (!Board.nowTurnChk()) {
          return;
        }

        const { offsetX, offsetY } = event;

        Board.drawMouseStone({ offsetX, offsetY });
      };

      $canvas.onclick = (event) => {
        if (!Board.nowTurnChk()) {
          return Message.send("현재 턴이 아닙니다.");
        }

        const { offsetX, offsetY } = event;

        const [xPos, yPos] = Omok.getOffsetPos({ offsetX, offsetY });

        // 바둑돌을 생성하고 승리 조건 체크
        if (Omok.makeStone({ xPos, yPos, player: Omok.nowTurn })) {
          return;
        }

        // 턴을 바꿈
        Omok.turnChange({ xPos, yPos, player: Omok.nowTurn });
      };
    },

    // 바둑판 정보
    getBoardData() {
      const [cw, ch] = [720, 720];

      const { line, stoneSize, $canvas, ctx } = Board;

      // 한칸 크기
      const rowSize = cw / line;

      return { $canvas, ctx, line, stoneSize, rowSize, cw, ch };
    },

    // 바둑판 그리기
    draw() {
      const { $canvas, ctx, line, stoneSize, rowSize, cw, ch } =
        Board.getBoardData();

      $canvas.width = cw;
      $canvas.height = ch;

      // 바둑판 배경 채우기
      ctx.fillStyle = "#dcb35c";
      ctx.clearRect(0, 0, cw, ch);

      ctx.beginPath();
      ctx.fillRect(0, 0, cw, ch);
      ctx.closePath();

      // 바둑판 선 그리기
      for (let linePos = 0; linePos <= cw; linePos += rowSize) {
        ctx.beginPath();
        // 가로선
        ctx.moveTo(linePos, 0);
        ctx.lineTo(linePos, ch);

        // 세로선
        ctx.moveTo(0, linePos);
        ctx.lineTo(cw, linePos);

        ctx.stroke();
        ctx.closePath();
      }

      // 6개 간격의 원 무늬
      ctx.fillStyle = "#000";

      for (let x = 3; x <= line; x += 6) {
        ctx.beginPath();
        for (let y = 3; y <= 15; y += 6) {
          ctx.arc(rowSize * x, rowSize * y, stoneSize / 3, 0, Math.PI * 2);
        }
        ctx.fill();
        ctx.closePath();
      }
    },

    // 바둑돌 그리기
    drawStone(tmpItem = []) {
      // 먼저 모두 지우고 다시 그리기
      Board.draw();

      const { ctx, stoneSize, rowSize } = Board.getBoardData();

      [...Omok.history, ...tmpItem].forEach(({ xPos, yPos, player }) => {
        const [x, y] = [rowSize * (xPos + 1), rowSize * (yPos + 1)];

        ctx.beginPath();
        ctx.fillStyle = ["#111", "#fff"][player - 1];
        ctx.arc(x, y, stoneSize, 0, Math.PI * 2);
        ctx.fill();
        ctx.closePath();
      });
    },

    // 마우스를 따라 다니는 임시의 바둑돌
    drawMouseStone({ offsetX, offsetY }) {
      const [xPos, yPos] = Omok.getOffsetPos({ offsetX, offsetY });

      // 이미 둔 수가 있을 시
      if (Omok.board[yPos]?.[xPos] !== 0) {
        return;
      }

      // 임시의 정보를 넣어 그려줌
      Board.drawStone([
        {
          xPos,
          yPos,
          player: Omok.players.indexOf(socket.id) + 1,
        },
      ]);
    },

    // 게임초기화
    reset() {
      Message.send("GAME RESTART.", Board.start);
    },
  };

  const Omok = {
    board: [],
    history: [],
    players: [],
    nowTurn: 1,

    // 새로 시작
    newMake() {
      const line = Board.line - 1;

      Omok.history = [];
      Omok.nowTurn = 1;

      Omok.board = Array.from(Array(line).fill(), () =>
        new Array(line).fill(0)
      );
    },

    // 위치를 바둑판 기준 index로 바꾸기
    getOffsetPos({ offsetX, offsetY }) {
      const { stoneSize, rowSize } = Board.getBoardData();

      // 정중앙이 아닌 약간의 오차 클릭 반영
      return [
        Math.floor(Math.abs(offsetX - stoneSize) / rowSize), // x
        Math.floor(Math.abs(offsetY - stoneSize) / rowSize), // y
      ];
    },

    // 새로운 바둑돌 생성
    makeStone({ xPos, yPos, player }) {
      // 이미 둔 수가 있을 시
      if (Omok.board[yPos]?.[xPos] !== 0) {
        return true;
      }

      // 가상 바둑판 배열에 저장
      Omok.board[yPos][xPos] = player;

      Omok.history.push({ xPos, yPos, player });

      Omok.winCheck({ xPos, yPos, player });

      Board.drawStone();
    },

    // 방금 돌을 놓은 턴에 게임이 끝났는지
    winCheck({ xPos, yPos, player }) {
      const dir = [
        [
          [-1, 0], // 왼쪽
          [1, 0], // 오른쪽
        ],
        [
          [0, -1], // 위쪽
          [0, 1], // 아래쪽
        ],
        [
          // 대각선
          [-1, -1], // 왼,상
          [1, 1], // 오,하
        ],
        [
          [1, -1], // 오,상
          [-1, 1], // 왼,하
        ],
      ];

      while (dir.length) {
        const nextDir = dir.shift();

        // 현재 놓은 돌을 포함한 개수
        let count = 1;

        while (nextDir.length) {
          const [dirX, dirY] = nextDir.shift();

          for (let i = 0, moveX = 0, moveY = 0; i < 4; i++) {
            moveX += dirX; // 좌우, 정해진 방향으로 이동
            moveY += dirY; // 상하, 정해진 방향으로 이동

            // 이동한 방향에 놓은 돌이 색이 아닐 시 해당 방향은 중지
            if (Omok.board[yPos + moveY]?.[xPos + moveX] !== player) {
              break;
            }

            count++;
          }
        }

        // 5개 이상의 돌이 있을 시
        if (5 <= count) {
          Omok.winDecision(player);
        }
      }
    },

    // 턴 넘기기
    turnChange(item) {
      socket.emit("turn change", {
        nowTurn: Omok.players[Omok.nowTurn - 1],
        item,
      });
    },

    // 우승 확정
    winDecision(player) {
      Message.send(
        `${
          Omok.players[player - 1] === socket.id ? "승리" : "패배"
        }하였습니다.`,
        Board.reset
      );
    },
  };

  // 특정 url 스페이스에 접속
  socket = io(location.pathname);

  socket.emit("userConnect");

  // 서버에서 소켓에 접속을 완료했을 때 신호를 보냄
  window.onload = () => {
    Board.$canvas = document.querySelector("canvas");
    Board.ctx = Board.$canvas.getContext("2d");

    // 게임 시작
    socket.on("gameStart", ({ type, players }) => {
      ({
        wait() {
          Message.send("인원이 모두 모이면 게임이 시작됩니다.");
        },

        start() {
          Omok.players = players;

          Board.draw();

          Message.send("GAME START.", Board.start);
        },

        err() {
          Message.send("현재 게임 중 방입니다.", () => (location.href = "/"));
        },
      }[type]());
    });

    // 턴 바꾸기
    socket.on("next turn", ({ nextTurn, item }) => {
      Omok.nowTurn = nextTurn;

      Board.setPlayer();

      // 상대가 놓은 수를 데이터에 저장
      Omok.makeStone({ ...item });
    });
  };
})();
