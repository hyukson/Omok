(function () {
  // 서버에서 소켓에 접속을 완료했을 때 신호를 보냄
  window.onload = () => {
    // 특정 url 스페이스에 접속
    const socket = io("/");

    socket.on("pageMove", ({ code }) => {
      location.href = code;
    });

    socket.emit("newUser");
  };
})();
