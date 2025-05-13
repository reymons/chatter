# Chatter
A proof-of-concept project to showcase how WebRTC API
can be used to create a basic video conference web application.<br>
NOT adapted for mobile devices.

## How to run
- `npm install`
- `npm start` or `node server/main.js -h [host] -p [port]`

## Peer pool
The implementation of the pool is in `client/static/vendor/rtc.js`<br><br>
Here's a simple video conference app. Receive remote media streams, manage peer life cycle, toggle your microphone and camera.
```
const roomId = "some-id";
const rtc = WebRTC();
const signalingServer = new SignalingServer(roomId); // Your implementation
const peers = new Map();
const micBtn = document.getElementById("mic-btn");
const cameraBtn = document.getElementById("camera-btn");

signalingServer.on("session", sessionIds => {
    sessionIds.forEach(id => rtc.makeOffer(id));
});
signalingServer.on("offer", data => rtc.acceptOffer(data.sessionId, data.offer));
signalingServer.on("answer", data => rtc.acceptAnswer(data.sessionId, data.answer));
signalingServer.on("candidate", data => rtc.addCandidate(data.sessionId, data.candidateInfo));
signalingServer.on("disconnect", data => rtc.removePeer(data.sessionId));

// You can assign each listener with rtc.even.on or use rtc.event.map
rtc.event.map({
    peerconnected: ({ peerId }) => {
        peers.set(peerId, createPeerElements());
    },
    peerdisconnected: ({ peerId }) => {
        removePeerElements(peers.get(peerId));
        peers.delete(peerId);
    },
    mediastream: ({ peerId, stream }) => {
        const peer = peers.get(peerId);
        peer.video.srcObject = stream;
    },
    trackstatechanged: ({ peerId, kind, enabled }) => {
        if (peerId === WebRTC.SelfId) {
            if (kind === WebRTC.Track.Audio) {
                micBtn.classList.toggle("enabled", enabled);
            } else {
                cameraBtn.classList.toggle("enabled", enabled);
            }
            return;
        }
    
        const peer = peers.get(peerId);
        if (kind === WebRTC.Track.Audio) {
            peer.micBtn.classList.toggle("enabled", enabled);
        } else {
            peer.cameraBtn.classList.toggle("enabled", enabled);
        }
    }
});

micBtn.onclick = () => {
    if (rtc.localAudioEnabled) rtc.disableLocalAudio();
    else rtc.enableLocalAudio();
};
cameraBtn.onclick = () => {
    if (rtc.localVideoEnabled) rtc.disableLocalVideo();
    else rtc.enableLocalVideo();
};
```

## Links
- https://hpbn.co/webrtc
- https://sookocheff.com/post/networking/how-does-web-rtc-work
