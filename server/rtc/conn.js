export default class Conn {
    static #getSessionId() {
        return crypto.randomUUID().substring(0, 8);
    }

    sessionId;
    socket;
    #req;

    constructor(socket, req) {
        this.sessionId = Conn.#getSessionId(); 
        this.socket = socket;
        this.#req = req;
    }

    get params() {
        return this.#req.params;
    }

    send(type, data) {
        this.socket.send(JSON.stringify({
            type,
            sessionId: this.sessionId,
            data 
        }));
    }

    sendError(message) {
        this.send(ConnMessage.Error, { message });
    }

    close(code = 1011) {
        this.socket.close(code);
    }
}

export const ConnMessage = Object.freeze({
    Error: "error",
    Answer: "answer",
    Offer: "offer",
    Candidate: "candidate",
    Session: "session",
    SessionClosed: "session-closed"
});
