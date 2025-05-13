export default class Room {
    static #nextRoomId = 1;

    static get roomId() {
        const id = Room.#nextRoomId;
        Room.#nextRoomId += 1;
        return id;
    }

    #id;
    #conns = new Set();
    #maxSize;

    constructor(maxSize) {
        this.#id = Room.roomId;
        this.#maxSize = maxSize;
    }

    get size() {
        return this.#conns.size;
    }

    get full() {
        return this.#conns.size >= this.#maxSize;
    }

    get maxSize() {
        return this.#maxSize;
    }

    get id() {
        return this.#id;
    }

    get conns() {
        return this.#conns;
    }

    addConn(conn) {
        if (this.#conns.size < this.#maxSize) {
            this.#conns.add(conn);
            return null;
        } else {
            return new Error("Room is full");
        }
    }

    deleteConn(conn) {
        this.#conns.delete(conn);
    }

    getConnSessionIds() {
        const ids = new Array(this.#conns.size);
        let i = 0;
        for (const conn of this.#conns.values()) {
            ids[i] = conn.sessionId;
            i += 1;
        }
        return ids;
    }

    send(senderSessionId, receiverSessionId, type, data) {
        for (const remoteConn of this.#conns.values()) {
            if (receiverSessionId === remoteConn.sessionId) {
                remoteConn.send(type, {
                    sessionId: senderSessionId,
                    ...data
                });
                break;
            }
        }
    }

    sendToAll(type, data) {
        for (const conn of this.#conns.values()) {
            conn.send(type, data);
        }
    }
}

export class RoomManager {
    #rooms = new Map();

    createRoom(maxSize) {
        const room = new Room(maxSize);
        this.#rooms.set(room.id, room);
        return room.id;
    }

    addConn(roomId, conn) {
        const room = this.#rooms.get(roomId);
        if (!room) {
            return new Error("No room with such an id");
        }
        return room.addConn(conn);
    }

    deleteConn(roomId, conn) {
        const room = this.#rooms.get(roomId);
        if (room) {
            room.deleteConn(conn);
            if (room.size === 0) {
                this.#rooms.delete(roomId);
            }
        };
    }

    getRoomIdByMaxSize(maxSize) {
        for (const room of this.#rooms.values()) {
            if (!room.full && room.maxSize <= maxSize) {
                return room.id;
            }
        }
        return -1;
    }

    getRoom(id) {
        return this.#rooms.get(id) ?? null;
    }
}
