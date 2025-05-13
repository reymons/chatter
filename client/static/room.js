(async function () {
    const WsMessage = {
        Error: "error",
        Offer: "offer",
        Answer: "answer",
        Candidate: "candidate",
        Session: "session",
        SessionClosed: "session-closed"
    };

    const elem = {
        videos: document.getElementById("videos"),
        mic: document.querySelector(".mic"),
        camera: document.querySelector(".camera"),
        chatBtn: document.getElementById("chat-btn"),
    };
    const videos = {};

    const roomId = /^\/room\/(.+)$/.exec(location.pathname).at(1) ?? "";
    const socket = new WebSocket(`wss://${location.host}/api/room/${roomId}`);
    const rtc = WebRTC();

    const sendData = (socket, type, data) => {
        socket.send(JSON.stringify({ type, data }));
    };

    rtc.event.map({
        [WebRTC.Event.Error]: error => {
            alert(error.message);
        },
        [WebRTC.Event.Offer]: data => {
            sendData(socket, WsMessage.Offer, {
                sessionId: data.peerId,
                offer: data.offer,
            });
        },
        [WebRTC.Event.Answer]: data => {
            sendData(socket, WsMessage.Answer, {
                sessionId: data.peerId,
                answer: data.answer,
            });
        },
        [WebRTC.Event.Candidate]: data => {
            sendData(socket, WsMessage.Candidate, {
                sessionId: data.peerId,
                candidateInfo: data.candidateInfo
            });
        },
        [WebRTC.Event.PeerConnected]: ({ peerId }) => {
            const wrapper = document.createElement("div");
            const video = document.createElement("video");
            video.setAttribute("width", "100%");
            video.setAttribute("height", "100%");
            video.autoplay = true;
            wrapper.classList.add("content__video-wrapper");
            wrapper.appendChild(video);
            elem.videos.appendChild(wrapper);
            videos[peerId] = video;
        },
        [WebRTC.Event.PeerDisconnected]: ({ peerId }) => {
            const video = videos[peerId]; 
            video?.parentElement?.remove();
            delete videos[peerId];
        },
        [WebRTC.Event.MediaStream]: ({ peerId, stream }) => {
            const video = videos[peerId];
            if (video) {
                video.srcObject = stream;
            }
        },
        [WebRTC.Event.Message]: ({ peerId, data }) => {
            console.dir({ peerId, data });
        }
    });

    socket.onmessage = e => {
        const { type, sessionId, data } = JSON.parse(e.data);

        switch (type) {
            case WsMessage.Session:
                data.remoteSessionIds.forEach(remoteSessionId => {
                    if (remoteSessionId !== sessionId) {
                        rtc.makeOffer(remoteSessionId);
                    }
                });
                break;
            case WsMessage.Offer:
                rtc.acceptOffer(data.sessionId, data.offer);
                break;
            case WsMessage.Answer:
                rtc.acceptAnswer(data.sessionId, data.answer);
                break;
            case WsMessage.Candidate:
                rtc.addCandidate(data.sessionId, data.candidateInfo);
                break;
            case WsMessage.SessionClosed:
                rtc.removePeer(data.sessionId);
                break;
        }
    };

    elem.chatBtn.onclick = () => {
        document
            .querySelector(".content__right")
            .classList.toggle("content__right--open");
    };
    elem.mic.onclick = () => {
        if (rtc.localAudioEnabled) {
            rtc.disableLocalAudio();
        } else {
            rtc.enableLocalAudio();
        }
    };
    elem.camera.onclick = () => {
        if (rtc.localVideoEnabled) {
            rtc.disableLocalVideo();
        } else {
            rtc.enableLocalVideo();
        }
    };
    rtc.event.on(WebRTC.Event.TrackStateChanged, data => {
        const { peerId, kind, enabled } = data;

        if (kind === WebRTC.Track.Audio) {
            if (peerId === WebRTC.SelfId) {
                elem.mic.classList.toggle("mic--disabled", !enabled);
            }
            return;
        }
        if (kind === WebRTC.Track.Video) {
            if (peerId === WebRTC.SelfId) {
                elem.camera.classList.toggle("camera--disabled", !enabled);
            } else {
                const video = videos[peerId];
                video.style.visibility = enabled ? "visible" : "hidden";
            }
            return;
        }
    });

    document.getElementById("message-form").onsubmit = e => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        const text = data.get("text");
        if (text !== null) {
            rtc.sendToAll(text);
        }
    };
})();
