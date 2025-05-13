import wsPlugin from "@fastify/websocket";
import { isObject } from "../util.js";
import Conn, { ConnMessage } from "./conn.js";
import { RoomManager } from "./room.js";
import IdManager from "./id.js";

function deserializeMessage(msg) {
    try {
        const d = JSON.parse(msg.toString("utf8"));
        if (typeof d.type === "string" && isObject(d.data)) {
            return d;
        };
        return null;
    } catch {
        return null;
    }
}

function onOfferMessage(conn, msg, ctx) {
    const { sessionId, offer } = msg.data;

    if (typeof sessionId !== "string") {
        conn.sendError("sessionId should be a valid UUID");
        return;
    }
    if (!isObject(offer) || typeof offer.sdp !== "string") {
        conn.sendError("invalid offer");
        return;
    }
    if (conn.sessionId === sessionId) {
        conn.sendError("You can't send messages to yourself, what the hell man?!");
        return;
    }

    const room = ctx.roomManager.getRoom(ctx.roomId);
    room.send(conn.sessionId, sessionId, ConnMessage.Offer, { offer });
}

function onAnswerMessage(conn, msg, ctx) {
    const { sessionId, answer } = msg.data;

    if (typeof sessionId !== "string") {
        conn.sendError("sessionId should be a valid UUID");
        return;
    }
    if (!isObject(answer) || typeof answer.sdp !== "string") {
        conn.sendError("invalid answer");
        return;
    }
    if (conn.sessionId === sessionId) {
        conn.sendError("you can't send messages to yourself, what the hell man?!");
        return;
    }

    const room = ctx.roomManager.getRoom(ctx.roomId);
    room.send(conn.sessionId, sessionId, ConnMessage.Answer, { answer });
}

function onCandidateMessage(conn, msg, ctx) {
    const { sessionId, candidateInfo } = msg.data;

    if (typeof sessionId !== "string") {
        conn.sendError("sessionId should be a valid UUID");
        return;
    }
    if (!isObject(candidateInfo)) {
        conn.sendError("invalid candidate");
        return;
    }
    if (conn.sessionId === sessionId) {
        conn.sendError("you can't send messages to yourself, what the hell man?!");
        return;
    }

    const room = ctx.roomManager.getRoom(ctx.roomId);
    room.send(conn.sessionId, sessionId, ConnMessage.Candidate, { candidateInfo });
}

function onMessage(conn, msg, ctx) {
    const data = deserializeMessage(msg);
    if (data === null) {
        conn.sendError("Invalid message structure");
        return;
    }
    switch (data.type) {
        case ConnMessage.Offer:
            onOfferMessage(conn, data, ctx);
            break;
        case ConnMessage.Answer:
            onAnswerMessage(conn, data, ctx);
            break;
        case ConnMessage.Candidate:
            onCandidateMessage(conn, data, ctx);
            break;
    }
}

function onConnection(conn, ctx) {
    if (typeof conn.params.roomIdHash !== "string") {
        conn.sendError("Invalid room id hash");
        conn.close();
        return;
    }

    const roomId = ctx.idManager.id(conn.params.roomIdHash);
    const err = ctx.roomManager.addConn(roomId, conn);
    if (err !== null) {
        conn.sendError(err.message);
        conn.close();
        return;
    }
    ctx.roomId = roomId;

    const room = ctx.roomManager.getRoom(roomId);
    conn.send(ConnMessage.Session, {
        remoteSessionIds: room.getConnSessionIds(),
    });

    conn.socket.on("close", () => {
        ctx.roomManager.deleteConn(roomId, conn);
        room.sendToAll(ConnMessage.SessionClosed, {
            sessionId: conn.sessionId
        });
    });

    conn.socket.on("message", msg => {
        onMessage(conn, msg, ctx);
    });
}

function validateJoinRoomBody(body) {
    if (typeof body !== "object" || body === null) {
        return new Error("Invalid body");
    }
    if (typeof body.maxRoomSize !== "number") {
        return new Error("maxRoomSize should be a number");
    }
    if (body.maxRoomSize <= 0 || body.maxRoomSize > 10) {
        return new Error("maxRoomSize should be in range [1, 10]");
    }
    return null;
}

export default function registerSignalingServer(server) {
    const roomManager = new RoomManager();
    const idManager = new IdManager();
    const ctx = {
        roomManager,
        idManager,
    };

    server.register(wsPlugin);

    server.register((server) => {
        server.get("/room/:roomIdHash", { websocket: true }, (socket, req) => {
            const conn = new Conn(socket, req);
            onConnection(conn, ctx);
        });
    });

    server.post("/room/join", (req, rep) => {
        const err = validateJoinRoomBody(req.body);
        if (err !== null) {
            rep.code(400).send({ message: err.message });
            return;
        }
        const maxRoomSize = req.body.maxRoomSize;
        let roomId = roomManager.getRoomIdByMaxSize(maxRoomSize);
        if (roomId === -1) {
            roomId = roomManager.createRoom(maxRoomSize);
        }
        const roomIdHash = idManager.hash(roomId);
        rep.code(201).send({
            room: { id: roomIdHash }
        });
    });
}

